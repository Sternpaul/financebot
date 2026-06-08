# 🤖 AI Investment Team Bot

A Discord bot acting as your personal AI investment research team. It provides morning market reports, portfolio management, research coverage, technical alerts, and contextual answering via a RAG (Retrieval-Augmented Generation) engine.

## 🏗️ Architecture

This project is built for portability and zero vendor lock-in, deploying easily via Docker Compose. 

The application utilizes a **Dual-Process Architecture** to ensure the Discord event loop is never blocked by heavy computations or API scraping:
1. **Bot Process (`bot/main.py`)**: Runs `discord.py` to handle Discord interactions and consumes real-time alerts from Redis Streams.
2. **Worker Process (`bot/worker.py`)**: Runs `APScheduler` to handle background polling (RSS, News, Market Data), generate vector embeddings, and produce events to Redis Streams.

### Core Technologies
- **Python 3.11**
- **discord.py 2.4**
- **Supabase (PostgreSQL + pgvector)**: Single source of truth for relational data and document embeddings.
- **Redis Streams**: Inter-process communication between the worker and the bot.
- **SQLAlchemy 2.0 + asyncpg**: Asynchronous ORM.
- **Next.js 15+ & Vercel**: A sleek, serverless web dashboard connected to Supabase featuring a modern, minimalist UI (Vercel/Linear style).
- **Yahoo Finance & Recharts**: Fail-safe global market data fetching and interactive portfolio charting.

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

**Phase 4: Discord Interface (⏳ Pending)**
- [ ] Register persistent UI Views (Buttons for Morning Report, Portfolio, Alerts).
- [ ] Connect Discord context to the database to sync user commands to the UI.
- [ ] Deploy and test in a live server.

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