from rest_framework import serializers
from .models import Page
from shared_kernel.sanitization import sanitize_html, sanitize_plain_text
from rest_framework.validators import UniqueTogetherValidator

class PageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Page
        fields = '__all__'
        read_only_fields = ['company', 'created_at', 'updated_at']
        validators = []

    def validate(self, attrs):
        # Ensure company is present for validators like UniqueTogether
        request = self.context.get('request')
        if request and getattr(request, 'company', None) and 'company' not in attrs:
            attrs['company'] = request.company
        if 'title' in attrs and attrs['title']:
            attrs['title'] = sanitize_plain_text(attrs['title'])
        if 'slug' in attrs and attrs['slug']:
            attrs['slug'] = sanitize_plain_text(attrs['slug'])
        if 'content' in attrs and attrs['content']:
            attrs['content'] = sanitize_html(attrs['content'])
        if 'meta_title' in attrs and attrs['meta_title']:
            attrs['meta_title'] = sanitize_plain_text(attrs['meta_title'])
        if 'meta_description' in attrs and attrs['meta_description']:
            md = sanitize_plain_text(attrs['meta_description'])
            if len(md) > 160:
                raise serializers.ValidationError({'meta_description': 'máximo de 160 caracteres'})
            attrs['meta_description'] = md
        if 'meta_keywords' in attrs and attrs['meta_keywords']:
            attrs['meta_keywords'] = sanitize_plain_text(attrs['meta_keywords'])
        return attrs
