from rest_framework import authentication, exceptions
from django.utils import timezone
from .models import APIKey

class APIKeyAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        api_key_header = request.headers.get('X-API-Key')
        auth_header = request.headers.get('Authorization')
        
        raw_api_key = None
        if api_key_header:
            raw_api_key = api_key_header
        elif auth_header and auth_header.startswith('Bearer '):
            raw_api_key = auth_header.split(' ')[1]
            
        if not raw_api_key:
            return None

        if '.' not in raw_api_key:
            return None
            
        prefix, key = raw_api_key.split('.', 1)
        
        try:
            api_key_obj = APIKey.objects.get(prefix=prefix, is_active=True)
        except APIKey.DoesNotExist:
            raise exceptions.AuthenticationFailed('Chave de API inválida ou inativa.')

        if not api_key_obj.is_valid():
            raise exceptions.AuthenticationFailed('Esta chave de API expirou.')

        if not api_key_obj.verify_key(key):
            raise exceptions.AuthenticationFailed('Chave de API incorreta.')

        # Update usage metadata
        api_key_obj.last_used_at = timezone.now()
        api_key_obj.save(update_fields=['last_used_at'])

        # Set company in request for TenantMiddleware (if not already set)
        # However, TenantMiddleware usually runs before Auth.
        # So we ensure request.company is correctly set here too.
        request.company = api_key_obj.company
        
        # We return a user and the auth object. 
        # For Public API, we use the owner of the key as the user.
        return (api_key_obj.company.slug, api_key_obj) # Returning company slug as 'user' for now, or a real user
