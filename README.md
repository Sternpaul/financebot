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

## 📈 Current Status of Implementation

**Phase 1 & 2: Architecture & Database (✅ Completed)**
- [x] Docker Compose multi-service setup (`bot`, `worker`, `redis`, `rsshub`).
- [x] Async SQLAlchemy database connection and complete schema migrations.

**Phase 3: Web Dashboard (✅ Completed)**
- [x] **Settings Tab**: Dynamic Sources Manager for configuring RSS/News scraping sources.
- [x] **Feed Tab**: Complete 3-column Yahoo Finance-style News Engine separating Traditional News, Substack Reports, and Telegram Alpha streams.
- [x] **Watchlist Tab**: Global Yahoo Finance search engine & dedicated detailed Ticker Dashboards.
- [x] **Portfolio Tab**: Interactive asset allocation charts, P&L calculators, and mutation forms.

**Phase 4: Core Background Services (✅ Completed)**
- [x] **News/Fintwit Ingestion**: Background workers reliably poll configured Content Sources and inject intelligence into `news_articles`.
- [x] **Alerts Engine**: Complete technical alerts (Price Targets, % Drops) with customizable thresholds per ticker.
- [x] **Messaging Interface**: Live Discord integration pushing real-time alerts to the user's phone via Discord embeds with interactive [Acknowledge] buttons.

**Phase 6: Advanced Portfolio Analytics & Ledger (✅ Completed)**
- [x] **Dynamic Ledger Construction**: The portfolio state, P&L, and historical equity curves are now calculated dynamically by replaying your transaction history from the `transactions` table.
- [x] **Market State Integration**: Real-time Yahoo Finance indicators visually highlight whether the market for a specific asset is currently Open, Closed, Pre-Market, or Post-Market.
- [x] **Continuous Charting**: Implemented intelligent "reset" logic that retains previous daily charts during closed hours and weekends, ensuring the dashboard never shows an empty state.
- [x] **Massive Interoperability**: Industry-standard CSV Import and Export capabilities via `papaparse` allow you to easily ingest backups from platforms like Yahoo Finance or export your entire ledger for external tax analysis.

---

## 🚧 What Needs Work (Next Steps & Roadmap)

**Phase 5: The AI & RAG Ideation Engine (Highest Priority)**
Currently, we ingest hundreds of Telegram messages and Substack newsletters daily. We have configured the database to retain extended historical text data (500MB+ capacity) for deep analysis. We will implement **Semantic Search**:
- **Chunking & Embeddings**: Chunk all ingested text and use an LLM API to create vector embeddings stored in our `pgvector` database.
- **Semantic Research Hub**: Open a new "Research" tab on the dashboard to query your data semantically (e.g., *"What is the general sentiment on tech earnings right now?"*). The AI will scan all your alpha channels and reports instantly to synthesize an answer.
- **Natural Language Chat**: Add a chat interface where an LLM agent has access to your portfolio, watchlist, and live market data.

**Phase 7: Execution & Automation Hooks (Optional but Powerful)**
- **Automated Trading**: Allow technical alerts to trigger outbound webhooks (e.g., automatically firing a limit buy order via Binance or Hyperliquid when an asset drops 5% in volume).
- **AI-Driven Execution**: Make the entire platform "AI Ready". The end-goal is to allow the user to simply send a natural language message to the bot (e.g., *"I bought 1 TSLA yesterday at 5PM"*), and the AI will parse the entity, execution time, and automatically inject the transaction into your portfolio ledger.

---

## 🚀 Getting Started

6. Clone the repository.
2. Copy `.env.example` to `.env` and fill in your API keys (Discord, Supabase connection string, etc.).
3. Run the stack:
```bash
docker compose up --build -d
```
4. **Authenticate Telegram (One-Time Setup):**
To achieve true real-time ingestion for Telegram and to read private channels, you must authenticate the bot with your Telegram account.
Get your `TELEGRAM_API_ID` and `TELEGRAM_API_HASH` from [my.telegram.org](https://my.telegram.org) and add them to your `.env` file. Then, run the interactive authentication script inside the docker container:
```bash
docker compose run --rm worker python login_telegram.py
```
*(Enter your phone number and login code. This securely saves a `bot.session` file into the mounted `sessions/` directory, keeping the bot permanently authenticated.)*

5. Restart the stack to apply the new session:
```bash
docker compose restart worker
```