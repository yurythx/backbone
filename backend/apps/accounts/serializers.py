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
        return user

class UserSerializer(serializers.ModelSerializer):
    role_details = RoleSerializer(source='role', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'role_details']
        read_only_fields = ['id']


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
