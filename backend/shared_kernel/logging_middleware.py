import logging
import uuid

logger = logging.getLogger('django.request')


class StructuredLoggingMiddleware:
    """
    Middleware para adicionar Request ID e contexto do usuário a cada log.
    Compatível com Sentry SDK v1 e v2.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Generate Request ID
        request_id = request.headers.get('X-Request-ID', str(uuid.uuid4()))
        request.request_id = request_id

        # Add context to Sentry if SDK is installed
        # — Compatible with both SDK v1 (configure_scope) and v2 (set_tag/set_user)
        try:
            import sentry_sdk
            sentry_sdk.set_tag("request_id", request_id)
            if hasattr(request, 'company') and request.company:
                sentry_sdk.set_tag("company", request.company.slug)
            if hasattr(request, 'user') and getattr(request.user, 'is_authenticated', False):
                sentry_sdk.set_user({
                    "id": request.user.id,
                    "username": request.user.username,
                })
        except Exception:
            # Never let Sentry instrumentation break the request pipeline
            pass

        response = self.get_response(request)

        # Expose request ID in response header for client-side correlation
        response['X-Request-ID'] = request_id

        return response

