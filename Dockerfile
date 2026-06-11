FROM python:3.11-slim

WORKDIR /app

# Install build dependencies for asyncpg and other native extensions
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY bot/ bot/
COPY alembic.ini .
COPY alembic/ alembic/

# Copy all root-level utility scripts (login, reset, test, etc.)
COPY *.py .

# Create sessions dir and set ownership so named volume inherits it
RUN mkdir -p /app/sessions
RUN useradd -m botuser && chown -R botuser /app
USER botuser

# Default command (can be overridden by docker-compose)
CMD ["python", "-m", "bot.main"]
