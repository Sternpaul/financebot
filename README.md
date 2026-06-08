# 🤖 AI Investment Team Bot

A Discord bot acting as your personal AI investment research team. It provides morning market reports, portfolio management, research coverage, technical alerts, and contextual answering via a RAG (Retrieval-Augmented Generation) engine.

## 🏗️ Architecture

This project is built for portability and zero vendor lock-in, deploying easily via Docker Compose. 

The application utilizes a **Dual-Process Architecture** to ensure the Discord event loop is never blocked by heavy computations or API scraping:
1. **Bot Process (`bot/main.py`)**: Runs `discord.py` to handle Discord interactions and consumes real-time alerts from Redis Streams.
2. **Worker Process (`bot/worker.py`)**: Runs `APScheduler` to handle background polling (RSS, Market Data), generate vector embeddings, and produce events to Redis Streams.

### Core Technologies
- **Python 3.11**
- **discord.py 2.4**
- **Supabase (PostgreSQL + pgvector)**: Single source of truth for relational data and document embeddings.
- **Redis Streams**: Inter-process communication between the worker and the bot.
- **SQLAlchemy 2.0 + asyncpg**: Asynchronous ORM.
- **OpenAI API**: For generating text embeddings.
- **RSSHub**: For ingesting Fintwit, Substack, and YouTube feeds.
- **VADER Sentiment**: Zero-resource, rule-based sentiment analysis for ingested feeds.
- **Next.js & Vercel**: For a free, serverless web dashboard connected to Supabase.

---

## 📈 Current Status of Implementation

**Phase 1: Architecture Scaffolding (✅ Completed)**
- [x] Docker Compose multi-service setup (`bot`, `worker`, `redis`, `rsshub`).
- [x] Pydantic configuration (`bot/config.py`) loading `.env` variables securely.
- [x] Async SQLAlchemy database connection established (`bot/db/database.py`).
- [x] Database schemas built for Holdings, Watchlist, Posts, Alerts, and RAG Embeddings (`bot/db/models.py`).
- [x] Dual-process skeletons created (`bot/main.py` and `bot/worker.py`).
- [x] Redis Streams integration for IPC.

---

## 🚧 What Needs Work (Next Steps)

**Phase 2: Database & Migrations (✅ Completed)**
- [x] Initialize Alembic.
- [x] Generate the first database migration from the SQLAlchemy models.
- [x] Apply migrations to the Supabase instance.

**Phase 3: Core Services (⏳ Current)**
- [ ] **Market Data Service**: Implement integrations with yfinance (for bulk quotes), Polygon, and Hyperliquid.
- [ ] **Fintwit Ingestion**: Implement RSSHub parsing for Fintwit, Telegram, and Substack, scoring sentiment with VADER, and storing results in the database.
- [ ] **Technical Alerts**: Implement the logic to detect "Buy The F*ckin Dip" (BTFD) conditions (e.g., volume spikes, % drops).

**Phase 4: Discord Interface (⏳ Pending)**
- [ ] Register persistent UI Views (Buttons for Morning Report, Portfolio, Alerts).
- [ ] Deploy and test in a live server.

**Phase 5: Web Dashboard (⏳ Pending)**
- [ ] Initialize Next.js project.
- [ ] Connect Next.js to the Supabase instance.
- [ ] Build UI to manage portfolio, watchlists, and view bot settings.
- [ ] Build feed view for news ranked by VADER sentiment scores.
- [ ] Deploy to Vercel for free serverless hosting.

**Future Possible Features**
- **RAG & Ideation System**: Implement text chunking and OpenAI/Local API calls to store embeddings into `pgvector`, creating an AI-powered vector similarity search for research documents.
- **Natural Language Router**: Interpret complex natural language queries (e.g., "@bot what should I long for...") via LLM.
- **VADER Sentiment Alerts**: Actively alert in Discord when the calculated sentiment score of a specific tracked entity drops below a critical threshold.

---

## 🚀 Getting Started

1. Clone the repository.
2. Copy `.env.example` to `.env` and fill in your API keys (Discord, Supabase connection string, OpenAI, etc.).
3. Run the stack:
```bash
docker compose up --build -d
```