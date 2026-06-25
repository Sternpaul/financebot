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
Before using the extension, you must create the necessary tables. On your Google Cloud backend server, run the included Python migration scripts inside your worker container:
```bash
# For v1.0 schema (raw tweets)
docker compose exec -T worker python bot/create_raw_tweets_table.py
# For v1.1 schema (likes & web articles)
docker compose exec -T worker python bot/create_v1_1_tables.py
# For v1.2 schema (omni-scraper & curated articles)
docker compose exec -T worker python bot/create_v1_2_tables.py
```

### 2. Installation
1. Open Google Chrome.
2. Go to `chrome://extensions/`.
3. Toggle **Developer mode** to ON (top right).
4. Click **Load unpacked** (top left) and select the `financebot/extension` folder.

### 3. Configuration
Click the FinanceBot puzzle icon in your Chrome toolbar. This will open a quick-action popup where you can manually save the current page. From there, click **⚙️ Open Settings** to configure the extension.
- **Supabase URL & Key:** Enter your Supabase REST API credentials.
- **Dashboard Password (Security):** To protect your personal database from public access, the database uses "Secret Header Authentication". Enter your master `DASHBOARD_PASSWORD` here. The extension will securely attach this password to every request.
- **Keyword Blocklist:** Ignore noisy topics. Enter comma-separated words (e.g. `football, messi, ronaldo`). Any tweet containing these words will be dropped instantly.
- **Username Blocklist:** Ignore noisy accounts (e.g. `dogecoin_fan, cryptospambot`).
- **Omni-Scraper Domain Allowlist:** Add domains (e.g., `bloomberg.com, wsj.com`) that the extension should automatically scrape every time you visit a page.
- **Activity Logs:** At the bottom of the settings page, you can view a real-time log of every page and tweet the extension processed or dropped, giving you full transparency.

### 4. Advanced Features (v1.2.1)
- **Passive Liked Tweets**: Every time you ❤️ a tweet, or scroll through your "Likes" tab, the extension silently pushes it to the `liked_tweets` table.
- **Auto URL Unshortening**: The extension automatically resolves annoying `t.co` links to their real destinations.
- **1-Click Web Scraping**: When reading a news article on an external site, press **Alt+S** (or Command+S on Mac), click the **Save Current Page** button in the extension popup, or Right-Click the page and hit `FinanceBot: Scrape Article`. The extension will extract the clean text and push it to the `curated_webcontent` table!
- **Omni-Scraper (Auto)**: For any domains listed in your Domain Allowlist, the extension will *automatically* scrape the page in the background and save it to the `raw_webcontent` table.
- **Smart DB Cleanup**: A background cron job automatically monitors your Supabase database size. If it exceeds 400 MB, it dynamically deletes the oldest 10% of raw tweets and raw web content to ensure you never run out of space.

---

### 5. Custom Ingestion Feeds
Users can add and manage specific sources via the dashboard:

#### YouTube Podcasts Integration (Decoupled Architecture)
To bypass aggressive YouTube datacenter IP bans, the podcast ingestion pipeline is split into two parts:
1. **Cloud Worker**: Polls the RSS feeds and detects new episodes, saving them to the database as pending.
2. **Local Transcript Worker**: A dedicated lightweight container you run on your local residential IP (e.g., your personal PC or local Debian server). 

**How to configure a new channel:**
1. Go to **Settings -> System Settings**.
2. Select **YouTube Channel** from the dropdown.
3. Provide the Handle (`@TaikiMaeda`), URL, or Raw ID.

**How to run the Local Transcript Worker:**
Because Cloud IPs are banned from downloading YouTube subtitles, you must run this worker locally.
1. Extract your YouTube cookies using a browser extension (like "Get cookies.txt LOCALLY") and save them as `cookies.txt` in the root of the project.
2. Create a `.env` file in the same directory and provide these exact variables:
```env
# Your Supabase Postgres connection string
SUPABASE_URL=postgresql://postgres.xxx:password@aws-0-region.pooler.supabase.com:6543/postgres

# Your OpenRouter API Key (mapped to the worker's expected variable)
LLM_API_KEY=sk-or-v1-xxxxxxxxx
```
3. Spin up the lightweight isolated container:
```bash
docker compose -f docker-compose-local.yml up -d
```
This worker will silently wake up at 02:00 AM every day, query your cloud database for any pending episodes, download the transcripts seamlessly using your residential IP, pass them through the `openrouter/owl-alpha` AI to extract actionable trades, and sync everything back to your dashboard!

#### Other Sources
- **Substack Newsletters**: Automatically fetches RSS feeds for requested authors.
- **Telegram Channels**: Backfills and continuously tracks private alpha channels via Telethon.
- **Watchlist Tickers**: Auto-fetches news specifically related to watched stocks via Yahoo Finance RSS.

---

## ✨ Core Features

- **Modern Web Dashboard**: A sleek, Vercel/Linear style Next.js 15 interface featuring dynamic portfolios, interactive asset allocation charts, and a highly responsive design.
- **Robust Database Foundation**: Asynchronous SQLAlchemy and Postgres with `pgvector` for storing portfolio holdings, embeddings, user settings, and watchlists.
- **Dynamic Ledger & Market Integration**: Portfolio states, P&L, and equity curves are calculated dynamically from transaction history. Real-time Yahoo Finance indicators natively display open/closed market states with intelligent charting logic.
- **Automated Intelligence & Ingestion**: Background workers reliably poll traditional news, Substack reports, and Telegram alpha streams. A sophisticated "AI Brain" compresses articles into 30-minute Short-Term Memories, and recursively compacts them into dense Long-Term "Master Summaries" every 24 hours. The entire AI background pipeline utilizes an **O(1) JSON Batching Architecture**, guaranteeing infinite scaling capabilities without ever exceeding harsh Free-Tier API rate limits.
- **Podcast Trades Tracker**: Automatic extraction of trade ideas from macro podcasts (e.g. Blockworks Forward Guidance). Ingests YouTube RSS feeds, downloads transcripts, and uses AI to extract tickers, direction (Long/Short), thesis, and speaker — all viewable in a dedicated `/podcasts` dashboard page.
- **Interactive AI "Explain"**: Seamlessly ask the AI to "Explain Today's Move" for any ticker. The dashboard slides open a chat sidebar and streams an explanation via OpenRouter, leveraging recently ingested news and market context.
- **AI Model Fallback**: All dashboard AI features (Chat, Explain, Market Summary) use a shared OpenRouter helper with automatic model fallback. If the primary model is unavailable or rate-limited, it seamlessly rotates through configured fallback models.
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
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase Service Role Key (Required to securely bypass RLS on the server)
- `DASHBOARD_PASSWORD`: Your master password. The dashboard will require this password to log in.
- `AUTH_SECRET`: A random 32+ character string used for signing JWTs (generate with `openssl rand -base64 32`).
- `OPENROUTER_API_KEY`: Your OpenRouter API key (used by all AI features in the dashboard).
- `LLM_MODEL`: *(Optional)* Primary model slug (e.g. `google/gemini-2.5-flash-preview-05-20`).
- `LLM_FALLBACK_MODELS`: *(Optional)* Comma-separated fallback model slugs (e.g. `google/gemma-4-31b-it:free,openrouter/owl-alpha`).

### 🔒 Security & Row Level Security (RLS)
The database is secured using a hybrid architecture for single-user personal dashboards:
1. **Next.js Dashboard:** Client Components have been refactored to use Server Actions. The server securely connects using the `SUPABASE_SERVICE_ROLE_KEY`, ensuring no secrets are exposed to the browser.
2. **Chrome Extension:** Connects via the REST API using "Secret Header Authentication". The extension attaches `x-dashboard-password` to HTTP headers.
3. **Database RLS:** The `enable_rls.py` migration script locks down all tables with a strict policy: `USING (current_setting('request.headers')::json->>'x-dashboard-password' = 'YOUR_SECRET')`.

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
Because Alembic creates the tables directly in PostgreSQL as the admin user, the Supabase Data API (PostgREST) won't automatically have read access via the `service_role` key, resulting in a `permission denied for table` error on the frontend.
You **MUST** run the following SQL snippet in your Supabase Dashboard's SQL Editor to grant `service_role` access:
```sql
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
```
> ⚠️ **Do NOT grant permissions to `anon` or `authenticated` roles** unless you have specific RLS policies configured. The dashboard uses the `service_role` key which bypasses RLS securely on the server side.

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