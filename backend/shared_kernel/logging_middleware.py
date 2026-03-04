import logging
import uuid

logger = logging.getLogger('django.request')

# S8: Headers that must NEVER appear in logs in plain text.
_SENSITIVE_HEADERS = frozenset([
    'authorization',
    'cookie',
    'x-api-key',
    'proxy-authorization',
])


def _sanitize_headers(headers: dict) -> dict:
    """
    Returns a copy of `headers` with sensitive values redacted.
    Preserves the auth scheme (e.g., 'Bearer') for diagnostics without leaking tokens.
    """
    safe = {}
    for key, value in headers.items():
        lower_key = key.lower()
        if lower_key in _SENSITIVE_HEADERS:
            if lower_key == 'authorization' and ' ' in value:
                scheme = value.split(' ', 1)[0]  # e.g. "Bearer"
                safe[key] = f"{scheme} [REDACTED]"
            else:
                safe[key] = '[REDACTED]'
        else:
            safe[key] = value
    return safe


class StructuredLoggingMiddleware:
    """
    Middleware to add Request ID and user context to every log entry.
    Compatible with Sentry SDK v1 and v2.

    SECURITY: Authorization and Cookie headers are always redacted before logging.
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
                    # S8: Never include email or other PII in Sentry user context
                })
        except Exception:
            # Never let Sentry instrumentation break the request pipeline
            pass

        response = self.get_response(request)

        # Expose request ID in response header for client-side correlation
        response['X-Request-ID'] = request_id

        return response
