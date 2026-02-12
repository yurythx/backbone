from rest_framework import serializers
from .models import Company, TenantBranding, AuditLog, LDAPConfig
from django.contrib.auth import get_user_model


class TenantBrandingSerializer(serializers.ModelSerializer):
    """
    Serializer para configurações de branding do tenant.
    Suporta upload de logo e ícone.
    """
    logo_url = serializers.SerializerMethodField()
    icon_url = serializers.SerializerMethodField()
    
    class Meta:
        model = TenantBranding
        fields = [
            'id', 'company', 'company_name',
            'logo', 'logo_url', 'icon', 'icon_url',
            'primary_color', 'secondary_color', 'background_color',
            'font_family', 'theme_palette',
            'custom_css', 'custom_js',
            'footer_text', 'facebook_url', 'instagram_url',
            'linkedin_url', 'twitter_url',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'company']

    def get_logo_url(self, obj):
        if obj.logo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.logo.url)
            return obj.logo.url
        return None
    
    def get_icon_url(self, obj):
        if obj.icon:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.icon.url)
            return obj.icon.url
        return None


class CompanySerializer(serializers.ModelSerializer):
    theme_branding = TenantBrandingSerializer(read_only=True)

    class Meta:
        model = Company
        fields = [
            'id', 'name', 'slug', 'domain', 
            'onboarding_completed', 'onboarding_step',
            'theme_branding',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class TenantEmailConfigSerializer(serializers.ModelSerializer):
    class Meta:
        from .models import TenantEmailConfig
        model = TenantEmailConfig
        fields = [
            'id', 'use_custom_smtp', 'smtp_host', 'smtp_port',
            'smtp_user', 'smtp_password', 'smtp_use_tls', 'from_email'
        ]
        extra_kwargs = {
            'smtp_password': {'write_only': True}
        }

class AuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            'id', 'user', 'user_name', 'user_email', 'action', 
            'resource', 'resource_id', 'details', 'ip_address', 'created_at'
        ]
        read_only_fields = fields


class DashboardCounterSerializer(serializers.Serializer):
    total = serializers.IntegerField()
    new_this_month = serializers.IntegerField()
    growth = serializers.FloatField()


class DashboardChartDataSerializer(serializers.Serializer):
    date = serializers.DateField(required=False)
    name = serializers.CharField(required=False)
    count = serializers.IntegerField(required=False)
    article_count = serializers.IntegerField(required=False)


class RecentActivityUserSerializer(serializers.Serializer):
    name = serializers.CharField()
    avatar = serializers.URLField(allow_null=True)


class RecentActivitySerializer(serializers.Serializer):
    action = serializers.CharField()
    resource = serializers.CharField()
    created_at = serializers.DateTimeField()
    user = RecentActivityUserSerializer()


class SystemStatusSerializer(serializers.Serializer):
    storage_used = serializers.CharField()
    api_uptime = serializers.CharField()
    last_backup = serializers.DateTimeField()


class DashboardStatsSerializer(serializers.Serializer):
    counters = serializers.DictField(child=DashboardCounterSerializer())
    charts = serializers.DictField(child=serializers.ListField(child=DashboardChartDataSerializer()))
    recent_activity = RecentActivitySerializer(many=True)
    system_status = SystemStatusSerializer()


class LDAPConfigSerializer(serializers.ModelSerializer):
    """Serializer para configuração LDAP do tenant."""
    bind_password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    
    class Meta:
        model = LDAPConfig
        fields = [
            'id', 'company', 'enabled', 'server_uri', 'bind_dn', 'bind_password',
            'user_search_base', 'user_search_filter', 'attr_username', 'attr_email',
            'attr_first_name', 'attr_last_name', 'use_tls', 'require_group',
            'admin_group_dn', 'last_test_status', 'last_test_message', 'last_test_at',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'company', 'last_test_status', 'last_test_message', 'last_test_at', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        password = validated_data.pop('bind_password', None)
        instance = super().create(validated_data)
        if password:
            instance.set_bind_password(password)
            instance.save()
        return instance
    
    def update(self, instance, validated_data):
        password = validated_data.pop('bind_password', None)
        instance = super().update(instance, validated_data)
        if password:
            instance.set_bind_password(password)
            instance.save()
        return instance
    
    def validate(self, data):
        """Validar campos obrigatórios quando LDAP está habilitado."""
        if data.get('enabled', False):
            required_fields = {
                'server_uri': 'Server URI',
                'bind_dn': 'Bind DN',
                'user_search_base': 'User Search Base'
            }
            
            errors = {}
            for field, label in required_fields.items():
                if not data.get(field):
                    errors[field] = f"{label} é obrigatório quando LDAP está ativado."
            
            if errors:
                raise serializers.ValidationError(errors)
            
            # Validar filtro de busca
            if '%(user)s' not in data.get('user_search_filter', ''):
                raise serializers.ValidationError({
                    'user_search_filter': 'O filtro deve conter o placeholder %(user)s'
                })
        
        return data

