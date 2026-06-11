import asyncio
import logging
from bot.services.brain import generate_morning_report
from bot.db.database import engine

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def main():
    logger.info("Manually triggering the morning report generation...")
    try:
        await generate_morning_report()
        logger.info("Successfully generated and dispatched the morning report!")
    except Exception as e:
        logger.error(f"Failed to generate morning report: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
