from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from apps.articles.models import Article
from .models import Feature, Plan, License, PlanFeature
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
        serializer.save(company=self.request.company)

    @action(detail=False, methods=['get'])
    def usage(self, request):
        """
        Calcula o consumo atual vs limites do plano.
        """
        company = request.company
        User = get_user_model()
        
        # Get active license
        active_license = License.objects.filter(company=company, is_active=True).first()
        if not active_license:
            return Response({"error": "No active license"}, status=400)
            
        plan_features = PlanFeature.objects.filter(plan=active_license.plan).select_related('feature')
        limits = {pf.feature.code: pf.value for pf in plan_features}
        
        # Calculate current usage
        usage = {
            "users": {
                "current": User.objects.filter(company=company).count(),
                "limit": int(limits.get('max_users', 0)) if limits.get('max_users') != 'unlimited' else -1,
                "label": "Users"
            },
            "articles": {
                "current": Article.objects.filter(company=company).count(),
                "limit": int(limits.get('max_articles', 0)) if limits.get('max_articles') != 'unlimited' else -1,
                "label": "Articles"
            },
            "storage_mb": {
                "current": 450, # Placeholder until we implement proper storage tracking
                "limit": int(limits.get('storage_limit_mb', 0)) if limits.get('storage_limit_mb') != 'unlimited' else -1,
                "label": "Storage (MB)"
            }
        }
        
        return Response({
            "plan": active_license.plan.name,
            "usage": usage,
            "limits": limits
        })
