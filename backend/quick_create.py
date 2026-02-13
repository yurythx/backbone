"""
Quick script to create public test articles.
Run: python quick_create.py
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.articles.models import Article, Category
from apps.accounts.models import User
from apps.core.models import Company
from django.utils import timezone

def main():
    # Get company and user
    company = Company.objects.first()
    if not company:
        print("❌ No company found!")
        return
    
    user = User.objects.filter(company=company).first()
    if not user:
        print("❌ No user found!")
        return
    
    print(f"✓ Company: {company.name}")
    print(f"✓ User: {user.username}")
    
    # Get or create category
    try:
        category = Category.objects.filter(company=company).first()
        if not category:
            category = Category.objects.create(
                name='Geral',
                slug=f'geral-{company.id}',
                company=company
            )
            print(f"✓ Created category: {category.name}")
        else:
            print(f"✓ Using category: {category.name}")
    except Exception as e:
        print(f"❌ Category error: {e}")
        return
    
    # Create articles
    articles = [
        {
            'title': 'Artigo Público 1',
            'slug': f'artigo-publico-1-{company.id}',
            'content': '<h2>Conteúdo</h2><p>Este é o primeiro artigo público de teste.</p>',
            'excerpt': 'Primeiro artigo de teste público',
        },
        {
            'title': 'Artigo Público 2',
            'slug': f'artigo-publico-2-{company.id}',
            'content': '<h2>Conteúdo</h2><p>Este é o segundo artigo público de teste.</p>',
            'excerpt': 'Segundo artigo de teste público',
        },
        {
            'title': 'Artigo Público 3',
            'slug': f'artigo-publico-3-{company.id}',
            'content': '<h2>Conteúdo</h2><p>Este é o terceiro artigo público de teste.</p>',
            'excerpt': 'Terceiro artigo de teste público',
        },
    ]
    
    created = 0
    for data in articles:
        try:
            article, was_created = Article.objects.get_or_create(
                slug=data['slug'],
                defaults={
                    'title': data['title'],
                    'content': data['content'],
                    'excerpt': data['excerpt'],
                    'company': company,
                    'author': user,
                    'category': category,
                    'is_public': True,
                    'status': 'published',
                    'published_at': timezone.now(),
                }
            )
            if was_created:
                created += 1
                print(f"  ✓ Created: {article.title}")
            else:
                # Update to ensure it's public
                article.is_public = True
                article.status = 'published'
                article.save()
                print(f"  ↻ Updated: {article.title}")
        except Exception as e:
            print(f"  ❌ Error creating {data['title']}: {e}")
    
    # Final count
    public_count = Article.objects.filter(is_public=True, status='published').count()
    print(f"\n✅ Done! {created} articles created")
    print(f"📊 Total public articles: {public_count}")

if __name__ == '__main__':
    main()
