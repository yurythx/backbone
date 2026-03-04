from rest_framework import serializers
from .models import Article, Category, Tag, Comment
from shared_kernel.sanitization import sanitize_html, sanitize_plain_text

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'
        read_only_fields = ['company']

class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = '__all__'
        read_only_fields = ['company']

class ArticleSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    author_name = serializers.CharField(source='author.username', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    company_slug = serializers.CharField(source='company.slug', read_only=True)
    tag_list = TagSerializer(source='tags', many=True, read_only=True)

    class Meta:
        model = Article
        fields = '__all__'
        read_only_fields = ['company', 'created_at', 'updated_at', 'author']

    def to_internal_value(self, data):
        # Permite que a imagem seja uma string (URL/caminho) em vez de um arquivo
        # Isso é necessário quando o usuário seleciona uma imagem da biblioteca de mídia
        if 'image' in data and (isinstance(data['image'], str) or data['image'] is None):
            mutable_data = data.copy()
            image_val = mutable_data.pop('image', None)
            
            # Se for string vazia, trata como None
            if image_val == "":
                image_val = None
            
            # Validação de Segurança de Imagem (ID Harvesting prevention)
            if isinstance(image_val, str) and image_val:
                request = self.context.get('request')
                if request and hasattr(request, 'company') and request.company:
                    clean_path = image_val
                    
                    # Se for URL completa, extrai o path
                    if '://' in clean_path:
                        from urllib.parse import urlparse
                        clean_path = urlparse(clean_path).path
                    
                    clean_path = clean_path.lstrip('/')
                    if clean_path.startswith('media/'):
                        clean_path = clean_path[6:]

                    expected_prefix = f"tenants/{request.company.slug}/"
                    allowed_prefixes = [expected_prefix, 'branding/', 'public/']
                    
                    if not any(clean_path.startswith(prefix) for prefix in allowed_prefixes):
                        raise serializers.ValidationError({'image': 'A imagem selecionada não pertence à sua organização.'})

            res = super().to_internal_value(mutable_data)
            res['image'] = image_val
            return res
        return super().to_internal_value(data)

    def validate(self, attrs):
        # Sanitização de campos HTML e texto
        if 'content' in attrs and attrs['content']:
            attrs['content'] = sanitize_html(attrs['content'])
        if 'excerpt' in attrs and attrs['excerpt']:
            attrs['excerpt'] = sanitize_plain_text(attrs['excerpt'])
        if 'title' in attrs and attrs['title']:
            attrs['title'] = sanitize_plain_text(attrs['title'])
        if 'meta_title' in attrs and attrs['meta_title']:
            attrs['meta_title'] = sanitize_plain_text(attrs['meta_title'])
        if 'meta_description' in attrs and attrs['meta_description']:
            md = sanitize_plain_text(attrs['meta_description'])
            if len(md) > 160:
                raise serializers.ValidationError({'meta_description': 'máximo de 160 caracteres'})
            attrs['meta_description'] = md
        if 'meta_keywords' in attrs and attrs['meta_keywords']:
            attrs['meta_keywords'] = sanitize_plain_text(attrs['meta_keywords'])
        
        # Validação específica para artigos públicos
        is_public = attrs.get('is_public', False)
        status_value = attrs.get('status', None)

        if is_public:
            # Se o status estiver vindo no payload, ele deve ser 'published'
            if status_value is not None and status_value != Article.STATUS_PUBLISHED:
                raise serializers.ValidationError({
                    'is_public': (
                        'Para ser Público, o status deve ser "Publicado".'
                    )
                })
            
            # Se o status não veio no payload (edição parcial), verificamos o objeto atual
            if self.instance and status_value is None:
                if self.instance.status != Article.STATUS_PUBLISHED:
                    raise serializers.ValidationError({
                        'is_public': 'Este artigo não pode ser público porque ainda não foi publicado.'
                    })

            # Artigos públicos exigem conteúdo completo para SEO
            if not attrs.get('title'):
                raise serializers.ValidationError({
                    'title': 'Artigos públicos devem ter título preenchido.'
                })
            if not attrs.get('content'):
                raise serializers.ValidationError({
                    'content': 'Artigos públicos devem ter conteúdo preenchido.'
                })
            if not attrs.get('excerpt'):
                raise serializers.ValidationError({
                    'excerpt': 'Artigos públicos devem ter resumo preenchido para melhor SEO.'
                })

        return attrs


class ArticlePublicSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    author_name = serializers.CharField(source='author.username', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    company_slug = serializers.CharField(source='company.slug', read_only=True)
    tags = serializers.SlugRelatedField(slug_field='name', many=True, read_only=True)
    cover_image = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()

    class Meta:
        model = Article
        fields = [
            'id', 'title', 'slug', 'content', 'excerpt',
            'cover_image', 'image',
            'category_name', 'tags',
            'meta_title', 'meta_description', 'meta_keywords',
            'published_at', 'created_at', 'updated_at',
            'author_name', 'company_name', 'company_slug'
        ]
        read_only_fields = fields

    def get_cover_image(self, obj):
        try:
            if obj.image and hasattr(obj.image, 'url'):
                return obj.image.url
        except Exception:
            return None
        return None

    def get_image(self, obj):
        return self.get_cover_image(obj)

class CommentSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.username', read_only=True)
    article_title = serializers.CharField(source='article.title', read_only=True)

    class Meta:
        model = Comment
        fields = '__all__'
        read_only_fields = ['company', 'created_at', 'author', 'is_approved']

    def validate(self, attrs):
        if 'content' in attrs and attrs['content']:
            attrs['content'] = sanitize_plain_text(attrs['content'])
        if 'name' in attrs and attrs['name']:
            attrs['name'] = sanitize_plain_text(attrs['name'])
        if 'email' in attrs and attrs['email']:
            attrs['email'] = sanitize_plain_text(attrs['email'])
        return attrs

class ArticleAnalyticsSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    title = serializers.CharField()
    slug = serializers.CharField()
    total_views = serializers.IntegerField()
    views_last_30_days = serializers.IntegerField()
    unique_visitors = serializers.IntegerField()

class GlobalArticlesAnalyticsSerializer(serializers.Serializer):
    total_articles = serializers.IntegerField()
    total_views = serializers.IntegerField()
    most_viewed = ArticleAnalyticsSerializer(many=True)
    views_by_date = serializers.ListField(child=serializers.DictField())

class ArticleHistorySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    created_at = serializers.DateTimeField()
    user = serializers.CharField()
    comment = serializers.CharField(allow_blank=True)
