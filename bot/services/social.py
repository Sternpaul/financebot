import aiohttp
import feedparser
import logging
from typing import List, Dict, Any
from datetime import datetime
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

logger = logging.getLogger(__name__)

class SocialScraperService:
    """
    Service for scraping social media feeds via RSSHub and analyzing sentiment.
    """
    def __init__(self, rsshub_url: str):
        self.rsshub_url = rsshub_url.rstrip("/")
        self.analyzer = SentimentIntensityAnalyzer()

    async def fetch_twitter_feed(self, handle: str) -> List[Dict[str, Any]]:
        """
        Fetch the Twitter feed for a specific handle using RSSHub.
        """
        # RSSHub route for Twitter user is /twitter/user/:id
        url = f"{self.rsshub_url}/twitter/user/{handle}"
        
        async with aiohttp.ClientSession() as session:
            try:
                async with session.get(url) as resp:
                    if resp.status == 200:
                        content = await resp.text()
                        # parse the RSS feed XML
                        feed = feedparser.parse(content)
                        posts = []
                        for entry in feed.entries:
                            # Calculate VADER sentiment on the tweet text
                            text_content = getattr(entry, "title", getattr(entry, "summary", ""))
                            
                            # Extremely simple tag stripping for cleaner sentiment analysis
                            clean_text = text_content.replace("<br>", "\n").replace("</br>", "")
                            
                            sentiment_dict = self.analyzer.polarity_scores(clean_text)
                            compound_score = sentiment_dict.get('compound', 0.0)
                            
                            posts.append({
                                "source": "twitter",
                                "author_handle": handle,
                                "author_name": feed.feed.get("title", handle),
                                "content": text_content,
                                "url": getattr(entry, "link", ""),
                                "posted_at": getattr(entry, "published", datetime.utcnow().isoformat()),
                                "sentiment": compound_score
                            })
                        return posts
                    else:
                        logger.error(f"RSSHub error for {handle}: {resp.status} - {await resp.text()}")
            except Exception as e:
                logger.error(f"Exception fetching feed for {handle}: {e}")
        return []

    def get_sentiment(self, text: str) -> float:
        """Utility to get just the compound sentiment score."""
        return self.analyzer.polarity_scores(text).get('compound', 0.0)
