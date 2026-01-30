from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
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
    
    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def public_list(self, request):
        """Lista apenas nome e slug para o seletor de login"""
        companies = Company.objects.all().only('name', 'slug')
        data = [{'name': c.name, 'slug': c.slug} for c in companies]
        return Response(data)

    # Permitir criação pública para onboarding inicial? 
    # Ou restringir? Vamos permitir AllowAny no create e IsAuthenticated no resto.
    def get_permissions(self):
        if self.action in ['create', 'public_list']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]
