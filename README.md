# 📈 Personal AI Investment Dashboard

A comprehensive, personalized web dashboard and AI-driven investment research platform. It provides a beautiful central hub for portfolio management, real-time market data, technical alerts, and research coverage.

While the primary interface is the sleek Next.js Web Dashboard, the platform includes a decoupled background notification engine (currently integrated with Discord, but extensible to any messaging service) to push critical alerts and morning reports to your phone.

## 🏗️ Architecture

This project is built for portability and zero vendor lock-in, deploying easily via Docker Compose.

The platform utilizes a **Modern Full-Stack Architecture**:
- **Dashboard:** Next.js (React) front-end displaying the portfolio, watchlist, and AI reports.
- **Bot/Worker:** A Discord bot & background scheduler built in Python (Discord.py / APScheduler).
- **Brain/AI:** Python services hitting OpenRouter (or local LLMs) for synthesizing unstructured news into investment ideas.
- **Chrome Extension (New):** A locally installed Chrome extension that intercepts Twitter (X.com) timelines to scrape tweets & images into Supabase natively via REST API.
- **Database:** Supabase (PostgreSQL with pgvector for embeddings).

---

## 🚀 The FinanceBot Chrome Extension (Local Scraping)

Twitter aggressively blocks traditional cloud scrapers. To get around this, FinanceBot includes a custom Chrome Extension (`/extension`) that silently intercepts raw tweets and images as you browse your timeline, and pushes them directly into your Supabase database.

### 1. Database Migration
Before using the extension, you must create the `raw_tweets`, `liked_tweets`, and `web_content` tables. On your Google Cloud backend server, run the included Python migration scripts inside your worker container:
```bash
# For v1.0 schema (raw tweets)
docker compose exec -T worker python bot/create_raw_tweets_table.py
# For v1.1 schema (likes & web articles)
docker compose exec -T worker python bot/create_v1_1_tables.py
```

### 2. Installation
1. Open Google Chrome.
2. Go to `chrome://extensions/`.
3. Toggle **Developer mode** to ON (top right).
4. Click **Load unpacked** (top left) and select the `financebot/extension` folder.

### 3. Configuration & Filtering
Click the FinanceBot puzzle icon in your Chrome toolbar to open the popup.
- **Supabase URL & Key:** Enter your Supabase REST API credentials.
- **Keyword Blocklist:** Ignore noisy topics. Enter comma-separated words (e.g. `football, messi, ronaldo`). Any tweet containing these words will be dropped instantly.
- **Username Blocklist:** Ignore noisy accounts (e.g. `dogecoin_fan, cryptospambot`).

### 4. Advanced Features (v1.1)
- **Passive Liked Tweets**: Every time you ❤️ a tweet, or scroll through your "Likes" tab, the extension silently pushes it to the `liked_tweets` table.
- **Auto URL Unshortening**: The extension automatically resolves annoying `t.co` links to their real destinations.
- **1-Click Web Scraping**: When reading a news article on an external site (Bloomberg, Substack, etc.), press **Alt+S** (or Command+S on Mac), or Right-Click the page and hit `FinanceBot: Scrape Article`. The extension will extract the clean text of the article and push it to the `web_content` table!
- **Auto DB Cleanup**: A background cron job in `bot/worker.py` automatically deletes tweets older than 30 days every night to save database space.

---

## ✨ Core Features

- **Modern Web Dashboard**: A sleek, Vercel/Linear style Next.js 15 interface featuring dynamic portfolios, interactive asset allocation charts, and a highly responsive design.
- **Robust Database Foundation**: Asynchronous SQLAlchemy and Postgres with `pgvector` for storing portfolio holdings, embeddings, user settings, and watchlists.
- **Dynamic Ledger & Market Integration**: Portfolio states, P&L, and equity curves are calculated dynamically from transaction history. Real-time Yahoo Finance indicators natively display open/closed market states with intelligent charting logic.
- **Automated Intelligence & Ingestion**: Background workers reliably poll traditional news, Substack reports, and Telegram alpha streams. A sophisticated "AI Brain" compresses articles into 30-minute Short-Term Memories, and recursively compacts them into dense Long-Term "Master Summaries" every 24 hours. The entire AI background pipeline utilizes an **O(1) JSON Batching Architecture**, guaranteeing infinite scaling capabilities without ever exceeding harsh Free-Tier API rate limits.
- **Interactive AI "Explain"**: Seamlessly ask the AI to "Explain Today's Move" for any ticker. The dashboard slides open a chat sidebar and streams an explanation via OpenRouter, leveraging recently ingested news and market context.
- **Risk Cockpit**: Dedicated portfolio risk analytics visualizing your Asset Allocation, Concentration Risk, and dynamic Sector Exposure powered by Recharts.
- **Real-Time Alert Engine & Performance Tracking**: Fully customizable technical alerts (price targets, volume shifts, % drops) that push rich notifications to your phone via Discord. A nightly background job evaluates historical alerts, calculating their 3-day, 7-day, and 30-day forward returns to visualize the predictive power of your parameters.
- **Morning Briefings with Catalyst Injection**: Every morning, the AI synthesizes your portfolio's news and intelligently injects upcoming corporate earnings dates directly from the calendar. The generated report follows a strict structure: separating a pure Macro Overview, filtering Portfolio Updates to only holdings with actionable news, and scanning a dynamic Watchlist Radar.
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