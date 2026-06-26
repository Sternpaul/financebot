import logging
import json
import asyncio
from datetime import datetime, timezone
from time import mktime
from sqlalchemy import select

import feedparser

from bot.db.database import AsyncSessionLocal
from bot.db.models import PodcastEpisode, PodcastTrade, ContentSource, IngestionLog, PodcastTranscript
from bot.services.ai import compress_with_scaledown, generate_completion

logger = logging.getLogger(__name__)

async def fetch_rss_episodes(channel_id: str):
    """Fetch recent videos from YouTube RSS feed"""
    url = f"https://www.youtube.com/feeds/videos.xml?channel_id={channel_id}"
    
    # Run feedparser in a thread since it's blocking
    def fetch():
        return feedparser.parse(url)
        
    feed = await asyncio.to_thread(fetch)
    episodes = []
    
    for entry in feed.entries:
        video_id = entry.yt_videoid
        title = entry.title
        published_parsed = entry.published_parsed
        published_at = datetime.fromtimestamp(mktime(published_parsed), tz=timezone.utc)
        
        episodes.append({
            "title": title,
            "video_id": video_id,
            "published_at": published_at
        })
        
    return episodes

async def get_transcript(video_id: str) -> str | None:
    """Fetch the auto-generated YouTube transcript using yt-dlp via subprocess"""
    import os
    import re
    
    # We use cookies.txt explicitly
    cookies_path = "cookies.txt"
    if not os.path.exists(cookies_path):
        logger.warning("cookies.txt not found. yt-dlp might fail.")
    
    output_vtt = f"{video_id}.en.vtt"
    
    # Remove any old vtt
    if os.path.exists(output_vtt):
        os.remove(output_vtt)
        
    cmd = [
        "python", "-m", "yt_dlp",
        "--cookies", cookies_path,
        "--impersonate", "chrome",
        "--remote-components", "ejs:github",
        "--skip-download",
        "--write-auto-sub",
        "--sub-lang", "en",
        "-o", f"{video_id}.%(ext)s",
        f"https://www.youtube.com/watch?v={video_id}"
    ]
    
    logger.info(f"Running yt-dlp for {video_id}...")
    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE
    )
    
    stdout, stderr = await process.communicate()
    out = stdout.decode('utf-8', errors='replace')
    err = stderr.decode('utf-8', errors='replace')
    
    if process.returncode != 0:
        logger.error(f"yt-dlp failed for {video_id}:\n{err}")
        # Detect rate limiting
        if "HTTP Error 429" in err or "HTTP Error 429" in out or "IpBlocked" in err:
            raise Exception("HTTP_429")
        return None
        
    if not os.path.exists(output_vtt):
        logger.error(f"Subtitle file {output_vtt} was not created. Output:\n{out}")
        return None
        
    try:
        with open(output_vtt, 'r', encoding='utf-8') as f:
            vtt_content = f.read()
            
        # Parse VTT to pure text
        lines = []
        for line in vtt_content.split('\n'):
            line = line.strip()
            # Skip WebVTT header, empty lines, timestamps, and metadata
            if not line or line.startswith('WEBVTT') or line.startswith('Kind:') or line.startswith('Language:') or '-->' in line or line.startswith('Style:') or line.startswith('align:'):
                continue
            # Basic cleanup of formatting tags like <c> or <i>
            line = re.sub(r'<[^>]+>', '', line)
            if line:
                lines.append(line.replace('\xa0', ' '))
                
        return " ".join(lines)
        
    except Exception as e:
        logger.error(f"Failed to read/parse {output_vtt}: {e}")
        return None
    finally:
        if os.path.exists(output_vtt):
            os.remove(output_vtt)

async def extract_trades(transcript: str) -> list[dict]:
    """Pass transcript to LLM to extract structured trade ideas"""
    
    prompt_instruction = """
    Analyze this podcast transcript and extract specific, actionable trade ideas mentioned by the speakers.
    Output EXACTLY a valid JSON array of objects. Do not output conversational filler or markdown other than the JSON block.
    Each object MUST have these exact keys:
    - "ticker": The stock ticker or asset symbol (e.g., "AAPL", "TLT", "BTC", "SP500").
    - "trade_type": Must be "LONG", "SHORT", or "NEUTRAL".
    - "thesis": A 1-2 sentence summary of why this trade was suggested.
    - "speaker": The name of the speaker who suggested it (if identifiable), otherwise null.
    - "quote": A direct, verbatim quote from the transcript supporting the thesis.
    
    If no trades are mentioned, output an empty array: []
    """
    
    system_prompt = "You are an elite financial analyst. Return ONLY a valid JSON array. Absolutely no conversational filler."
    
    # If transcript is too long, we might need to compress it or chunk it. 
    # For now, let's compress it with scaledown if needed, or just send directly.
    compressed_prompt = await compress_with_scaledown(transcript, prompt_instruction)
    
    response = await generate_completion(compressed_prompt, system_prompt)
    
    if not response or not response.get('content'):
        return []
        
    content = response['content'].strip()
    import re
    json_match = re.search(r'```(?:json)?\s*(\[.*?\])\s*```', content, re.DOTALL)
    if json_match:
        content = json_match.group(1)
        
    try:
        trades = json.loads(content)
        if isinstance(trades, list):
            return trades
        return []
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse trades JSON: {e}. Output was: {content}")
        return []

async def sync_podcasts():
    """Main pipeline job: Check for new episodes, get transcripts, extract trades"""
    logger.info("Starting podcast sync...")
    
    try:
        async with AsyncSessionLocal() as session:
            # Get target channels dynamically from the DB
            stmt = select(ContentSource).where(
                ContentSource.platform == 'youtube_podcast',
                ContentSource.is_active == True
            )
            result = await session.execute(stmt)
            target_channels = result.scalars().all()
            
            if not target_channels:
                logger.info("No active YouTube podcast channels found in database.")
                return

            for channel in target_channels:
                show_name = channel.display_name or channel.handle
                channel_id = channel.handle
                
                logger.info(f"Checking RSS for {show_name}...")
                episodes = await fetch_rss_episodes(channel_id)
                
                for ep_data in episodes:
                    video_id = ep_data["video_id"]
                    
                    # Check if we already processed this video
                    stmt = select(PodcastEpisode).where(PodcastEpisode.video_id == video_id)
                    res = await session.execute(stmt)
                    existing_ep = res.scalar_one_or_none()
                    
                    if existing_ep:
                        continue # Already in DB
                        
                    logger.info(f"Found new episode: {ep_data['title']} ({video_id})")
                    
                    # 1. Create episode record
                    new_ep = PodcastEpisode(
                        show_name=show_name,
                        title=ep_data["title"],
                        video_id=video_id,
                        published_at=ep_data["published_at"],
                        is_processed=False
                    )
                    session.add(new_ep)
                    await session.commit()
                    
                    logger.info(f"Added {video_id} to database. Waiting for local worker to process transcript.")
                    
    except Exception as e:
        logger.error(f"Podcast sync failed: {e}", exc_info=True)
        # Log failure
        async with AsyncSessionLocal() as session:
            session.add(IngestionLog(
                source_platform="youtube_podcast",
                source_handle="sync_podcasts",
                status="ERROR",
                message=f"Podcast sync failed: {str(e)}"
            ))
            await session.commit()
