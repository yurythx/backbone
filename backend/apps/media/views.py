from rest_framework import viewsets, permissions, parsers
from .models import Media
from .serializers import MediaSerializer

class MediaViewSet(viewsets.ModelViewSet):
    queryset = Media.objects.all()
    serializer_with_tenant = True # Assumed filter logic from BaseTenantModel/Middleware
    serializer_class = MediaSerializer
    parser_classes = (parsers.MultiPartParser, parsers.FormParser)
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # The TenantMiddleware/BaseTenantModel usually handles this, 
        # but explicit filtering is safer if not fully automated.
        if hasattr(self.request.user, 'company_id'):
            return self.queryset.filter(company_id=self.request.user.company_id)
        return self.queryset.none()

    def perform_create(self, serializer):
        serializer.save(company_id=self.request.user.company_id)
