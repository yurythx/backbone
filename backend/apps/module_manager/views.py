from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import Module, TenantModule
from .serializers import ModuleSerializer, TenantModuleSerializer
from shared_kernel.cache import tenant_cached, invalidate_tenant_cache

class ModuleViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Lista todos os módulos disponíveis no sistema.
    """
    queryset = Module.objects.all().order_by('name')
    serializer_class = ModuleSerializer
    permission_classes = [permissions.AllowAny]

from config.pagination import DefaultPagination

class TenantModuleViewSet(viewsets.ModelViewSet):
    """
    Gerencia os módulos ativados para o tenant atual.
    """
    serializer_class = TenantModuleSerializer
    pagination_class = DefaultPagination

    def get_authenticators(self):
        if self.action in ['list', 'retrieve']:
            return []
        return super().get_authenticators()

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            # Permitir que visitantes vejam quais módulos estão ativos para o portal
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    @tenant_cached(timeout=3600, key_prefix='modules')
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    def get_queryset(self):
        company = getattr(self.request, 'company', None)
        if not company:
            return TenantModule.objects.none()
        return TenantModule.objects.select_related('module').filter(company=company).order_by('module__name')

    def perform_create(self, serializer):
        serializer.save(company=self.request.company)
        invalidate_tenant_cache('modules', self.request.company.slug)

    def perform_update(self, serializer):
        serializer.save()
        invalidate_tenant_cache('modules', self.request.company.slug)

    # I-M1: invalidar cache também no destroy para evitar stale de até 1h
    def perform_destroy(self, instance):
        company_slug = self.request.company.slug
        instance.delete()
        invalidate_tenant_cache('modules', company_slug)

    @action(detail=False, methods=['post'], url_path='activate')
    def activate_module(self, request):
        """
        Endpoint conveniente para ativar um módulo pelo código.
        Body: { "module_code": "messenger" }
        """
        module_code = request.data.get('module_code')
        if not module_code:
            return Response({"error": "module_code required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            module = Module.objects.get(code=module_code)
        except Module.DoesNotExist:
            return Response({"error": "Module not found"}, status=status.HTTP_404_NOT_FOUND)

        tenant_module, created = TenantModule.objects.get_or_create(
            company=request.company,
            module=module,
            defaults={'is_active': True}
        )
        
        if not created and not tenant_module.is_active:
            tenant_module.is_active = True
            tenant_module.save()
        
        invalidate_tenant_cache('modules', request.company.slug)

        serializer = self.get_serializer(tenant_module)
        return Response(serializer.data, status=status.HTTP_200_OK)
