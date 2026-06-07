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

**Phase 2: Database & Migrations (⏳ Pending)**
- [ ] Initialize Alembic.
- [ ] Generate the first database migration from the SQLAlchemy models.
- [ ] Apply migrations to the Supabase instance.

**Phase 3: Core Services (⏳ Pending)**
- [ ] **Market Data Service**: Implement integrations with yfinance (for bulk quotes), Polygon, and Hyperliquid.
- [ ] **RAG & Ideation Service**: Implement text chunking and OpenAI API calls to store embeddings into `pgvector`, and write the vector similarity search logic.
- [ ] **Fintwit Ingestion**: Implement RSSHub parsing for Fintwit, Telegram, and Substack, storing results in the database.
- [ ] **Technical Alerts**: Implement the logic to detect "Buy The F*ckin Dip" (BTFD) conditions (e.g., volume spikes, % drops).

**Phase 4: Discord Interface (⏳ Pending)**
- [ ] Register persistent UI Views (Buttons for Morning Report, Portfolio, Alerts).
- [ ] Implement Natural Language router to interpret "@bot what should I long for...".
- [ ] Deploy and test in a live server.

---

## 🚀 Getting Started

1. Clone the repository.
2. Copy `.env.example` to `.env` and fill in your API keys (Discord, Supabase connection string, OpenAI, etc.).
3. Run the stack:
```bash
docker compose up --build -d
```