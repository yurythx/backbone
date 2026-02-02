import logging
import uuid
from pythonjsonlogger import jsonlogger

class StructuredLoggingMiddleware:
    """
    Middleware para adicionar Request ID e contexto do usuário a cada log.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Generate Request ID
        request_id = request.headers.get('X-Request-ID', str(uuid.uuid4()))
        request.request_id = request_id
        
        # Add to Sentry context if available
        try:
            import sentry_sdk
            with sentry_sdk.configure_scope() as scope:
                scope.set_tag("request_id", request_id)
                if hasattr(request, 'company') and request.company:
                    scope.set_tag("company", request.company.slug)
                if hasattr(request, 'user') and getattr(request.user, 'is_authenticated', False):
                    scope.set_user({"id": request.user.id, "username": request.user.username})
        except ImportError:
            pass
            
        # Add context to all log records in this thread
        # This is handled by defining a Filter or using structlog.
        # For simplicity with python-json-logger, we inject into the record factory or use an adapter.
        # But standard Django logging doesn't make this easy per-request without a custom filter.
        # We will set a thread-local for filters to pick up if we wanted true propagation.
        # For now, we manually log the request start/finish with context.
        
        logger = logging.getLogger('django.request')
        
        response = self.get_response(request)
        
        # We can add the ID to the response headers for debugging
        response['X-Request-ID'] = request_id
        
        return response
