from rest_framework import viewsets, permissions
from .models import Transaction, Category
from .serializers import TransactionSerializer, CategorySerializer
from apps.module_manager.permissions import HasModuleAccess

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_code = 'finance'
    
    def perform_create(self, serializer):
        serializer.save(company=self.request.company)

class TransactionViewSet(viewsets.ModelViewSet):
    queryset = Transaction.objects.all()
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_code = 'finance'
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, company=self.request.company)
