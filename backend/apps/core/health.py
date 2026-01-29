from django.http import JsonResponse
from django.db import connection
from django_redis import get_redis_connection

def health_check(request):
    """
    Sinais vitais da aplicação.
    Verifica DB e Redis.
    """
    health = {
        'status': 'ok',
        'database': 'unknown',
        'redis': 'unknown',
    }
    
    # Check Database
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            health['database'] = 'ok'
    except Exception as e:
        health['status'] = 'error'
        health['database'] = str(e)

    # Check Redis
    try:
        conn = get_redis_connection("default")
        conn.ping()
        health['redis'] = 'ok'
    except Exception as e:
        health['status'] = 'error'
        health['redis'] = str(e)
        
    status_code = 200 if health['status'] == 'ok' else 503
    return JsonResponse(health, status=status_code)
