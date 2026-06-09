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

**Phase 1: Architecture Scaffolding (✅ Completed)**
- [x] Docker Compose multi-service setup (`bot`, `worker`, `redis`, `rsshub`).
- [x] Pydantic configuration (`bot/config.py`) loading `.env` variables securely.
- [x] Async SQLAlchemy database connection established (`bot/db/database.py`).
- [x] Database schemas built for Holdings, Watchlist, Content Sources, News Articles, Alerts, and Embeddings.

**Phase 2: Database & Migrations (✅ Completed)**
- [x] Initialize Alembic.
- [x] Generate and apply migrations to the Supabase instance.
- [x] Setup dynamic Data Sources & Roles.

**Phase 5: Web Dashboard (✅ Completed)**
- [x] Connect Next.js 15+ Server Components to the Supabase instance securely.
- [x] **Settings Tab**: Dynamic Sources Manager for configuring RSS/News scraping sources.
- [x] **Feed Tab**: Live news intelligence feed parsing articles directly from the database.
- [x] **Watchlist Tab**: Global Yahoo Finance search engine & dedicated detailed Ticker Dashboards.
- [x] **Portfolio Tab**: Interactive asset allocation charts (`recharts`), P&L calculators, and mutation forms.
- [x] **UI/UX**: Modern minimalist design with Light/Dark mode toggles and global EUR/USD currency contexts via secure cookies.

---

## 🚧 What Needs Work (Next Steps)

**Phase 3: Core Services (⏳ Current)**
- [x] **News/Fintwit Ingestion**: Background workers to poll configured Content Sources and inject intelligence into `news_articles`.
- [ ] **Technical Alerts**: Implement the logic to detect "Buy The F*ckin Dip" (BTFD) conditions (e.g., volume spikes, % drops).
- [ ] **Portfolio Tracking Background Job**: Re-evaluate portfolio value to send weekly summary alerts.

**Phase 4: Messaging Interface (Discord initially) (⏳ Pending)**
- [ ] Register persistent UI Views (Buttons for Morning Report, Portfolio, Alerts).
- [ ] Connect messaging context to the database to sync user commands to the UI.
- [ ] Deploy and test in a live server.
- [ ] Abstract messaging layer to support multiple platforms (Telegram, Slack, etc.).

**Phase 6: Alerts Hub & Research (Next Up)**
- [ ] Build the Alerts Hub tab to configure global/per-ticker alert thresholds on the dashboard.
- [ ] Build the Research tab to allow exploratory ticker searches without adding them to the permanent watchlist.

**Future Possible Features**
- **RAG & Ideation System**: Implement text chunking and OpenAI/Local API calls to store embeddings into `pgvector`, creating an AI-powered vector similarity search for research documents.
- **Natural Language Router**: Interpret complex natural language queries (e.g., "@bot what should I long for...") via LLM.

---

## 🚀 Getting Started

1. Clone the repository.
2. Copy `.env.example` to `.env` and fill in your API keys (Discord, Supabase connection string, etc.).
3. Run the stack:
```bash
docker compose up --build -d
```