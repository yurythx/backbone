import logging
from apps.core.models import AuditLog
from shared_kernel.tenant_context import get_current_company

logger = logging.getLogger(__name__)

def log_action(user, action, resource, resource_id=None, details=None, request=None):
    """
    Grava um log de auditoria no banco de dados.
    """
    try:
        company = None
        if request:
            company = getattr(request, 'company', None)
        if not company:
            company = get_current_company()

        if not company:
            logger.warning(f"Tentativa de log sem empresa definida: {action} em {resource}")
            return None

        ip_address = None
        if request and hasattr(request, 'META'):
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            if x_forwarded_for:
                ip_address = x_forwarded_for.split(',')[0]
            else:
                ip_address = request.META.get('REMOTE_ADDR')

        log_entry = AuditLog.objects.create(
            company=company,
            user=user if user and user.is_authenticated else None,
            action=action,
            resource=resource,
            resource_id=str(resource_id) if resource_id else None,
            details=details or {},
            ip_address=ip_address
        )
        return log_entry
    except Exception as e:
        logger.error(f"Erro ao gravar log de auditoria: {str(e)}")
        return None

def log_create(user, resource, obj, request=None):
    if request is None:
        from types import SimpleNamespace
        request = SimpleNamespace(company=getattr(obj, 'company', None))
    return log_action(user, 'create', resource, getattr(obj, 'pk', None), details={'name': str(obj)}, request=request)

def log_update(user, resource, obj, request=None, changes=None):
    if request is None:
        from types import SimpleNamespace
        request = SimpleNamespace(company=getattr(obj, 'company', None))
    return log_action(user, 'update', resource, getattr(obj, 'pk', None), details=changes or {'name': str(obj)}, request=request)

def log_delete(user, resource, obj, request=None):
    if request is None:
        from types import SimpleNamespace
        request = SimpleNamespace(company=getattr(obj, 'company', None))
    return log_action(user, 'delete', resource, getattr(obj, 'pk', None), details={'name': str(obj)}, request=request)
