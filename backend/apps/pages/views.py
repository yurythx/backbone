from rest_framework import viewsets, permissions
from rest_framework.response import Response
from django.db import IntegrityError
from rest_framework import status
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
    
    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except IntegrityError:
            return Response({"detail": "Slug já existe para esta empresa."}, status=status.HTTP_400_BAD_REQUEST)
