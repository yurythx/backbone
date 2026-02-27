from rest_framework import viewsets, permissions
from rest_framework.response import Response
from django.db import IntegrityError
from rest_framework import status
from drf_spectacular.utils import extend_schema, extend_schema_view
from .models import Page
from .serializers import PageSerializer
from apps.module_manager.permissions import HasModuleAccess

from apps.accounts.permissions import HasRolePermission

@extend_schema_view(
    list=extend_schema(tags=['CMS']),
    retrieve=extend_schema(tags=['CMS']),
    create=extend_schema(tags=['CMS']),
    update=extend_schema(tags=['CMS']),
    partial_update=extend_schema(tags=['CMS']),
    destroy=extend_schema(tags=['CMS']),
)
class PageViewSet(viewsets.ModelViewSet):
    """
    Gerencia páginas do CMS.
    """
    serializer_class = PageSerializer
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess, HasRolePermission]
    required_permission = 'pages.page_view'
    module_code = 'pages'
    from config.pagination import DefaultPagination
    pagination_class = DefaultPagination

    def get_queryset(self):
        return Page.objects.filter(company=self.request.company).order_by('title')

    def perform_create(self, serializer):
        self.required_permission = 'pages.page_create'
        if not HasRolePermission().has_permission(self.request, self):
             from rest_framework.exceptions import PermissionDenied
             raise PermissionDenied("Sem permissão para criar páginas.")
        serializer.save(company=self.request.company)

    def perform_update(self, serializer):
        self.required_permission = 'pages.page_edit'
        if not HasRolePermission().has_permission(self.request, self):
             from rest_framework.exceptions import PermissionDenied
             raise PermissionDenied("Sem permissão para editar páginas.")
        serializer.save()

    def perform_destroy(self, instance):
        self.required_permission = 'pages.page_delete'
        if not HasRolePermission().has_permission(self.request, self):
             from rest_framework.exceptions import PermissionDenied
             raise PermissionDenied("Sem permissão para excluir páginas.")
        instance.delete()
    
    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except IntegrityError:
            return Response({"detail": "Slug já existe para esta empresa."}, status=status.HTTP_400_BAD_REQUEST)
