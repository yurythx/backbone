# ═══════════════════════════════════════════════════════════════
# Backbone Backend — Multi-stage Dockerfile
# Stage 1 (builder): Install all build dependencies + compile packages
# Stage 2 (runtime): Minimal image with only what's needed to run
#
# Result: ~250MB vs ~800MB single-stage
# ═══════════════════════════════════════════════════════════════

# ── Stage 1: Builder ───────────────────────────────────────────
FROM python:3.12-slim AS builder

# Build-time dependencies (gcc, headers) — not carried to runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libldap2-dev \
    libsasl2-dev \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

# Copy requirements first for better layer caching
COPY requirements.txt .

# Install packages into a separate prefix so we can copy just them to runtime
RUN pip install --upgrade pip \
    && pip install --no-cache-dir --prefix=/install -r requirements.txt


# ── Stage 2: Runtime ───────────────────────────────────────────
FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    # Put /install/bin on PATH so installed scripts (daphne, celery, etc.) work
    PATH="/install/bin:$PATH" \
    PYTHONPATH="/install/lib/python3.12/site-packages"

# Runtime-only system packages (no gcc or dev headers)
RUN apt-get update && apt-get install -y --no-install-recommends \
    # PostgreSQL client for migrations / pg_isready
    postgresql-client \
    # netcat for the entrypoint DB wait loop
    netcat-traditional \
    # Runtime LDAP library (not dev headers)
    libldap-common \
    libldap-2.4-2 \
    libsasl2-2 \
    # libmagic for python-magic (file type detection)
    libmagic1 \
    # curl for optional health checks
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy compiled packages from builder
COPY --from=builder /install /install

WORKDIR /app

# Copy application source
COPY . /app/

# Create a non-root user and lock down permissions
RUN addgroup --system app \
    && adduser --system --ingroup app --no-create-home app \
    && mkdir -p /app/staticfiles /app/media \
    && chown -R app:app /app

# Collect static files at build time (dummy env vars — no DB connection needed)
RUN SECRET_KEY="build-phase-dummy-key" \
    DEBUG=False \
    DATABASE_URL="sqlite:///tmp/dummy.sqlite3" \
    REDIS_URL="" \
    FIELD_ENCRYPTION_KEY="" \
    python manage.py collectstatic --noinput --clear

RUN chmod +x /app/entrypoint.sh

# Drop privileges
USER app

EXPOSE 8000

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "config.asgi:application"]
