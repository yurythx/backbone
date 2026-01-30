from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import Module, TenantModule
from .serializers import ModuleSerializer, TenantModuleSerializer

class ModuleViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Lista todos os módulos disponíveis no sistema.
    """
    queryset = Module.objects.all().order_by('name')
    serializer_class = ModuleSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

class TenantModuleViewSet(viewsets.ModelViewSet):
    """
    Gerencia os módulos ativados para o tenant atual.
    """
    serializer_class = TenantModuleSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return TenantModule.objects.filter(company=self.request.company).order_by('module__name')

    def perform_create(self, serializer):
        serializer.save(company=self.request.company)

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

        serializer = self.get_serializer(tenant_module)
        return Response(serializer.data, status=status.HTTP_200_OK)
