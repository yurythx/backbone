import logging

class StructuredLoggingMiddleware:
    """
    Middleware para adicionar contexto do tenant e usuário aos logs.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        
        # Log simplíssimo para debug
        status = response.status_code
        method = request.method
        path = request.path
        
        import sys
        sys.stderr.write(f"DEBUG: Request {method} {path} returned {status}\n")
        
        return response
