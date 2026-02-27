from django.db import models
from shared_kernel.tenant_context import set_current_company

class TenantMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        from apps.core.models import Company
        from django.core.cache import caches
        from django.conf import settings
        
        # Disable cache in tests to avoid stale ID issues between test runs
        use_cache = not getattr(settings, 'TESTING', False)
        cache = caches['tenants'] if use_cache else None
        
        if request.path.startswith('/api/core/health/') or request.path.startswith('/health/'):
            set_current_company(None)
            request.company = None
            return self.get_response(request)

        host = request.get_host().split(':')[0]
        company = None
        
        # 1. Tenta pegar pelo header (dev/mobile/testes)
        slug_header = request.headers.get('x-company-slug') or request.headers.get('X-Company-Slug')
        
        # 1.5. Tenta pegar por Query Param (útil para debug/testes)
        slug_query = request.GET.get('company_slug')
        
        slug = slug_header or slug_query
        
        def set_company_in_cache(c, key):
            # Armazena apenas dados essenciais para reconstruir o objeto básico
            # Evita serializar o objeto completo do Django (detalhes de conexão ao DB)
            data = {'id': str(c.id), 'slug': c.slug, 'name': c.name}
            cache.set(key, data, timeout=3600)

        def get_company_from_cache(key):
            data = cache.get(key)
            if data:
                # Retorna uma instância "rasa" apenas com ID e slug para o middleware
                return Company(id=data['id'], slug=data['slug'], name=data['name'])
            return None

        if slug:
            cache_key = f"company_slug:{slug}"
            company = get_company_from_cache(cache_key) if use_cache else None
            if not company:
                company = Company.objects.filter(slug=slug).first()
                if company and use_cache:
                    set_company_in_cache(company, cache_key)

        # 2. Se não achou pelo slug, tenta pelo Host (Domínio Customizado)
        if not company:
            cache_key_host = f"company_host:{host}"
            company = get_company_from_cache(cache_key_host) if use_cache else None
            if not company:
                # Procura exato pelo domínio (ex: minhaempresa.com)
                company = Company.objects.filter(models.Q(domain__iexact=host)).first()
                
                # 3. Se não achou pelo domínio exato, tenta pelo subdomínio
                if not company:
                    parts = host.split('.')
                    if len(parts) > 1:
                        sub_slug = parts[0]
                        company = Company.objects.filter(slug=sub_slug).first()
                
                if company and use_cache:
                    set_company_in_cache(company, cache_key_host)

        if company:
            set_current_company(company)
            request.company = company
        else:
            request.company = None

        response = self.get_response(request)
        return response

class TenantSecurityMiddleware:
    """
    Ensures that the authenticated user belongs to the requested tenant (company).
    Must be placed AFTER AuthenticationMiddleware and TenantMiddleware.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        from django.http import JsonResponse

        # Skip for unauthenticated users or if no company context
        if not request.user.is_authenticated or not hasattr(request, 'company') or not request.company:
            return self.get_response(request)

        # Superusers and Staff can access any tenant (for support/admin purposes)
        if request.user.is_superuser or request.user.is_staff:
            return self.get_response(request)

        # Guard: user may have no company (created via shell, incomplete onboarding, etc.)
        user_company_id = getattr(request.user, 'company_id', None)
        if not user_company_id:
            return self.get_response(request)

        # Compare IDs only — avoids extra DB hit and instance-comparison bugs
        if user_company_id != request.company.id:
            # Lazy-load slug only for the error message, not for comparison
            try:
                user_slug = request.user.company.slug
            except Exception:
                user_slug = str(user_company_id)

            return JsonResponse(
                {
                    "error": "Cross-Tenant Access Denied",
                    "message": (
                        f"You belong to '{user_slug}' but are trying to access "
                        f"'{request.company.slug}'."
                    ),
                },
                status=403,
            )

        return self.get_response(request)


class LicensingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        from django.http import JsonResponse
        from apps.licensing.utils import check_feature_permission
        
        # Pula se não houver empresa no contexto (ex: rotas administrativas ou de saúde)
        if not hasattr(request, 'company') or not request.company:
            return self.get_response(request)
            
        path = request.path
        
        # Mapeamento de caminhos protegidos para códigos de feature
        restrictions = {
            '/api/ai/': 'ai_access',
            '/api/api-keys/': 'api_access',
            '/api/webhooks/': 'api_access',
        }
        
        for restricted_path, feature_code in restrictions.items():
            if path.startswith(restricted_path):
                if not check_feature_permission(request.company, feature_code):
                    return JsonResponse(
                        {
                            "error": "Recurso premium bloqueado.",
                            "feature": feature_code,
                            "message": f"Seu plano atual não permite acesso a '{feature_code}'. Faça um upgrade para continuar."
                        },
                        status=403
                    )
        
        return self.get_response(request)

