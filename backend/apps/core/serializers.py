from rest_framework import serializers
from .models import Company, TenantBranding


class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ['id', 'name', 'slug', 'domain', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class TenantBrandingSerializer(serializers.ModelSerializer):
    """
    Serializer para configurações de branding do tenant.
    Suporta upload de logo e ícone.
    """
    logo_url = serializers.SerializerMethodField()
    icon_url = serializers.SerializerMethodField()
    company_details = CompanySerializer(source='company', read_only=True)
    
    class Meta:
        model = TenantBranding
        fields = [
            'id', 'company', 'company_details', 'company_name',
            'logo', 'logo_url', 'icon', 'icon_url',
            'primary_color', 'theme_palette',
            'footer_text', 'facebook_url', 'instagram_url',
            'linkedin_url', 'twitter_url',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'company']


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
