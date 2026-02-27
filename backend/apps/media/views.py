from rest_framework import viewsets, permissions, parsers
from .models import Media
from .serializers import MediaSerializer
from apps.module_manager.permissions import HasModuleAccess
from apps.accounts.permissions import HasRolePermission

class MediaViewSet(viewsets.ModelViewSet):
    queryset = Media.objects.all()
    serializer_with_tenant = True
    serializer_class = MediaSerializer
    parser_classes = (parsers.MultiPartParser, parsers.FormParser)
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess, HasRolePermission]
    required_permission = 'media.media_view'
    pagination_class = None

    def get_queryset(self):
        if hasattr(self.request, 'company') and self.request.company:
            return Media.objects.filter(company=self.request.company)
        return Media.all_objects.none()

    def perform_create(self, serializer):
        self.required_permission = 'media.media_upload'
        if not HasRolePermission().has_permission(self.request, self):
             from rest_framework.exceptions import PermissionDenied
             raise PermissionDenied("Sem permissão para upload de mídia.")
        serializer.save(company=self.request.company)

    def perform_destroy(self, instance):
        self.required_permission = 'media.media_delete'
        if not HasRolePermission().has_permission(self.request, self):
             from rest_framework.exceptions import PermissionDenied
             raise PermissionDenied("Sem permissão para excluir mídia.")
        instance.delete()
