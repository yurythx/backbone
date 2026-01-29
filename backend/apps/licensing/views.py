from rest_framework import viewsets, permissions
from .models import Feature, Plan, License
from .serializers import FeatureSerializer, PlanSerializer, LicenseSerializer

class FeatureViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Lista features disponíveis (apenas leitura para usuários).
    """
    queryset = Feature.objects.all().order_by('id')
    serializer_class = FeatureSerializer
    permission_classes = [permissions.IsAuthenticated]

class PlanViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Lista planos disponíveis (apenas leitura para usuários).
    """
    queryset = Plan.objects.all().order_by('price')
    serializer_class = PlanSerializer
    permission_classes = [permissions.IsAuthenticated]

class LicenseViewSet(viewsets.ModelViewSet):
    """
    Gerencia a licença do tenant atual.
    """
    serializer_class = LicenseSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Retorna apenas a licença da empresa atual
        return License.objects.filter(company=self.request.company).order_by('-start_date')

    def perform_create(self, serializer):
        # Associa automaticamente à empresa do contexto
        serializer.save(company=self.request.company)
