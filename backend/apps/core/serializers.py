from rest_framework import serializers
from .models import Company, TenantBranding, AuditLog
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
