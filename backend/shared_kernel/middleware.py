from shared_kernel.tenant_context import set_current_company

class TenantMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        from apps.core.models import Company
        if request.path.startswith('/health/'):
            set_current_company(None)
            request.company = None
            return self.get_response(request)
        host = request.get_host().split(':')[0]
        slug = None
        company = None
        
        # 1. Tenta pegar pelo header (dev/mobile/testes)
        slug_header = request.headers.get('x-company-slug') or request.headers.get('X-Company-Slug')
        if slug_header:
            company = Company.objects.filter(slug=slug_header).first()

        # 1.5. Tenta pegar por Query Param (útil para debug/testes)
        if not company:
            slug_query = request.GET.get('company_slug')
            if slug_query:
                company = Company.objects.filter(slug=slug_query).first()

        # 2. Se não achou pelo header, tenta pelo Domínio Customizado (Prioridade sobre subdomínio)
        if not company:
            # Procura exato pelo domínio (ex: minhaempresa.com)
            company = Company.objects.filter(domain__iexact=host).first()

        # 3. Se não achou pelo domínio, tenta pelo subdomínio
        if not company:
            parts = host.split('.')
            if len(parts) > 1:
                # Ex: tenant.localhost ou tenant.site.com
                # Cuidado para não pegar 'www' como tenant se for o domínio principal, 
                # mas aqui assumimos que www poderia ser um tenant ou tratado via DNS
                slug = parts[0]
                company = Company.objects.filter(slug=slug).first()

        if company:
            set_current_company(company)
            request.company = company
        else:
            request.company = None

        response = self.get_response(request)
        return response
