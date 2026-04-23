FROM python:3.12-slim

# System dependencies for psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
        curl \
        libmagic1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies first (better caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p uploads/avatars uploads/attachments

# Create non-root user
RUN adduser --disabled-password --no-create-home vraiticket \
    && chown -R vraiticket:vraiticket /app

USER vraiticket

EXPOSE 8000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# ←←← THIS IS THE MOST IMPORTANT CHANGE ←←←
# Run migrations BEFORE starting the FastAPI server
CMD ["sh", "-c", "\
    echo 'Running database migrations...' && \
    alembic upgrade head && \
    echo 'Starting VraiTicket server...' && \
    uvicorn app.main:app --host 0.0.0.0 --port 8000 \
"]
