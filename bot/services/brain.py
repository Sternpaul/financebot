import logging
import json
import asyncio
from datetime import datetime, timedelta, timezone
from sqlalchemy import select, delete

from bot.db.database import AsyncSessionLocal
from bot.db.models import NewsArticle, MarketKnowledge, Transaction
from bot.services.ai import compress_with_scaledown, generate_completion
from bot.config import get_worker_config

logger = logging.getLogger(__name__)
config = get_worker_config()

async def run_brain_synthesis():
    """
    Background job that periodically scans new NewsArticle rows,
    compresses them, asks the AI to extract market knowledge,
    and stores it in the MarketKnowledge table.
    """
    logger.info("Starting Brain Synthesis cycle...")
    
    async with AsyncSessionLocal() as session:
        # Prune old knowledge (> 14 days)
        cutoff_knowledge = datetime.now(timezone.utc) - timedelta(days=14)
        await session.execute(delete(MarketKnowledge).where(MarketKnowledge.created_at < cutoff_knowledge))
        await session.commit()

        # Find unprocessed news articles (we'll just use a naive approach: 
        # get articles from the last 1 hour, grouped by ticker/platform to form a cohesive summary)
        cutoff_news = datetime.now(timezone.utc) - timedelta(hours=1)
        result = await session.execute(
            select(NewsArticle).where(NewsArticle.posted_at >= cutoff_news)
        )
        recent_news = result.scalars().all()
        
        if not recent_news:
            logger.info("No new articles to synthesize.")
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

        # Synthesize Ticker-Specific Knowledge
        for ticker, articles in ticker_news.items():
            if len(articles) == 0:
                continue
                
            combined_text = "\n\n".join([f"[{a.source_platform} - {a.author_name}]: {a.title}\n{a.content}" for a in articles])
            
            # Compress with ScaleDown
            compressed_text = await compress_with_scaledown(combined_text)
            
            prompt = f"Extract key insights, sentiment shifts, risks, and catalysts for ticker ${ticker} from the following recent news. Return a short, punchy summary.\n\nNews:\n{compressed_text}"
            
            summary = await generate_completion(prompt, "You are a sharp financial analyst AI. Extract concise factual knowledge.")
            
            if summary:
                knowledge = MarketKnowledge(
                    ticker=ticker,
                    knowledge_type='catalyst_sentiment',
                    content=summary,
                    source_article_ids=[a.id for a in articles]
                )
                session.add(knowledge)
                await session.commit()
                logger.info(f"Synthesized knowledge for {ticker}")
                
        # Synthesize Macro Knowledge
        if macro_news:
            combined_text = "\n\n".join([f"[{a.source_platform} - {a.author_name}]: {a.title}\n{a.content}" for a in macro_news[:50]]) # Limit to 50
            compressed_text = await compress_with_scaledown(combined_text)
            
            prompt = f"Extract key macroeconomic insights and market-wide catalysts from the following recent news. Return a short, punchy summary.\n\nNews:\n{compressed_text}"
            summary = await generate_completion(prompt, "You are a sharp macro-economic analyst AI. Extract concise factual knowledge.")
            
            if summary:
                knowledge = MarketKnowledge(
                    ticker=None,
                    knowledge_type='macro',
                    content=summary,
                    source_article_ids=[a.id for a in macro_news[:50]]
                )
                session.add(knowledge)
                await session.commit()
                logger.info("Synthesized macro knowledge")

    logger.info("Brain Synthesis cycle completed.")

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
            portfolio[ticker]['cost_basis'] += shares * price # Simplified cost basis
            
        active_tickers = [t for t, data in portfolio.items() if data['shares'] > 0]
        
        if not active_tickers:
            logger.info("No active portfolio. Skipping morning report.")
            return
            
        # Get recent knowledge for these tickers
        cutoff = datetime.now(timezone.utc) - timedelta(days=1)
        
        ticker_knowledge = []
        for ticker in active_tickers:
            stmt = select(MarketKnowledge).where(MarketKnowledge.ticker == ticker, MarketKnowledge.created_at >= cutoff)
            res = await session.execute(stmt)
            for k in res.scalars().all():
                ticker_knowledge.append(f"[{ticker}]: {k.content}")
                
        # Get recent macro knowledge
        stmt = select(MarketKnowledge).where(MarketKnowledge.ticker.is_(None), MarketKnowledge.created_at >= cutoff)
        res = await session.execute(stmt)
        macro_knowledge = [k.content for k in res.scalars().all()]
        
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
        
        report = await generate_completion(prompt, "You are an elite hedge fund manager giving a morning briefing to your team.")
        
        if report:
            logger.info("Morning report generated successfully.")
            import redis.asyncio as redis
            from bot.config import get_worker_config
            r = redis.Redis.from_url(get_worker_config().redis_url)
            await r.xadd("reports", {"title": "🌅 Morning Briefing", "content": report})
            await r.aclose()
        else:
            logger.error("Failed to generate morning report.")
