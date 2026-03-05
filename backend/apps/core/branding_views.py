from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from shared_kernel.tenant_context import get_current_company
from .models import TenantBranding
from .serializers import TenantBrandingSerializer
from shared_kernel.cache import tenant_cached, invalidate_tenant_cache


class TenantBrandingViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciar branding da empresa (tenant).
    
    Endpoints:
    - GET /api/core/branding/ - Lista todas as configurações de branding (admin)
    - GET /api/core/branding/current/ - Obtém branding do tenant atual
    - PUT /api/core/branding/current/ - Atualiza branding do tenant atual (admin)
    - POST /api/core/branding/upload-logo/ - Upload de logo
    - POST /api/core/branding/upload-icon/ - Upload de ícone
    - GET /api/core/branding/palettes/ - Lista paletas disponíveis
    """
    queryset = TenantBranding.objects.all()
    serializer_class = TenantBrandingSerializer
    @tenant_cached(timeout=3600, key_prefix='branding')
    @action(detail=False, methods=['get'])
    def current(self, request):
        """Obtém branding do tenant atual (requer autenticação)"""
        return self._get_current_branding()

    @tenant_cached(timeout=3600, key_prefix='branding_public')
    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny], authentication_classes=[])
    def public_current(self, request):
        """Obtém branding do tenant atual (público)"""
        return self._get_current_branding()

    def _get_current_branding(self):
        company = get_current_company()
        if not company:
            # Fallback para branding do sistema (se não houver tenant identificado)
            return Response({
                'company_name': 'Backbone SaaS',
                'primary_color': '#000000',
                'secondary_color': '#ffffff',
                'logo': None,
                'icon': None,
                'theme_palette': 'slate-gray',
                'custom_css': ''
            })
        
        branding, created = TenantBranding.objects.get_or_create(
            company=company,
            defaults={
                'company_name': company.name,
                'theme_palette': 'django-green'
            }
        )
        
        serializer = self.get_serializer(branding)
        return Response(serializer.data)

    def get_permissions(self):
        if self.action in ['public_current', 'palettes']:
            return []
        return [IsAuthenticated()]
    
    @action(detail=False, methods=['put'])
    def update_current(self, request):
        """Atualiza branding do tenant atual (apenas admins)"""
        if not request.user.is_staff:
            return Response(
                {'error': 'Only admins can modify branding'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        company = get_current_company()
        if not company:
            return Response(
                {'error': 'No company context found'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        branding, created = TenantBranding.objects.get_or_create(
            company=company,
            defaults={'company_name': company.name}
        )
        
        serializer = self.get_serializer(branding, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            # Invalida o cache ao atualizar
            invalidate_tenant_cache('branding', company.slug)
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'], url_path='upload-logo')
    def upload_logo(self, request):
        """Upload de logo da empresa"""
        if not request.user.is_staff:
            return Response(
                {'error': 'Only admins can upload logo'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        company = get_current_company()
        if not company:
            return Response(
                {'error': 'No company context found'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        branding, created = TenantBranding.objects.get_or_create(
            company=company,
            defaults={'company_name': company.name}
        )
        
        if 'logo' not in request.FILES:
            return Response(
                {'error': 'No logo file provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        branding.logo = request.FILES['logo']
        branding.save()
        
        # Invalida o cache ao fazer upload
        invalidate_tenant_cache('branding', company.slug)
        
        serializer = self.get_serializer(branding)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'], url_path='upload-icon')
    def upload_icon(self, request):
        """Upload de ícone/favicon da empresa"""
        if not request.user.is_staff:
            return Response(
                {'error': 'Only admins can upload icon'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        company = get_current_company()
        if not company:
            return Response(
                {'error': 'No company context found'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        branding, created = TenantBranding.objects.get_or_create(
            company=company,
            defaults={'company_name': company.name}
        )
        
        if 'icon' not in request.FILES:
            return Response(
                {'error': 'No icon file provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        branding.icon = request.FILES['icon']
        branding.save()
        
        # Invalida o cache ao fazer upload
        invalidate_tenant_cache('branding', company.slug)
        
        serializer = self.get_serializer(branding)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get', 'put'])
    def email_config(self, request):
        """Gerencia configurações de SMTP do tenant atual"""
        if request.method == 'PUT' and not request.user.is_staff:
            return Response(
                {'error': 'Only admins can modify email config'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        company = get_current_company()
        from .models import TenantEmailConfig
        from .serializers import TenantEmailConfigSerializer
        
        config, created = TenantEmailConfig.objects.get_or_create(company=company)
        
        if request.method == 'PUT':
            serializer = TenantEmailConfigSerializer(config, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = TenantEmailConfigSerializer(config)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def test_smtp(self, request):
        """Testa as configurações de SMTP enviando um e-mail de teste"""
        if not request.user.is_staff:
            return Response(
                {'error': 'Only admins can test SMTP'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        company = get_current_company()
        from .models import TenantEmailConfig
        config = get_object_or_404(TenantEmailConfig, company=company)
        
        if not config.use_custom_smtp or not config.smtp_host:
            return Response(
                {'error': 'Custom SMTP is not configured or enabled'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            from django.core.mail import get_connection, EmailMessage
            
            connection = get_connection(
                host=config.smtp_host,
                port=config.smtp_port,
                username=config.smtp_user,
                password=config.get_smtp_password(),
                use_tls=config.smtp_use_tls

            )
            
            email = EmailMessage(
                subject=f'Teste de SMTP - {company.name}',
                body='Se você recebeu este e-mail, as configurações de SMTP do seu tenant estão funcionando corretamente!',
                from_email=config.from_email or settings.DEFAULT_FROM_EMAIL,
                to=[request.user.email],
                connection=connection
            )
            email.send()
            return Response({'message': 'E-mail de teste enviado com sucesso!'})
        except Exception as e:
            return Response({'error': f'Falha ao enviar e-mail: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny], authentication_classes=[])
    def palettes(self, request):
        """Lista paletas de cores disponíveis"""
        palettes = [
            {
                'code': 'django-green',
                'name': 'Django Green',
                'primary_color': '#0C4B33',
                'description': 'Paleta clássica do Django'
            },
            {
                'code': 'ocean-blue',
                'name': 'Ocean Blue',
                'primary_color': '#0369A1',
                'description': 'Azul mar profundo'
            },
            {
                'code': 'royal-purple',
                'name': 'Royal Purple',
                'primary_color': '#7C3AED',
                'description': 'Roxo real vibrante'
            },
            {
                'code': 'sunset-orange',
                'name': 'Sunset Orange',
                'primary_color': '#EA580C',
                'description': 'Laranja pôr do sol'
            },
            {
                'code': 'forest-green',
                'name': 'Forest Green',
                'primary_color': '#166534',
                'description': 'Verde floresta'
            },
            {
                'code': 'slate-gray',
                'name': 'Slate Gray',
                'primary_color': '#475569',
                'description': 'Cinza ardósia moderno'
            },
        ]
        return Response(palettes)
