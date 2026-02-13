from apps.articles.models import Article, Category
from apps.accounts.models import User
from apps.core.models import Company
from django.utils import timezone

# Get first company and user
company = Company.objects.first()
user = User.objects.filter(company=company).first()

print(f"Company: {company.name}")
print(f"User: {user.username}")

# Get existing category or create with unique slug
cats = Category.objects.filter(company=company)
if cats.exists():
    category = cats.first()
    print(f"Using existing category: {category.name}")
else:
    category = Category.objects.create(
        name='Artigos',
        slug=f'artigos-{str(company.id)[:8]}',
        company=company
    )
    print(f"Created category: {category.name}")

# Create 3 articles
for i in range(1, 4):
    article, created = Article.objects.get_or_create(
        slug=f'artigo-teste-{i}-{str(company.id)[:8]}',
        defaults={
            'title': f'Artigo Público {i}',
            'content': f'<h2>Artigo {i}</h2><p>Este é o artigo número {i} para testes.</p>',
            'excerpt': f'Artigo de teste número {i}',
            'company': company,
            'author': user,
            'category': category,
            'is_public': True,
            'status': 'published',
            'published_at': timezone.now(),
        }
    )
    if created:
        print(f"✓ Created: {article.title}")
    else:
        article.is_public = True
        article.status = 'published'
        article.save()
        print(f"↻ Updated: {article.title}")

# Show results
public_articles = Article.objects.filter(is_public=True, status='published')
print(f"\n✅ Total public articles: {public_articles.count()}")
for art in public_articles[:5]:
    print(f"  - {art.title} (slug={art.slug})")
