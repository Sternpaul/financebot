import os
import asyncio
from telethon import TelegramClient, errors
import qrcode
from dotenv import load_dotenv

load_dotenv()

API_ID = os.getenv("TELEGRAM_API_ID")
API_HASH = os.getenv("TELEGRAM_API_HASH")

if not API_ID or not API_HASH:
    print("Please set TELEGRAM_API_ID and TELEGRAM_API_HASH in your .env file.")
    exit(1)

os.makedirs("sessions", exist_ok=True)
client = TelegramClient('sessions/bot', int(API_ID), API_HASH)

async def main():
    print("Connecting to Telegram...")
    await client.connect()

    if not await client.is_user_authorized():
        print("\nGenerating QR code for login...")
        qr_login = await client.qr_login()

        print("\nPlease scan the following QR code with your Telegram app (Settings -> Devices -> Link Desktop Device):")
        # Generate terminal-friendly QR code
        qr = qrcode.QRCode(version=1, box_size=1, border=2)
        qr.add_data(qr_login.url)
        qr.make(fit=True)
        qr.print_ascii(invert=True)

        try:
            print("\nWaiting for you to scan the QR code...")
            await qr_login.wait(timeout=120)
        except errors.SessionPasswordNeededError:
            print("\n🔒 Two-step verification is enabled.")
            password = input("Please enter your Telegram password: ")
            await client.sign_in(password=password)
        except Exception as e:
            print(f"\n❌ Error during QR login: {e}")
            exit(1)

    print("\n✅ Successfully authenticated!")
    print("A 'bot.session' file has been created in the 'sessions/' directory.")
    print("You can now safely upload it to your server.")

if __name__ == "__main__":
    asyncio.run(main())
