from django.core.management.base import BaseCommand
from django.utils.text import slugify
from apps.core.models import Company
from apps.articles.models import Category, Tag

class Command(BaseCommand):
    help = 'Seeds the database with initial CMS data (Categories and Tags) for all tenants.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('Starting CMS seeding...'))

        companies = Company.objects.all()
        
        if not companies.exists():
             self.stdout.write(self.style.WARNING('No companies found. Skipping seed.'))
             return

        for company in companies:
            self.stdout.write(f'Processing Company: {company.name}')
            
            # Create 3 Categories
            for i in range(1, 4):
                cat_name = f'Categoria {i}'
                cat_slug = slugify(cat_name)
                
                cat, created = Category.objects.get_or_create(
                    company=company,
                    slug=cat_slug,
                    defaults={'name': cat_name}
                )
                if created:
                    self.stdout.write(self.style.SUCCESS(f'  [+] Created Category: {cat_name}'))
                else:
                    self.stdout.write(f'  [.] Category {cat_name} already exists')

            # Create 3 Tags
            for i in range(1, 4):
                tag_name = f'Tag {i}'
                tag_slug = slugify(tag_name)
                
                tag, created = Tag.objects.get_or_create(
                    company=company,
                    slug=tag_slug,
                    defaults={'name': tag_name}
                )
                if created:
                    self.stdout.write(self.style.SUCCESS(f'  [+] Created Tag: {tag_name}'))
                else:
                     self.stdout.write(f'  [.] Tag {tag_name} already exists')

        self.stdout.write(self.style.SUCCESS('CMS seeding completed!'))
        
        # Health Check
        self.verify_seed_health()
    
    def verify_seed_health(self):
        """Verifica se o seed do CMS foi executado com sucesso"""
        self.stdout.write(self.style.WARNING('\n🔍 Running CMS health check...'))
        
        companies = Company.objects.all()
        total_categories = 0
        total_tags = 0
        issues = []
        
        for company in companies:
            cat_count = Category.objects.filter(company=company).count()
            tag_count = Tag.objects.filter(company=company).count()
            
            total_categories += cat_count
            total_tags += tag_count
            
            if cat_count == 0:
                issues.append(f'Company "{company.name}" has no categories')
            if tag_count == 0:
                issues.append(f'Company "{company.name}" has no tags')
        
        self.stdout.write(self.style.SUCCESS(f'  ✓ Total Categories: {total_categories}'))
        self.stdout.write(self.style.SUCCESS(f'  ✓ Total Tags: {total_tags}'))
        self.stdout.write(self.style.SUCCESS(f'  ✓ Companies processed: {companies.count()}'))
        
        if issues:
            self.stdout.write(self.style.WARNING(f'\n⚠️  Found {len(issues)} issue(s):'))
            for issue in issues:
                self.stdout.write(self.style.WARNING(f'   • {issue}'))
        else:
            self.stdout.write(self.style.SUCCESS('\n✅ CMS health check passed!'))
