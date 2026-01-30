from rest_framework import generics, permissions, viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .serializers import UserRegistrationSerializer, UserSerializer
from django.contrib.auth import get_user_model
from apps.module_manager.permissions import HasModuleAccess

User = get_user_model()

class UserRegistrationView(generics.CreateAPIView):
    queryset = User.all_objects.all() # all_objects pois o tenant context pode não estar setado no registro
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]

class UserViewSet(viewsets.ModelViewSet):
    """
    Gerencia usuários do tenant atual.
    Inclui actions para perfil próprio (me) e troca de senha.
    """
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated] # Adicionar HasModuleAccess se quiser restringir a 'admin' module

    def get_queryset(self):
        # TenantUserManager já filtra por company via get_current_company()
        return User.objects.all().order_by('username')

    def perform_create(self, serializer):
        # Criação via Admin Panel dentro do tenant
        # Se precisar de senha, o serializer deve tratar ou usar set_password
        # Aqui simplificado:
        serializer.save(company=self.request.company)

    @action(detail=False, methods=['get', 'put', 'patch'])
    def me(self, request):
        user = request.user
        if request.method == 'GET':
            serializer = self.get_serializer(user)
            return Response(serializer.data)
        
        serializer = self.get_serializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

