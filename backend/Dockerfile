# Pull official base image
FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Set work directory
WORKDIR /app

# Install system dependencies including LDAP libraries for python-ldap
RUN apt-get update && apt-get install -y \
    netcat-traditional \
    gcc \
    libldap2-dev \
    libsasl2-dev \
    postgresql-client \
    libpq-dev \
    libmagic1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt /app/
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

# Copy project
COPY . /app/

# Create a non-root user
RUN addgroup --system app && adduser --system --group app

# Create staticfiles directory and set permissions
RUN mkdir -p /app/staticfiles && chown -R app:app /app

# Copy entrypoint script
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Switch to non-root user
USER app

# Collect static files (com variáveis dummy para build)
RUN SECRET_KEY="dummy-key-for-build" DATABASE_URL="" REDIS_URL="" python manage.py collectstatic --noinput

# Expose port
EXPOSE 8000

# Set entrypoint
ENTRYPOINT ["/app/entrypoint.sh"]

# Default command (can be overridden in docker-compose)
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "config.asgi:application"]
