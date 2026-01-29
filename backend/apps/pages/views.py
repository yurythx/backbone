from rest_framework import viewsets, permissions
from .models import Page
from .serializers import PageSerializer
from apps.module_manager.permissions import HasModuleAccess

class PageViewSet(viewsets.ModelViewSet):
    """
    Gerencia páginas do CMS.
    """
    serializer_class = PageSerializer
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_code = 'pages'

    def get_queryset(self):
        return Page.objects.filter(company=self.request.company).order_by('title')

    def perform_create(self, serializer):
        serializer.save(company=self.request.company)
