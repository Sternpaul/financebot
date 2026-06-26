FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (curl/unzip for deno)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    gcc curl unzip && \
    curl -fsSL https://deno.land/install.sh | sh && \
    rm -rf /var/lib/apt/lists/*

ENV PATH="/root/.deno/bin:$PATH"

COPY local_worker/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python", "-m", "bot.local_worker"]
