from django.http import JsonResponse
from django.db import connection
from django.conf import settings
from django_redis import get_redis_connection
import boto3
from botocore.exceptions import ClientError
from celery import current_app
import time


def health_check(request):
    """
    Comprehensive health check for all critical services.
    Returns 200 if all services are healthy, 503 if any fails.
    """
    start_time = time.time()
    
    health = {
        'status': 'healthy',
        'timestamp': time.time(),
        'services': {}
    }
    
    all_healthy = True
    
    # 1. Check PostgreSQL
    db_status = check_database()
    health['services']['database'] = db_status
    if db_status['status'] != 'healthy':
        all_healthy = False
    
    # 2. Check Redis
    redis_status = check_redis()
    health['services']['redis'] = redis_status
    if redis_status['status'] != 'healthy':
        all_healthy = False
    
    # 3. Check MinIO/S3 (if enabled)
    if getattr(settings, 'USE_S3', False):
        minio_status = check_minio()
        health['services']['minio'] = minio_status
        if minio_status['status'] != 'healthy':
            all_healthy = False
    
    # 4. Check Celery (if configured)
    celery_status = check_celery()
    health['services']['celery'] = celery_status
    if celery_status['status'] != 'healthy':
        # Celery warning, not critical
        health['status'] = 'degraded' if all_healthy else 'unhealthy'
    
    # Set overall status
    if not all_healthy:
        health['status'] = 'unhealthy'
    
    # Response time
    health['response_time_ms'] = round((time.time() - start_time) * 1000, 2)
    
    # HTTP status code
    if health['status'] == 'healthy':
        status_code = 200
    elif health['status'] == 'degraded':
        status_code = 200  # Still operational
    else:
        status_code = 503  # Service Unavailable
    
    return JsonResponse(health, status=status_code)


def check_database():
    """Check PostgreSQL connection and responsiveness"""
    try:
        start = time.time()
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            result = cursor.fetchone()
        
        response_time = round((time.time() - start) * 1000, 2)
        
        return {
            'status': 'healthy',
            'response_time_ms': response_time,
            'type': connection.settings_dict.get('ENGINE', 'unknown')
        }
    except Exception as e:
        return {
            'status': 'unhealthy',
            'error': str(e),
            'type': 'database'
        }


def check_redis():
    """Check Redis connection and responsiveness"""
    try:
        start = time.time()
        conn = get_redis_connection("default")
        result = conn.ping()
        response_time = round((time.time() - start) * 1000, 2)
        
        # Get some stats
        info = conn.info()
        
        return {
            'status': 'healthy',
            'response_time_ms': response_time,
            'connected_clients': info.get('connected_clients', 'unknown'),
            'used_memory_human': info.get('used_memory_human', 'unknown')
        }
    except Exception as e:
        return {
            'status': 'unhealthy',
            'error': str(e),
            'type': 'redis'
        }


def check_minio():
    """Check MinIO/S3 connection and bucket access"""
    try:
        start = time.time()
        
        # Create S3 client
        s3_client = boto3.client(
            's3',
            endpoint_url=settings.AWS_S3_ENDPOINT_URL,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME
        )
        
        # Check if bucket exists
        bucket_name = settings.AWS_STORAGE_BUCKET_NAME
        s3_client.head_bucket(Bucket=bucket_name)
        
        response_time = round((time.time() - start) * 1000, 2)
        
        return {
            'status': 'healthy',
            'response_time_ms': response_time,
            'bucket': bucket_name,
            'endpoint': settings.AWS_S3_ENDPOINT_URL
        }
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', 'Unknown')
        return {
            'status': 'unhealthy',
            'error': f"MinIO Error: {error_code}",
            'type': 'minio'
        }
    except Exception as e:
        return {
            'status': 'unhealthy',
            'error': str(e),
            'type': 'minio'
        }


def check_celery():
    """Check Celery worker status"""
    try:
        # Get active workers
        inspect = current_app.control.inspect()
        active_workers = inspect.active()
        
        if active_workers:
            worker_count = len(active_workers)
            return {
                'status': 'healthy',
                'workers': worker_count,
                'worker_names': list(active_workers.keys())
            }
        else:
            return {
                'status': 'warning',
                'message': 'No active Celery workers found',
                'workers': 0
            }
    except Exception as e:
        return {
            'status': 'warning',
            'error': str(e),
            'message': 'Celery check failed (non-critical)'
        }
