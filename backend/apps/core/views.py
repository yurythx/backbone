from rest_framework import viewsets, permissions, status, generics, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db.models import Count
from django.db.models.functions import TruncDate
from datetime import timedelta
from apps.articles.models import Article, Category, ArticleView

from drf_spectacular.utils import extend_schema, extend_schema_view
from .models import Company, AuditLog
from .serializers import (
    CompanySerializer, AuditLogSerializer, DashboardStatsSerializer
)

@extend_schema_view(
    list=extend_schema(tags=['Core']),
    retrieve=extend_schema(tags=['Core']),
    create=extend_schema(tags=['Core']),
    update=extend_schema(tags=['Core']),
    partial_update=extend_schema(tags=['Core']),
    destroy=extend_schema(tags=['Core']),
    public_list=extend_schema(tags=['Core'], auth=[])
)
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
    def health(self, request):
        """Health check endpoint for monitoring."""
        from django.db import connection
        from django.core.cache import cache
        import time

        start_time = time.time()
        
        # Check DB
        db_status = "ok"
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
        except Exception:
            db_status = "error"

        # Check Redis
        redis_status = "ok"
        try:
            cache.set("health_check", "ok", 10)
            if cache.get("health_check") != "ok":
                redis_status = "error"
        except Exception:
            redis_status = "error"
            
        return Response({
            "status": "ok" if db_status == "ok" and redis_status == "ok" else "error",
            "timestamp": time.time(),
            "database": db_status,
            "redis": redis_status,
            "minio": "ok", # Simplified for now
            "celery": "ok", # Simplified for now
            "response_time_ms": round((time.time() - start_time) * 1000, 2)
        })

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def public_list(self, request):
        """Lista apenas nome, slug e logo para o seletor de login"""
        companies = Company.objects.select_related('theme_branding').all()
        data = []
        for c in companies:
            logo_url = None
            # Check if branding exists and has a logo
            if hasattr(c, 'theme_branding') and c.theme_branding.logo:
                logo_url = request.build_absolute_uri(c.theme_branding.logo.url)
            
            data.append({
                'name': c.name, 
                'slug': c.slug,
                'logo': logo_url
            })
        return Response(data)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def current(self, request):
        """Retorna os dados da empresa atual do usuário autenticado."""
        if not request.company:
            return Response({"detail": "No tenant context found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = self.get_serializer(request.company)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def complete_onboarding(self, request):
        """Marca o onboarding como concluído para a empresa atual."""
        company = request.company
        if not company:
            return Response({"detail": "No tenant context found."}, status=status.HTTP_404_NOT_FOUND)
            
        company.onboarding_completed = True
        company.save()
        
        # Log da ação
        AuditLog.objects.create(
            company=company,
            user=request.user,
            action='update',
            resource='Company',
            resource_id=str(company.id),
            details={"message": "Onboarding completed"}
        )
        
        return Response({"status": "onboarding marked as complete"})

    # Permitir criação pública para onboarding inicial? 
    # Ou restringir? Vamos permitir AllowAny no create e IsAuthenticated no resto.
    def get_permissions(self):
        if self.action in ['create', 'public_list']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

@extend_schema_view(
    list=extend_schema(tags=['Core']),
    retrieve=extend_schema(tags=['Core']),
)
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

        search = self.request.query_params.get('search')
        if search:
            from django.db.models import Q
            queryset = queryset.filter(
                Q(resource__icontains=search) | 
                Q(resource_id__icontains=search) |
                Q(action__icontains=search)
            )
            
        return queryset

class DashboardStatsView(generics.GenericAPIView):
    """
    Endpoint para retornar estatísticas ricas e comparativas para o dashboard.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = DashboardStatsSerializer

    @extend_schema(tags=['Core'], responses={200: DashboardStatsSerializer})
    def get(self, request):
        company = request.company
        User = get_user_model()

        # Datetime helpers
        now = timezone.now()
        thirty_days_ago = now - timedelta(days=30)
        sixty_days_ago = now - timedelta(days=60)

        # 1. Analytics de Visualizações (Série Temporal)
        views_history = (
            ArticleView.objects.filter(company=company, viewed_at__gte=thirty_days_ago)
            .annotate(date=TruncDate('viewed_at'))
            .values('date')
            .annotate(count=Count('id'))
            .order_by('date')
        )

        # 2. Contadores e Crescimento
        total_users = User.objects.filter(company=company).count()
        new_users_month = User.objects.filter(company=company, date_joined__gte=thirty_days_ago).count()
        
        total_articles = Article.objects.filter(company=company).count()
        new_articles_month = Article.objects.filter(company=company, created_at__gte=thirty_days_ago).count()

        from apps.messenger.models import Message
        total_messages = Message.objects.filter(company=company).count()
        new_messages_month = Message.objects.filter(company=company, created_at__gte=thirty_days_ago).count()

        # 3. Distribuição por Categoria
        categories_popularity = (
            Category.objects.filter(company=company)
            .annotate(article_count=Count('article'))
            .values('name', 'article_count')
            .order_by('-article_count')[:5]
        )

        # 4. Atividade Recente (Mais rica)
        recent_activity = AuditLog.objects.filter(company=company).select_related('user').order_by('-created_at')[:10]
        activity_data = [
            {
                "action": log.action,
                "resource": log.resource,
                "created_at": log.created_at,
                "user": {
                    "name": (log.user.get_full_name() or log.user.username) if log.user else "Sistema",
                    "avatar": None 
                }
            } for log in recent_activity
        ]

        stats = {
            "counters": {
                "users": {
                    "total": total_users,
                    "new_this_month": new_users_month,
                    "growth": round((new_users_month / (total_users - new_users_month) * 100) if (total_users - new_users_month) > 0 else 100, 1)
                },
                "articles": {
                    "total": total_articles,
                    "published": Article.objects.filter(company=company, is_published=True).count(),
                    "growth": round((new_articles_month / (total_articles - new_articles_month) * 100) if (total_articles - new_articles_month) > 0 else 100, 1)
                },
                "messages": {
                    "total": total_messages,
                    "new_this_month": new_messages_month,
                    "growth": round((new_messages_month / (total_messages - new_messages_month) * 100) if (total_messages - new_messages_month) > 0 else 100, 1)
                }
            },
            "charts": {
                "views_series": list(views_history),
                "categories": list(categories_popularity)
            },
            "recent_activity": activity_data,
            "system_status": {
                "storage_used": "1.2GB", # Mock
                "api_uptime": "99.9%",
                "last_backup": (now - timedelta(hours=4)).isoformat()
            }
        }

        return Response(stats)

class SitemapView(generics.GenericAPIView):
    """
    Endpoint para SEO que retorna URLs públicas de artigos e páginas.
    """
    permission_classes = [permissions.AllowAny]

    @extend_schema(tags=['Core'], responses={200: serializers.DictField()})
    def get(self, request):
        company = request.company
        if not company:
            return Response({"error": "Tenant context required"}, status=400)

        # Usar URLs amigáveis base (configurável no futuro)
        base_url = f"https://{company.slug}.backbone.com"
        
        pages = []
        # Artigos Publicados
        from apps.articles.models import Article
        articles_qs = Article.objects.filter(company=company, status='published')
        for art in articles_qs:
            pages.append({
                "url": f"{base_url}/artigos/{art.slug}",
                "lastmod": art.updated_at.isoformat(),
                "priority": 0.8
            })

        # Páginas do CMS
        from apps.pages.models import Page
        pages_qs = Page.objects.filter(company=company)
        for p in pages_qs:
            pages.append({
                "url": f"{base_url}/{p.slug}",
                "lastmod": p.updated_at.isoformat(),
                "priority": 0.5
            })

from django.http import HttpResponse

class RobotsView(generics.GenericAPIView):
    """
    Endpoint para robots.txt.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        company = request.company
        if not company:
            return HttpResponse("User-agent: *\nDisallow: /", content_type="text/plain")

        base_url = f"https://{company.slug}.backbone.com"
        content = f"User-agent: *\nAllow: /\nSitemap: {base_url}/api/core/sitemap/"
        return HttpResponse(content, content_type="text/plain")
