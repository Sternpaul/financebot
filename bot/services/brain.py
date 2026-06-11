import logging
import json
import asyncio
from datetime import datetime, timedelta, timezone
from sqlalchemy import select, delete, update, func

from bot.db.database import AsyncSessionLocal
from bot.db.models import NewsArticle, MarketKnowledge, Transaction, Watchlist
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

            # Build JSON Batching Prompt
            bundled_sections = []
            article_mappings = {} # Keep track of article IDs for each ticker
            
            for ticker, articles in ticker_news.items():
                if len(articles) > 0:
                    text = bundle_articles(articles)
                    bundled_sections.append(f"[TICKER: {ticker}]\n{text}")
                    article_mappings[ticker] = [a.id for a in articles]
                    
            if macro_news:
                text = bundle_articles(macro_news[:50])
                bundled_sections.append(f"[MACRO]\n{text}")
                article_mappings["MACRO"] = [a.id for a in macro_news[:50]]
                
            if bundled_sections:
                combined_text = "\n\n---\n\n".join(bundled_sections)
                prompt_instruction = "Extract key insights, sentiment shifts, risks, and catalysts for each ticker mentioned below, and for the macro market. Focus heavily on telegram alerts. Output EXACTLY a valid JSON dictionary mapping the ticker symbol (or 'MACRO') to a short, punchy summary plain text string. Do NOT output any conversational filler. Example: {\"AAPL\": \"summary...\", \"MACRO\": \"summary...\"}"
                
                # Compress with ScaleDown
                compressed_prompt = await compress_with_scaledown(combined_text, prompt_instruction)
                system_prompt = "You are a sharp financial analyst AI. Return ONLY a valid JSON dictionary mapping tickers to summaries. Absolutely no conversational filler or markdown other than the JSON block itself."
                
                response = await generate_completion(compressed_prompt, system_prompt)
                
                if response and response.get('content'):
                    content = response['content'].strip()
                    import re
                    json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', content, re.DOTALL)
                    if json_match:
                        content = json_match.group(1)
                    
                    try:
                        parsed_json = json.loads(content)
                        
                        for key, summary in parsed_json.items():
                            if not isinstance(summary, str) or not summary.strip():
                                continue
                                
                            is_macro = (key.upper() == "MACRO")
                            ticker = None if is_macro else key
                            article_ids = article_mappings.get(key, [])
                            
                            knowledge = MarketKnowledge(
                                ticker=ticker,
                                knowledge_type='macro' if is_macro else 'catalyst_sentiment',
                                content=summary.strip(),
                                source_article_ids=article_ids
                            )
                            session.add(knowledge)
                            synthesized_count += 1
                            
                        # Mark corresponding articles as synthesized
                        for a in recent_news:
                            if a.id in [aid for ids in article_mappings.values() for aid in ids]:
                                a.is_synthesized = True
                                
                        await session.commit()
                        total_tokens_used += response.get('usage', {}).get('total_tokens', 0)
                        logger.info(f"Batched synthesis complete. Parsed keys: {list(parsed_json.keys())}")
                        
                    except json.JSONDecodeError as e:
                        logger.error(f"Failed to parse LLM JSON output in brain synthesis: {e}. Output was: {content}")

            # Brain Size Tracking
            res = await session.execute(select(func.sum(func.length(MarketKnowledge.content))).where(MarketKnowledge.is_archived == False))
            total_chars = res.scalar() or 0
            est_tokens = total_chars // 4

            if synthesized_count > 0:
                msg = f"Synthesized {synthesized_count} items from {len(recent_news)} articles. Used {total_tokens_used} tokens. Active Brain Size: {est_tokens} tokens."
                await log_ingestion('ai_brain', 'synthesis', 'SUCCESS', msg)
            else:
                await log_ingestion('ai_brain', 'synthesis', 'ERROR', f'Failed to synthesize any knowledge. Active Brain Size: {est_tokens} tokens.')


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
        
        bundled_sections = []
        knowledge_mappings = {} # Dict of ticker -> list of MarketKnowledge objects
        
        for ticker in tickers:
            stmt = select(MarketKnowledge).where(MarketKnowledge.ticker == ticker, MarketKnowledge.is_archived == False)
            res = await session.execute(stmt)
            knowledge_items = res.scalars().all()
            
            if len(knowledge_items) <= 1:
                continue # No need to compact if it's already a single master summary
                
            combined_text = "\n".join([f"- {k.content}" for k in knowledge_items])
            key = ticker if ticker else "MACRO"
            bundled_sections.append(f"[{'TICKER: ' + ticker if ticker else 'MACRO'}]\n{combined_text}")
            knowledge_mappings[key] = knowledge_items
            
        if bundled_sections:
            combined_text = "\n\n---\n\n".join(bundled_sections)
            prompt_instruction = "You are compressing the AI Brain's memory for multiple tickers and the macro market. Create a dense, highly informative Master Summary of the facts for EACH section provided below. Discard noise, retain critical insights, trends, and catalysts. Output EXACTLY a valid JSON dictionary mapping the ticker symbol (or 'MACRO') to its Master Summary string. Do NOT output any conversational filler. Example: {\"AAPL\": \"summary...\", \"MACRO\": \"summary...\"}"
            
            compressed_prompt = await compress_with_scaledown(combined_text, prompt_instruction)
            system_prompt = "You are an elite hedge fund knowledge manager. Return ONLY a valid JSON dictionary. Absolutely no conversational filler or markdown other than the JSON block itself."
            
            response = await generate_completion(compressed_prompt, system_prompt)
            
            if response and response.get('content'):
                content = response['content'].strip()
                import re
                json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', content, re.DOTALL)
                if json_match:
                    content = json_match.group(1)
                
                try:
                    import json
                    parsed_json = json.loads(content)
                    
                    for key, summary in parsed_json.items():
                        if not isinstance(summary, str) or not summary.strip():
                            continue
                            
                        is_macro = (key.upper() == "MACRO")
                        ticker = None if is_macro else key
                        
                        if key in knowledge_mappings:
                            old_items = knowledge_mappings[key]
                            for k in old_items:
                                k.is_archived = True
                                
                            master = MarketKnowledge(
                                ticker=ticker,
                                knowledge_type='master_summary',
                                content=summary.strip(),
                                source_article_ids=[],
                                is_archived=False
                            )
                            session.add(master)
                            
                    await session.commit()
                    total_tokens_used += response.get('usage', {}).get('total_tokens', 0)
                    logger.info(f"Batched compaction complete. Parsed keys: {list(parsed_json.keys())}")
                    
                except json.JSONDecodeError as e:
                    logger.error(f"Failed to parse LLM JSON output in daily compaction: {e}. Output was: {content}")
        
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
        stmt = select(Transaction.ticker, Transaction.shares, Transaction.price_per_share, Transaction.type).where(Transaction.ticker.is_not(None)).order_by(Transaction.date.asc())
        result = await session.execute(stmt)
        transactions = result.all()
        
        portfolio = {}
        for ticker, shares, price, t_type in transactions:
            if t_type == 'BUY':
                if ticker not in portfolio:
                    portfolio[ticker] = {'shares': 0, 'cost_basis': 0}
                portfolio[ticker]['shares'] += shares or 0
                portfolio[ticker]['cost_basis'] += (shares or 0) * (price or 0)
            elif t_type == 'SELL':
                if ticker in portfolio:
                    avg_cost = portfolio[ticker]['cost_basis'] / portfolio[ticker]['shares'] if portfolio[ticker]['shares'] > 0 else 0
                    portfolio[ticker]['shares'] -= shares or 0
                    portfolio[ticker]['cost_basis'] -= (shares or 0) * avg_cost
                    if portfolio[ticker]['shares'] <= 0:
                        del portfolio[ticker]
            
        active_tickers = list(portfolio.keys())
        
        if not active_tickers:
            logger.info("No active portfolio. Skipping morning report.")
            return
            
        # Get active knowledge for these tickers
        ticker_knowledge = []
        tickers_with_news = set()
        for ticker in active_tickers:
            stmt = select(MarketKnowledge).where(MarketKnowledge.ticker == ticker, MarketKnowledge.is_archived == False).order_by(MarketKnowledge.created_at.desc())
            res = await session.execute(stmt)
            # Apply token cap: iteratively append until ~8000 tokens (32k chars)
            current_chars = 0
            has_news = False
            for k in res.scalars().all():
                if current_chars + len(k.content) > 15000: # 15k limit per ticker just in case
                    break
                ticker_knowledge.append(f"[{ticker}]: {k.content}")
                current_chars += len(k.content)
                has_news = True
            if has_news:
                tickers_with_news.add(ticker)
                
        # Fetch Watchlist Tickers
        stmt = select(Watchlist.ticker).where(Watchlist.alert_news == True)
        res = await session.execute(stmt)
        watchlist_tickers = res.scalars().all()
        
        watchlist_knowledge = []
        watchlist_with_news = set()
        for ticker in watchlist_tickers:
            # Skip if already in portfolio
            if ticker in active_tickers:
                continue
            stmt = select(MarketKnowledge).where(MarketKnowledge.ticker == ticker, MarketKnowledge.is_archived == False).order_by(MarketKnowledge.created_at.desc())
            res = await session.execute(stmt)
            current_chars = 0
            has_news = False
            for k in res.scalars().all():
                if current_chars + len(k.content) > 15000:
                    break
                watchlist_knowledge.append(f"[{ticker}]: {k.content}")
                current_chars += len(k.content)
                has_news = True
            if has_news:
                watchlist_with_news.add(ticker)
                
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
            
        # Fetch Upcoming Catalysts (Earnings) for both portfolio and watchlist (only those with news)
        import yfinance as yf
        async def fetch_catalyst(t):
            try:
                def get_cal():
                    return yf.Ticker(t).calendar
                cal = await asyncio.to_thread(get_cal)
                if cal and 'Earnings Date' in cal:
                    dates = cal['Earnings Date']
                    if len(dates) > 0:
                        next_date = dates[0]
                        if hasattr(next_date, 'date'):
                            next_date = next_date.date()
                        days_away = (next_date - datetime.now().date()).days
                        if 0 <= days_away <= 14:
                            return f"- {t}: Earnings on {next_date.strftime('%Y-%m-%d')} ({days_away} days away)"
            except Exception:
                pass
            return None

        combined_tickers_to_check = list(tickers_with_news.union(watchlist_with_news))
        catalyst_results = await asyncio.gather(*[fetch_catalyst(t) for t in combined_tickers_to_check]) if combined_tickers_to_check else []
        valid_catalysts = [c for c in catalyst_results if c]
        catalysts_str = "\n".join(valid_catalysts) if valid_catalysts else "No upcoming earnings in the next 14 days."
        
        # Build prompt
        portfolio_str = ", ".join(tickers_with_news) if tickers_with_news else "No portfolio stocks have recent news."
        watchlist_str_list = ", ".join(watchlist_with_news) if watchlist_with_news else "No watchlist stocks have recent news."
        
        knowledge_str = "\n".join(ticker_knowledge)
        watchlist_knowledge_str = "\n".join(watchlist_knowledge)
        macro_str = "\n".join(macro_knowledge)
        
        prompt = f"""Generate a Morning Briefing.

Macro Events / Market Sentiment:
{macro_str if macro_str else 'No major macro news.'}

Specific Portfolio Ticker Updates (Holdings with news: {portfolio_str}):
{knowledge_str if knowledge_str else 'No specific updates for portfolio holdings.'}

Specific Watchlist Ticker Updates (Watchlist with news: {watchlist_str_list}):
{watchlist_knowledge_str if watchlist_knowledge_str else 'No specific updates for watchlist.'}

Upcoming Catalysts:
{catalysts_str}

Format the response as a beautiful Markdown report with the following exact structure:
1. Market Overview (Strictly about the general market, macro economy, and overarching sentiment. Do not mention specific portfolio stocks here).
2. Portfolio Updates (Only include this section if there is actual news provided for specific portfolio holdings. Skip entirely if no portfolio news).
3. Watchlist Radar (Only include this section if there is actual news provided for watchlist items. Skip entirely if no watchlist news).
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
