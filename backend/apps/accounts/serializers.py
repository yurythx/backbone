from rest_framework import serializers
from django.contrib.auth import get_user_model
from apps.core.models import Company

User = get_user_model()

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
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']
