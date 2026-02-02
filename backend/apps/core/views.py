from rest_framework import viewsets, permissions, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db.models import Count
from django.db.models.functions import TruncDate
from datetime import timedelta
from apps.articles.models import Article, Category, ArticleView

from .models import Company, AuditLog
from .serializers import CompanySerializer, AuditLogSerializer

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

class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Visualização dos logs de auditoria do tenant.
    Apenas leitura para garantir integridade.
    """
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = AuditLog.objects.all().order_by('-created_at')
        
        # Filtros básicos via query params
        user_id = self.request.query_params.get('user')
        if user_id:
            queryset = queryset.filter(user_id=user_id)
            
        action = self.request.query_params.get('action')
        if action:
            queryset = queryset.filter(action=action)
            
        return queryset

class DashboardStatsView(generics.GenericAPIView):
    """
    Endpoint para retornar estatísticas rápidas para o dashboard.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        company = request.company
        User = get_user_model()

        # Analytics: Views per day (last 30 days)
        thirty_days_ago = timezone.now() - timedelta(days=30)
        views_history = (
            ArticleView.objects.filter(company=company, viewed_at__gte=thirty_days_ago)
            .annotate(date=TruncDate('viewed_at'))
            .values('date')
            .annotate(count=Count('id'))
            .order_by('date')
        )

        stats = {
            "total_users": User.objects.filter(company=company).count(),
            "total_articles": Article.objects.filter(company=company).count(),
            "published_articles": Article.objects.filter(company=company, is_published=True).count(),
            "total_categories": Category.objects.filter(company=company).count(),
            "views_history": list(views_history),
            "recent_activity": AuditLog.objects.filter(company=company).order_by('-created_at')[:10].values(
                'action', 'resource', 'created_at', 'user__first_name'
            )
        }

        return Response(stats)
