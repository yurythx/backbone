from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from apps.core.models import Company
from .models import UserThemePreference, Role, Invitation
from django.contrib.auth.password_validation import validate_password

User = get_user_model()

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Add custom claims
        token['username'] = user.username
        token['email'] = user.email
        token['first_name'] = user.first_name
        token['last_name'] = user.last_name
        
        # Add company info if available
        if hasattr(user, 'company') and user.company:
            token['company_slug'] = user.company.slug

        return token

class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ['id', 'name', 'description', 'permissions', 'is_system_role']
        read_only_fields = ['id', 'is_system_role']

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    company_slug = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'first_name', 'last_name', 'company_slug']
        read_only_fields = ['id']

    def validate_company_slug(self, value):
        try:
            return Company.objects.get(slug=value)
        except Company.DoesNotExist:
            raise serializers.ValidationError("Empresa não encontrada.")

    def validate(self, attrs):
        # Apply Django's password validators
        # Normalize fields
        if 'email' in attrs and attrs['email']:
            attrs['email'] = attrs['email'].strip().lower()
        if 'username' in attrs and attrs['username']:
            attrs['username'] = attrs['username'].strip()
        password = attrs.get('password')
        # Provide context user for validators that check similarity
        context_user = User(username=attrs.get('username'), email=attrs.get('email'), first_name=attrs.get('first_name'), last_name=attrs.get('last_name'))
        validate_password(password, user=context_user)
        return attrs

    def create(self, validated_data):
        company = validated_data.pop('company_slug')
        password = validated_data.pop('password')
        
        # O BaseTenantModel requer que 'company' seja passado na criação
        user = User.objects.create_user(
            company=company,
            password=password,
            **validated_data
        )

        # Se for o primeiro usuário da empresa, atribui papel de Administrador
        user_count = User.all_objects.filter(company=company).count()
        if user_count == 1:
            from .services import AccountService
            from .models import Role
            # Garante que as roles existam
            AccountService.ensure_default_roles(company)
            try:
                admin_role = Role.all_objects.get(name='Administrador', company=company)
                user.role = admin_role
                user.save(update_fields=['role'])
            except Role.DoesNotExist:
                pass
                
        return user

from apps.core.serializers import CompanySerializer # Ensure CompanySerializer is available

class UserSerializer(serializers.ModelSerializer):
    role_details = RoleSerializer(source='role', read_only=True)
    company_details = CompanySerializer(source='company', read_only=True)
    password = serializers.CharField(write_only=True, required=False, min_length=6)
    avatar_url = serializers.SerializerMethodField()
    company = serializers.PrimaryKeyRelatedField(queryset=Company.objects.all(), required=False)
    # A3: role filtrada pelo tenant do request — impede atribuir role de outro tenant
    role = serializers.SerializerMethodField(read_only=False)
    # Explicitly define avatar to handle file uploads properly
    avatar = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'role_details',
                  'company', 'company_details', 'is_superuser', 'is_staff', 'avatar', 'avatar_url', 'password', 'status']
        # I-A1: is_superuser e is_staff são read_only — não podem ser alterados via API
        read_only_fields = ['id', 'company_details', 'role_details', 'avatar_url', 'is_superuser', 'is_staff']
        extra_kwargs = {
            'role': {'required': False},
            'company': {'required': False},
            'email': {'required': False},
            'username': {'required': False}
        }

    def get_role(self, obj):
        """Retorna o ID da role atual do usuário (para leitura no get_role field)."""
        return obj.role_id

    def to_internal_value(self, data):
        """A3: Ao receber role como ID, valida que pertence ao mesmo tenant."""
        result = super().to_internal_value(data)
        role_id = data.get('role')
        if role_id is not None:
            from .models import Role
            request = self.context.get('request')
            company = getattr(request, 'company', None) if request else None
            try:
                if request and request.user.is_superuser:
                    # Superusuário pode atribuir qualquer role
                    role = Role.all_objects.get(pk=role_id)
                elif company:
                    # Usuários normais só podem atribuir roles do seu tenant
                    role = Role.objects.filter(company=company).get(pk=role_id)
                else:
                    raise serializers.ValidationError({'role': 'Contexto de empresa inválido.'})
                result['role'] = role
            except Role.DoesNotExist:
                raise serializers.ValidationError({'role': f'Papel de acesso inválido ou não pertence a esta empresa.'})
        return result

    def get_avatar_url(self, obj):
        if obj.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            return obj.avatar.url
        return None

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = User.objects.create_user(password=password, **validated_data)
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        
        # Se 'role' estiver no validated_data, o super().update() vai tentar atribuí-lo diretamente
        # Mas se o queryset da role não incluir a role atual (por tenant isolation), pode falhar
        # ou se o serializer field não estiver esperando isso.
        # Como definimos role = PrimaryKeyRelatedField(queryset=Role.objects.all()), ele deve aceitar.
        
        # O problema 'Invalid pk "1" - object does not exist' geralmente ocorre quando
        # o PrimaryKeyRelatedField tenta validar o ID recebido contra o queryset, e não encontra.
        # No teste, criamos a Role, mas talvez o contexto do request/viewset esteja filtrando?
        # Não, o serializer usa Role.objects.all().
        
        # Vamos garantir que a role seja tratada corretamente
        if 'role' in validated_data:
            role = validated_data['role']
            # Se role for uma instância (o que o DRF retorna após validar), ok.
            # Se for ID, precisamos buscar. Mas o validated_data já deve ter a instância.
            pass

        user = super().update(instance, validated_data)

        if password:
            user.set_password(password)
            user.save()
            
        return user


class UserThemePreferenceSerializer(serializers.ModelSerializer):
    """
    Serializer para preferências de tema do usuário.
    """
    user_details = UserSerializer(source='user', read_only=True)
    
    class Meta:
        model = UserThemePreference
        fields = [
            'id', 'user', 'user_details',
            'theme_palette', 'use_tenant_theme',
            'dark_mode_preference',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']

class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError("As senhas não coincidem.")
        return data

class InvitationSerializer(serializers.ModelSerializer):
    role_name = serializers.CharField(source='role.name', read_only=True)
    
    class Meta:
        model = Invitation
        fields = ['id', 'email', 'role', 'role_name', 'status', 'expires_at', 'created_at']
        read_only_fields = ['id', 'status', 'expires_at', 'created_at']

class AcceptInvitationSerializer(serializers.Serializer):
    token = serializers.CharField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError("As senhas não coincidem.")
        return data
