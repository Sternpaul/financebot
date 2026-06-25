FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (ffmpeg is needed by yt-dlp)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    gcc \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY local_worker/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python", "-m", "bot.local_worker"]
