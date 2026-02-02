from django.core.cache import cache
from functools import wraps
from rest_framework.response import Response
from shared_kernel.tenant_context import get_current_company

def tenant_cached(timeout=3600, key_prefix=''):
    """
    Decorator to cache response data per tenant.
    """
    def decorator(func):
        @wraps(func)
        def wrapper(self, request, *args, **kwargs):
            company = get_current_company()
            if not company:
                return func(self, request, *args, **kwargs)
            
            # Create a unique key for this view, action, and tenant
            cache_key = f"{key_prefix}:{func.__name__}:{company.slug}"
            
            cached_data = cache.get(cache_key)
            if cached_data is not None:
                if isinstance(cached_data, (dict, list)):
                    return Response(cached_data)
                return cached_data

            response = func(self, request, *args, **kwargs)
            
            # Only cache successful responses
            if hasattr(response, 'status_code') and response.status_code == 200:
                cache.set(cache_key, response.data, timeout)
            
            return response
        return wrapper
    return decorator

def invalidate_tenant_cache(key_prefix, company_slug):
    """
    Invalidates all keys for a specific tenant and prefix.
    Note: In a real production scenario with many keys, 
    we might need a more efficient way to invalidate by pattern.
    """
    # This is a simplified version. django-redis supports cache.delete_pattern()
    if hasattr(cache, 'delete_pattern'):
        cache.delete_pattern(f"*{key_prefix}*:{company_slug}*")

