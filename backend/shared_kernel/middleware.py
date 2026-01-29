from shared_kernel.tenant_context import set_current_company
from apps.core.models import Company

class TenantMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        host = request.get_host().split(':')[0]
        # Assumindo subdomínio: tenant.dominio.com
        # Em dev localhost, pode-se usar um header X-Company-Slug para facilitar testes
        slug = None
        
        # 1. Tenta pegar pelo header (útil para testes/dev/mobile)
        if 'X-Company-Slug' in request.headers:
            slug = request.headers['X-Company-Slug']
        else:
            # 2. Tenta pegar pelo subdomínio
            parts = host.split('.')
            if len(parts) > 1:
                # Ex: tenant.localhost ou tenant.site.com
                slug = parts[0]
        
        if slug:
            company = Company.objects.filter(slug=slug).first()
            if company:
                set_current_company(company)
                request.company = company
            else:
                request.company = None
        else:
            request.company = None

        response = self.get_response(request)
        return response
