from rest_framework import generics, permissions, viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from django.http import HttpResponse
from .serializers import (
    UserRegistrationSerializer, UserSerializer, RoleSerializer,
    PasswordResetRequestSerializer, PasswordResetConfirmSerializer,
    InvitationSerializer, AcceptInvitationSerializer,
    CustomTokenObtainPairSerializer
)
from .models import Role, Invitation
from .services import AccountService
from django.contrib.auth import get_user_model
from django.utils import timezone
from apps.module_manager.permissions import HasModuleAccess
from django.core.cache import cache
from drf_spectacular.utils import extend_schema, extend_schema_view
from shared_kernel.audit import log_action

User = get_user_model()

@extend_schema(tags=['Accounts - Auth'])
class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

@extend_schema(tags=['Accounts - Auth'], summary="Register a new user (admin level)")
class UserRegistrationView(generics.CreateAPIView):
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]

@extend_schema(tags=['Accounts - Auth'], summary="Request password reset link")
class PasswordResetRequestView(generics.GenericAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = PasswordResetRequestSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        AccountService.request_password_reset(serializer.validated_data['email'])
            
        return Response(
            {"detail": "Se o seu email estiver cadastrado, você receberá um link de recuperação."},
            status=status.HTTP_200_OK
        )

@extend_schema(tags=['Accounts - Auth'], summary="Confirm password reset with token")
class PasswordResetConfirmView(generics.GenericAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = PasswordResetConfirmSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        success = AccountService.confirm_password_reset(
            uid=serializer.validated_data['uid'],
            token=serializer.validated_data['token'],
            new_password=serializer.validated_data['new_password']
        )
        
        if success:
            return Response({"detail": "Senha alterada com sucesso."}, status=status.HTTP_200_OK)
        return Response({"detail": "Link inválido ou expirado."}, status=status.HTTP_400_BAD_REQUEST)

@extend_schema_view(
    list=extend_schema(tags=['Accounts - Users']),
    retrieve=extend_schema(tags=['Accounts - Users']),
    create=extend_schema(tags=['Accounts - Users']),
    update=extend_schema(tags=['Accounts - Users']),
    partial_update=extend_schema(tags=['Accounts - Users']),
    destroy=extend_schema(tags=['Accounts - Users']),
    me=extend_schema(tags=['Accounts - Users'], summary="Get current user profile"),
    export=extend_schema(tags=['Accounts - Users'], summary="Export users as CSV"),
)
class UserViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated] # Adicionar HasModuleAccess se quiser restringir a 'admin' module
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering_fields = ['username', 'email', 'first_name', 'last_name', 'date_joined']

    def get_queryset(self):
        # TenantUserManager já filtra por company via get_current_company()
        qs = User.objects.select_related('role').all().order_by('username')
        role_id = self.request.query_params.get('role')
        q = self.request.query_params.get('q')
        if role_id:
            qs = qs.filter(role_id=role_id)
        if q:
            qs = qs.filter(username__icontains=q)
        return qs

    def perform_create(self, serializer):
        from shared_kernel.licensing import check_feature_limit
        can_add, limit, current = check_feature_limit(self.request.company, 'max_users')
        if not can_add:
            from rest_framework.exceptions import ValidationError
            raise ValidationError(f"Limite de usuários atingido ({current}/{limit}). Faça um upgrade do seu plano.")
            
        serializer.save(company=self.request.company)

    @action(detail=False, methods=['get', 'put', 'patch'])
    def me(self, request):
        user = request.user
        if request.method == 'GET':
            serializer = self.get_serializer(user)
            return Response(serializer.data)
        
        allowed = {'first_name', 'last_name', 'email'}
        filtered = {k: v for k, v in request.data.items() if k in allowed}
        serializer = self.get_serializer(user, data=filtered, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def export(self, request):
        if not request.user.is_staff:
            return Response({"detail": "Apenas administradores podem exportar usuários."}, status=status.HTTP_403_FORBIDDEN)
        qs = self.get_queryset()
        rows = ["username,email,first_name,last_name,role"]
        for u in qs:
            role_name = u.role.name if u.role else ""
            rows.append(f"{u.username},{u.email},{u.first_name},{u.last_name},{role_name}")
        content = "\n".join(rows)
        resp = HttpResponse(content, content_type="text/csv")
        resp['Content-Disposition'] = 'attachment; filename="users.csv"'
        return resp

@extend_schema_view(
    list=extend_schema(tags=['Accounts - Auth']),
    retrieve=extend_schema(tags=['Accounts - Auth']),
    create=extend_schema(tags=['Accounts - Auth']),
    update=extend_schema(tags=['Accounts - Auth']),
    partial_update=extend_schema(tags=['Accounts - Auth']),
    destroy=extend_schema(tags=['Accounts - Auth']),
)
class RoleViewSet(viewsets.ModelViewSet):
    serializer_class = RoleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Role.objects.all().order_by('name')

    def perform_create(self, serializer):
        serializer.save(company=self.request.company)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.is_system_role:
            return Response(
                {"detail": "Não é possível excluir um papel do sistema."}, 
                status=status.HTTP_403_FORBIDDEN
            )
        return super().destroy(request, *args, **kwargs)

@extend_schema_view(
    list=extend_schema(tags=['Accounts - Invitations']),
    retrieve=extend_schema(tags=['Accounts - Invitations']),
    create=extend_schema(tags=['Accounts - Invitations'], summary="Send a new invitation"),
    update=extend_schema(tags=['Accounts - Invitations']),
    partial_update=extend_schema(tags=['Accounts - Invitations']),
    destroy=extend_schema(tags=['Accounts - Invitations']),
    resend=extend_schema(tags=['Accounts - Invitations'], summary="Resend invitation email"),
)
class InvitationViewSet(viewsets.ModelViewSet):
    serializer_class = InvitationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Invitation.objects.select_related('role', 'company', 'invited_by').all().order_by('-created_at')

    def perform_create(self, serializer):
        from shared_kernel.licensing import check_feature_limit
        can_add, limit, current = check_feature_limit(self.request.company, 'max_users')
        if not can_add:
            from rest_framework.exceptions import ValidationError
            raise ValidationError(f"Limite de usuários atingido ({current}/{limit}). O convite não pode ser enviado.")

        AccountService.create_invitation(
            sender=self.request.user,
            company=self.request.company,
            email=serializer.validated_data['email'],
            role=serializer.validated_data['role']
        )
    
    @action(detail=True, methods=['post'])
    def resend(self, request, pk=None):
        """
        Reenvia o e-mail de convite para o destinatário.
        """
        if not request.user.is_staff:
            return Response({"detail": "Apenas administradores podem reenviar convites."}, status=status.HTTP_403_FORBIDDEN)
        invite = self.get_object()
        # Simple throttle: block resends within 60 seconds per invite
        cache_key = f"invite_resend:{invite.token}"
        if cache.get(cache_key):
            return Response({"detail": "Aguarde antes de reenviar o convite."}, status=status.HTTP_429_TOO_MANY_REQUESTS)
        from django.conf import settings
        from shared_kernel.email import send_notification_email
        invite_url = f"{settings.FRONTEND_URL}/accept-invite?token={invite.token}"
        try:
            send_notification_email(
                subject=f"Convite para {invite.company.name} - Backbone",
                recipient_list=[invite.email],
                template_name="emails/invitation.html",
                context={
                    "company_name": invite.company.name,
                    "invite_url": invite_url,
                    "subject": "Convite de Acesso"
                }
            )
            cache.set(cache_key, True, timeout=60)
            log_action(request.user, 'update', 'Invitation', resource_id=invite.id, details={'action': 'resend'}, request=request)
            return Response({"detail": "Convite reenviado com sucesso."}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"detail": f"Falha ao reenviar convite: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

@extend_schema(tags=['Accounts - Invitations'], summary="Accept invitation and create account")
class AcceptInvitationView(generics.GenericAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = AcceptInvitationSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user, error_msg = AccountService.accept_invitation(
            token=serializer.validated_data['token'],
            first_name=serializer.validated_data['first_name'],
            last_name=serializer.validated_data['last_name'],
            password=serializer.validated_data['password']
        )
        
        if user:
            return Response({"detail": "Conta criada com sucesso! Agora você pode fazer login."}, status=status.HTTP_201_CREATED)
        return Response({"detail": error_msg}, status=status.HTTP_400_BAD_REQUEST)

