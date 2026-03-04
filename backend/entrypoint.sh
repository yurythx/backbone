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
python manage.py migrate --noinput || python manage.py migrate --noinput --fake-initial

# Collect static files
echo "Cleaning old static files..."
rm -rf /app/staticfiles/*
echo "Collecting static files..."
python manage.py collectstatic --noinput --clear

# Exec the container's main process
exec "$@"
