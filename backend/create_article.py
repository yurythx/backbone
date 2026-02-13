import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.articles.models import Article, Category
from apps.accounts.models import User
from apps.core.models import Company
from django.utils import timezone

# Get first company and user
company = Company.objects.first()
user = User.objects.filter(company=company).first()

print(f"Company: {company.name if company else 'None'}")
print(f"User: {user.username if user else 'None'}")

if not all([company, user]):
    print("ERROR: Missing company or user")
    exit(1)

# Create category
category, cat_created = Category.objects.get_or_create(
    slug='tecnologia',
    company=company,
    defaults={'name': 'Tecnologia'}
)
print(f"\nCategory {'created' if cat_created else 'found'}: {category.name}")

# Create 3 sample articles
articles_data = [
    {
        'slug': 'introducao-ao-django',
        'title': 'Introdução ao Django',
        'content': '<h2>Por que Django?</h2><p>Django é um framework Python poderoso para desenvolvimento web.</p><p>Principais vantagens:</p><ul><li>Desenvolvimento rápido</li><li>Segurança integrada</li><li>Escalável</li></ul>',
        'excerpt': 'Aprenda Django do zero com este guia completo.',
    },
    {
        'slug': 'typescript-vs-javascript',
        'title': 'TypeScript vs JavaScript',
        'content': '<h2>A Evolução do JavaScript</h2><p>TypeScript adiciona tipagem estática ao JavaScript.</p><h3>Quando usar TypeScript?</h3><ul><li>Projetos grandes</li><li>Times grandes</li><li>Aplicações críticas</li></ul>',
        'excerpt': 'Entenda as diferenças e quando usar cada um.',
    },
    {
        'slug': 'react-19-novidades',
        'title': 'React 19: Novas Funcionalidades',
        'content': '<h2>React 19 chegou!</h2><p>Principais novidades:</p><ul><li>React Compiler</li><li>Actions</li><li>Server Components estáveis</li></ul>',
        'excerpt': 'Conheça as principais novidades do React 19.',
    },
]

created_count = 0
for data in articles_data:
    article, created = Article.objects.update_or_create(
        slug=data['slug'],
        company=company,
        defaults={
            'title': data['title'],
            'content': data['content'],
            'excerpt': data['excerpt'],
            'author': user,
            'category': category,
            'is_public': True,
            'status': 'published',
            'published_at': timezone.now(),
            'meta_title': data['title'],
            'meta_description': data['excerpt']
        }
    )
    if created:
        created_count += 1
    print(f"  {'✓ Created' if created else '↻ Updated'}: {article.title}")

print(f"\n✅ {created_count} new articles created")
print(f"📊 Total public articles: {Article.objects.filter(is_public=True, status='published').count()}")
