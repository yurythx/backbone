import logging
from shared_kernel.tenant_context import get_current_company

class StructuredLoggingMiddleware:
    """
    Middleware para adicionar contexto do tenant e usuário aos logs.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        
        # Log estruturado simplificado (para console)
        # Em produção, idealmente usaria structlog ou similar para JSON output
        company = getattr(request, 'company', None)
        user = getattr(request, 'user', None)
        
        company_slug = company.slug if company else 'public'
        user_id = user.id if user and user.is_authenticated else 'anon'
        
        method = request.method
        path = request.path
        status = response.status_code
        
        # Formato: [TENANT] [USER] METHOD PATH STATUS
        # Ex: [blackbone] [user_1] GET /api/articles/ 200
        logger = logging.getLogger('django.request')
        
        log_message = f"[{company_slug}] [{user_id}] {method} {path} {status}"
        
        if status >= 500:
            logger.error(log_message)
        elif status >= 400:
            logger.warning(log_message)
        else:
            logger.info(log_message)
            
        return response
