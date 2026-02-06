#!/bin/sh

# Verify if postgres is ready
if [ "$DATABASE_URL" ]; then
    echo "Waiting for postgres..."
    while ! nc -z db 5432; do
      sleep 0.1
    done
    echo "PostgreSQL started"
fi

# Run migrations
echo "Running migrations..."
python manage.py migrate --noinput

# Collect static files (needed because volume mount overwrites build-time staticfiles)
echo "Collecting static files..."
python manage.py collectstatic --noinput

# Exec the container's main process
exec "$@"
