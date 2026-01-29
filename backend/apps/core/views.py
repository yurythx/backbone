from rest_framework import viewsets, permissions
from .models import Company
from .serializers import CompanySerializer

class CompanyViewSet(viewsets.ModelViewSet):
    """
    CRUD de Empresas.
    Em um cenário real, a criação de empresas pode ser restrita a superadmins
    ou via fluxo de pagamento. Aqui deixamos aberto para facilitar o setup.
    """
    queryset = Company.objects.all().order_by('name')
    serializer_class = CompanySerializer
    lookup_field = 'slug'
    
    # Permitir criação pública para onboarding inicial? 
    # Ou restringir? Vamos permitir AllowAny no create e IsAuthenticated no resto.
    def get_permissions(self):
        if self.action == 'create':
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]
