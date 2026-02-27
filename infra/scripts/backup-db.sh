#!/bin/bash
# ───────────────────────────────────────────────────────────────
# BACKBONE — Database Backup Script
# Performs a pg_dump from the docker container and rotates files.
# ───────────────────────────────────────────────────────────────

# Configurations
BACKUP_DIR="./infra/backups"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
RETENTION_DAYS=7
CONTAINER_NAME="backbone_db"
DB_USER=${POSTGRES_USER:-postgres}
DB_NAME=${POSTGRES_DB:-backbone}

mkdir -p $BACKUP_DIR

echo "Starting backup of $DB_NAME at $TIMESTAMP..."

# Execute pg_dump inside the container
docker exec $CONTAINER_NAME pg_dump -U $DB_USER $DB_NAME > "$BACKUP_DIR/backup_$TIMESTAMP.sql"

if [ $? -eq 0 ]; then
    echo "Backup successful: $BACKUP_DIR/backup_$TIMESTAMP.sql"
    # Compress the backup
    gzip "$BACKUP_DIR/backup_$TIMESTAMP.sql"
    
    # Cleanup old backups
    echo "Cleaning up backups older than $RETENTION_DAYS days..."
    find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete
    
    echo "Cleanup complete."
else
    echo "ERROR: Backup failed!"
    exit 1
fi
