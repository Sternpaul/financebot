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

---

## 🚧 What Needs Work (Next Steps & Suggestions)

**Phase 5: The AI & RAG Ideation Engine (⏳ Pending)**
- [ ] **Semantic Search**: Implement text chunking and LLM API calls to store embeddings into `pgvector`. This will allow you to semantically query all your Substack and Telegram data (e.g., *"What is the consensus on TSLA earnings across my alpha channels?"*).
- [ ] **Natural Language Chat**: Add a chat UI to the dashboard where an LLM agent has access to your portfolio, watchlist, and live market data.

**Phase 6: Advanced Portfolio Analytics (⏳ Pending)**
- [ ] **Equity Curve Tracking**: Create a background job that takes a daily snapshot of total portfolio value and stores it in a time-series table to render a historical performance chart (vs. the S&P 500 benchmark).

**Phase 7: Execution & Automation (💡 Idea)**
- [ ] **Webhooks/Execution Hooks**: Allow technical alerts to trigger outbound webhooks (e.g., to automatically execute trades via an exchange API).

---

## 🚀 Getting Started

1. Clone the repository.
2. Copy `.env.example` to `.env` and fill in your API keys (Discord, Supabase connection string, etc.).
3. Run the stack:
```bash
docker compose up --build -d
```