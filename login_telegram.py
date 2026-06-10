import os
import asyncio
from telethon import TelegramClient
from dotenv import load_dotenv

load_dotenv()

API_ID = os.getenv("TELEGRAM_API_ID")
API_HASH = os.getenv("TELEGRAM_API_HASH")

if not API_ID or not API_HASH:
    print("Please set TELEGRAM_API_ID and TELEGRAM_API_HASH in your .env file.")
    exit(1)

# We will save the session file as "bot.session" in the sessions directory.
# The docker-compose mounts this into the worker.
os.makedirs("sessions", exist_ok=True)
client = TelegramClient('sessions/bot', int(API_ID), API_HASH)

async def main():
    print("Connecting to Telegram...")
    await client.start()
    print("\n✅ Successfully authenticated!")
    print("A 'bot.session' file has been created in the 'sessions/' directory.")
    print("You can now safely restart your docker containers.")

if __name__ == "__main__":
    asyncio.run(main())
