import logging
import json
import asyncio
from datetime import datetime, timedelta, timezone
from sqlalchemy import select, delete, update, func

from bot.db.database import AsyncSessionLocal
from bot.db.models import NewsArticle, MarketKnowledge, Transaction
from bot.services.ai import compress_with_scaledown, generate_completion
from bot.services.news import log_ingestion
from bot.config import get_worker_config

logger = logging.getLogger(__name__)

async def run_brain_synthesis():
    """
    Background job that periodically scans new NewsArticle rows,
    compresses them, asks the AI to extract market knowledge,
    and stores it in the MarketKnowledge table.
    """
    logger.info("Starting Brain Synthesis cycle...")
    
    try:
        async with AsyncSessionLocal() as session:
            # Find unprocessed news articles
            result = await session.execute(
                select(NewsArticle).where(NewsArticle.is_synthesized == False)
            )
            recent_news = result.scalars().all()
            
            if not recent_news:
                logger.info("No new articles to synthesize.")
                await log_ingestion('ai_brain', 'synthesis', 'NO_NEW_DATA', 'No new articles to synthesize in the last hour.')
                return

            # Group by mentioned tickers
            ticker_news = {}
            macro_news = []

            for article in recent_news:
                if article.tickers_mentioned:
                    for ticker in article.tickers_mentioned:
                        if ticker not in ticker_news:
                            ticker_news[ticker] = []
                        ticker_news[ticker].append(article)
                else:
                    macro_news.append(article)

            synthesized_count = 0
            total_tokens_used = 0
            
            # Helper to format bundled text with Telegram priority
            def bundle_articles(articles):
                telegram = [a for a in articles if a.source_platform == 'telegram']
                news = [a for a in articles if a.source_platform != 'telegram']
                
                bundled = ""
                if telegram:
                    bundled += "[HIGH PRIORITY TELEGRAM ALERTS]\n"
                    bundled += "\n\n".join([f"[{a.source_handle}]: {a.content}" for a in telegram]) + "\n\n"
                if news:
                    bundled += "[SECONDARY NEWS CONTEXT]\n"
                    bundled += "\n\n".join([f"[{a.source_platform}]: {a.title}\n{a.content}" for a in news])
                    
                return bundled

            # Synthesize Ticker-Specific Knowledge
            for ticker, articles in ticker_news.items():
                if len(articles) == 0:
                    continue
                    
                combined_text = bundle_articles(articles)
                prompt_instruction = f"Extract key insights, sentiment shifts, risks, and catalysts for ticker ${ticker} from the following recent news. Focus heavily on telegram alerts. Return a short, punchy summary."
                
                # Compress with ScaleDown
                compressed_prompt = await compress_with_scaledown(combined_text, prompt_instruction)
                
                response = await generate_completion(compressed_prompt, "You are a sharp financial analyst AI. Extract concise factual knowledge. DO NOT use markdown formatting (no bold, italics, or bullet points). Output plain text ONLY.")
                
                if response and response.get('content'):
                    knowledge = MarketKnowledge(
                        ticker=ticker,
                        knowledge_type='catalyst_sentiment',
                        content=response['content'],
                        source_article_ids=[a.id for a in articles]
                    )
                    session.add(knowledge)
                    await session.commit()
                    logger.info(f"Synthesized knowledge for {ticker}")
                    synthesized_count += 1
                    total_tokens_used += response.get('usage', {}).get('total_tokens', 0)
                    
            # Synthesize Macro Knowledge
            if macro_news:
                combined_text = bundle_articles(macro_news[:50]) # Limit to 50
                prompt_instruction = f"Extract key macroeconomic insights and market-wide catalysts from the following recent news. Focus heavily on telegram alerts. Return a short, punchy summary."
                compressed_prompt = await compress_with_scaledown(combined_text, prompt_instruction)
                
                response = await generate_completion(compressed_prompt, "You are a sharp macro-economic analyst AI. Extract concise factual knowledge. DO NOT use markdown formatting (no bold, italics, or bullet points). Output plain text ONLY.")
                
                if response and response.get('content'):
                    knowledge = MarketKnowledge(
                        ticker=None,
                        knowledge_type='macro',
                        content=response['content'],
                        source_article_ids=[a.id for a in macro_news[:50]]
                    )
                    session.add(knowledge)
                    await session.commit()
                    logger.info("Synthesized macro knowledge")
                    synthesized_count += 1
                    total_tokens_used += response.get('usage', {}).get('total_tokens', 0)

            # Brain Size Tracking
            res = await session.execute(select(func.sum(func.length(MarketKnowledge.content))).where(MarketKnowledge.is_archived == False))
            total_chars = res.scalar() or 0
            est_tokens = total_chars // 4

            if synthesized_count > 0:
                msg = f"Synthesized {synthesized_count} items from {len(recent_news)} articles. Used {total_tokens_used} tokens. Active Brain Size: {est_tokens} tokens."
                await log_ingestion('ai_brain', 'synthesis', 'SUCCESS', msg)
            else:
                await log_ingestion('ai_brain', 'synthesis', 'ERROR', f'Failed to synthesize any knowledge. Active Brain Size: {est_tokens} tokens.')

            # Mark as synthesized to prevent duplicates on restart
            for article in recent_news:
                article.is_synthesized = True
            await session.commit()

        logger.info("Brain Synthesis cycle completed.")
    except Exception as e:
        logger.error(f"Brain synthesis failed with exception: {e}", exc_info=True)

async def run_daily_compaction():
    """
    Runs every 24 hours to deeply bundle and compress all recent granular knowledge
    into a single Master Summary, and then archives the granular rows into long-term memory.
    """
    logger.info("Starting Daily Brain Compaction...")
    
    async with AsyncSessionLocal() as session:
        # Fetch active (unarchived) knowledge from the past 24 hours, plus existing master summaries
        cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
        
        # Group by Ticker
        result = await session.execute(select(MarketKnowledge.ticker).where(MarketKnowledge.is_archived == False).distinct())
        tickers = [r for r in result.scalars().all()]
        
        total_tokens_used = 0
        
        for ticker in tickers:
            stmt = select(MarketKnowledge).where(MarketKnowledge.ticker == ticker, MarketKnowledge.is_archived == False)
            res = await session.execute(stmt)
            knowledge_items = res.scalars().all()
            
            if len(knowledge_items) <= 1:
                continue # No need to compact if it's already a single master summary
                
            combined_text = "\n\n".join([f"- {k.content}" for k in knowledge_items])
            prompt_instruction = f"You are compressing the AI Brain's memory for {ticker if ticker else 'Macro Market'}. Create a dense, highly informative Master Summary of the following accumulated facts. Discard noise, retain critical insights, trends, and catalysts."
            
            compressed_prompt = await compress_with_scaledown(combined_text, prompt_instruction)
            response = await generate_completion(compressed_prompt, "You are an elite hedge fund knowledge manager. Create a dense Master Summary. DO NOT use markdown formatting (no bold, italics, or bullet points). Output plain text ONLY.")
            
            if response and response.get('content'):
                # Archive the old items
                for k in knowledge_items:
                    k.is_archived = True
                    
                # Create the new Master Summary
                master = MarketKnowledge(
                    ticker=ticker,
                    knowledge_type='master_summary',
                    content=response['content'],
                    source_article_ids=[],
                    is_archived=False
                )
                session.add(master)
                await session.commit()
                
                total_tokens_used += response.get('usage', {}).get('total_tokens', 0)
                logger.info(f"Compacted knowledge for {ticker if ticker else 'Macro'}")
                
        # Brain Size Tracking
        res = await session.execute(select(func.sum(func.length(MarketKnowledge.content))).where(MarketKnowledge.is_archived == False))
        total_chars = res.scalar() or 0
        est_tokens = total_chars // 4
        
        await log_ingestion('ai_brain', 'daily_compaction', 'SUCCESS', f"Compacted Brain state. Used {total_tokens_used} tokens. New Active Brain Size: {est_tokens} tokens.")
        logger.info("Daily Brain Compaction completed.")

async def generate_morning_report():
    """
    Generates the daily morning report based on portfolio state and market knowledge.
    Sends it via Discord Webhook or Bot integration.
    """
    logger.info("Generating Morning Report...")
    
    async with AsyncSessionLocal() as session:
        # Get active portfolio tickers
        stmt = select(Transaction.ticker, Transaction.shares, Transaction.price_per_share).where(Transaction.ticker.is_not(None))
        result = await session.execute(stmt)
        transactions = result.all()
        
        portfolio = {}
        for ticker, shares, price in transactions:
            if ticker not in portfolio:
                portfolio[ticker] = {'shares': 0, 'cost_basis': 0}
            portfolio[ticker]['shares'] += shares
            portfolio[ticker]['cost_basis'] += shares * price
            
        active_tickers = [t for t, data in portfolio.items() if data['shares'] > 0]
        
        if not active_tickers:
            logger.info("No active portfolio. Skipping morning report.")
            return
            
        # Get active knowledge for these tickers
        ticker_knowledge = []
        for ticker in active_tickers:
            stmt = select(MarketKnowledge).where(MarketKnowledge.ticker == ticker, MarketKnowledge.is_archived == False).order_by(MarketKnowledge.created_at.desc())
            res = await session.execute(stmt)
            # Apply token cap: iteratively append until ~8000 tokens (32k chars)
            current_chars = 0
            for k in res.scalars().all():
                if current_chars + len(k.content) > 15000: # 15k limit per ticker just in case
                    break
                ticker_knowledge.append(f"[{ticker}]: {k.content}")
                current_chars += len(k.content)
                
        # Get recent macro knowledge
        stmt = select(MarketKnowledge).where(MarketKnowledge.ticker.is_(None), MarketKnowledge.is_archived == False).order_by(MarketKnowledge.created_at.desc())
        res = await session.execute(stmt)
        macro_knowledge = []
        current_chars = 0
        for k in res.scalars().all():
            if current_chars + len(k.content) > 15000:
                break
            macro_knowledge.append(k.content)
            current_chars += len(k.content)
        
        # Build prompt
        portfolio_str = ", ".join(active_tickers)
        knowledge_str = "\n".join(ticker_knowledge)
        macro_str = "\n".join(macro_knowledge)
        
        prompt = f"""Generate a Morning Briefing for a trader holding the following portfolio: {portfolio_str}.

Macro Events / Market Sentiment:
{macro_str if macro_str else 'No major macro news.'}

Specific Ticker Updates:
{knowledge_str if knowledge_str else 'No specific updates for portfolio holdings.'}

Format the response as a beautiful Markdown report with:
1. Market Overview (What to expect today)
2. Portfolio Impact (How news affects their specific holdings)
3. Actionable Advice (What to watch out for)
"""
        
        response = await generate_completion(prompt, "You are an elite hedge fund manager giving a morning briefing to your team.")
        
        if response and response.get('content'):
            report = response['content']
            logger.info(f"Morning report generated successfully. Tokens used: {response.get('usage', {}).get('total_tokens', 0)}")
            import redis.asyncio as redis
            from bot.config import get_worker_config
            r = redis.Redis.from_url(get_worker_config().redis_url)
            await r.xadd("reports", {"title": "🌅 Morning Briefing", "content": report})
            await r.aclose()
        else:
            logger.error("Failed to generate morning report.")
