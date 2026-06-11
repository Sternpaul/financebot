# 📈 Personal AI Investment Dashboard

A comprehensive, personalized web dashboard and AI-driven investment research platform. It provides a beautiful central hub for portfolio management, real-time market data, technical alerts, and research coverage.

While the primary interface is the sleek Next.js Web Dashboard, the platform includes a decoupled background notification engine (currently integrated with Discord, but extensible to any messaging service) to push critical alerts and morning reports to your phone.

## 🏗️ Architecture

This project is built for portability and zero vendor lock-in, deploying easily via Docker Compose.

The platform utilizes a **Modern Full-Stack Architecture**:
1. **Web Dashboard (`dashboard/`)**: The core product. A sleek Next.js 15 Server-Side Rendered (SSR) application connected to Supabase. It features dynamic portfolios, real-time data fetching, and an incredibly fast UI.
2. **Worker Process (`bot/worker.py`)**: Runs `APScheduler` to handle background polling (RSS, News, Market Data), generate vector embeddings, and produce system events.
3. **Messaging Bot Process (`bot/main.py`)**: An ancillary service that consumes real-time alerts from Redis Streams and pushes notifications to configured platforms (e.g. Discord).

### Core Technologies
- **Next.js 15+ & Vercel**: The primary interface. Features a modern, minimalist UI (Vercel/Linear style) with responsive charts and theming.
- **Supabase (PostgreSQL + pgvector)**: Single source of truth for portfolio holdings, watchlists, user settings, and document embeddings.
- **Real-Time Market Data**: Integration with Yahoo Finance and Massive.com (Polygon) for fail-safe, live pricing and time-series chart alignment.
- **Python 3.11 & SQLAlchemy 2.0**: Handles the heavy lifting of background cron jobs, RSS polling, and data processing.
- **Redis Streams**: Asynchronous event bus connecting the worker to the notification engine.

---

## ✨ Core Features

- **Modern Web Dashboard**: A sleek, Vercel/Linear style Next.js 15 interface featuring dynamic portfolios, interactive asset allocation charts, and a highly responsive design.
- **Robust Database Foundation**: Asynchronous SQLAlchemy and Postgres with `pgvector` for storing portfolio holdings, embeddings, user settings, and watchlists.
- **Dynamic Ledger & Market Integration**: Portfolio states, P&L, and equity curves are calculated dynamically from transaction history. Real-time Yahoo Finance indicators natively display open/closed market states with intelligent charting logic.
- **Automated Intelligence & Ingestion**: Background workers reliably poll traditional news, Substack reports, and Telegram alpha streams. A sophisticated "AI Brain" compresses articles into 30-minute Short-Term Memories, and recursively compacts them into dense Long-Term "Master Summaries" every 24 hours.
- **Interactive AI "Explain"**: Seamlessly ask the AI to "Explain Today's Move" for any ticker. The dashboard slides open a chat sidebar and streams an explanation via OpenRouter, leveraging recently ingested news and market context.
- **Risk Cockpit**: Dedicated portfolio risk analytics visualizing your Asset Allocation, Concentration Risk, and dynamic Sector Exposure powered by Recharts.
- **Real-Time Alert Engine & Performance Tracking**: Fully customizable technical alerts (price targets, volume shifts, % drops) that push rich notifications to your phone via Discord. A nightly background job evaluates historical alerts, calculating their 3-day, 7-day, and 30-day forward returns to visualize the predictive power of your parameters.
- **Morning Briefings with Catalyst Injection**: Every morning, the AI synthesizes your portfolio's news and intelligently injects upcoming corporate earnings dates directly from the calendar.
- **Massive Interoperability**: Industry-standard CSV Import and Export capabilities via `papaparse` for seamless transitions between platforms like Yahoo Finance and external tax tools.

---

## 🚧 Roadmap & What Needs Work

**Execution & Automation Hooks**
- **Automated Trading**: Allow technical alerts to trigger outbound webhooks (e.g., automatically firing a limit buy order via Binance or Hyperliquid when an asset drops 5% in volume).
- **AI-Driven Execution**: Make the entire platform "AI Ready". The end-goal is to allow the user to simply send a natural language message to the bot (e.g., *"I bought 1 TSLA yesterday at 5PM"*), and the AI will parse the entity, execution time, and automatically inject the transaction into your portfolio ledger.

---

## 🚀 Getting Started

### 🖥️ Dashboard Deployment (Vercel)
If you are deploying the Next.js Dashboard to Vercel, you must set the following environment variables in your Vercel project settings:
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase Project URL (e.g. `https://your-project.supabase.co`)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase Anon Public Key
*(Note: The user requested NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, but standard Supabase terminology uses ANON_KEY. Set whichever your frontend configuration requires).*

### 🤖 Backend Stack Deployment (Docker)
1. **Enable pgvector on Supabase (CRITICAL):**
Before running any migrations, you MUST enable the `pgvector` extension in your Supabase project. You can do this by going to the Supabase Dashboard -> Database -> Extensions -> search for `vector` and enable it. Or run `create extension vector;` in the SQL editor.

2. Clone the repository.
3. Copy `.env.example` to `.env` and fill in your API keys (Discord, Supabase connection string, etc.).
4. Run the database migrations to create the schema:
```bash
docker compose run --rm worker alembic upgrade head
```

5. **Fix Supabase PostgREST Permissions (CRITICAL):**
Because Alembic creates the tables directly in PostgreSQL as the admin user, the Supabase Data API (PostgREST) won't automatically have read access, resulting in a `permission denied for table` error on the frontend.
You **MUST** run the following SQL snippet in your Supabase Dashboard's SQL Editor to grant the web roles access:
```sql
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated;
```

6. Run the stack:
```bash
docker compose up --build -d
```
7. **Authenticate Telegram (One-Time Setup):**
To achieve true real-time ingestion for Telegram and to read private channels, you must authenticate the bot with your Telegram account.
Get your `TELEGRAM_API_ID` and `TELEGRAM_API_HASH` from [my.telegram.org](https://my.telegram.org) and add them to your `.env` file. Then, run the interactive authentication script **locally on your machine** (not inside Docker) to easily scan the QR code:
```bash
# Install local dependencies first
pip install telethon python-dotenv qrcode

# Run the authentication script
python login_telegram.py
```
*(Scan the QR code with your Telegram app under Settings -> Devices -> Link Desktop Device. If you have Two-Step Verification enabled, it will prompt you for your password. This securely saves a portable `bot.session` file into the `sessions/` directory.)*

8. Copy the generated `sessions/bot.session` to your server and place it in the server's `sessions/` directory (or inject it directly into the Docker volume if using named volumes).
9. Restart the stack to apply the new session:
```bash
docker compose restart worker bot
```