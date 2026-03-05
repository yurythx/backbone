from django.core.management.base import BaseCommand
from django.utils.text import slugify
from django.utils import timezone
from apps.core.models import Company
from apps.articles.models import Category, Tag, Article
from apps.accounts.models import User
import random

class Command(BaseCommand):
    help = 'Seeds the database with initial CMS data (Categories, Tags and Articles) for all tenants.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('Starting CMS seeding...'))

        # Look for root company by slug (stable) or production slug. 
        # Falls back to the first available company if neither found.
        companies = Company.objects.filter(slug__in=['raiz', 'projetoravenna'])
        
        if not companies.exists():
             companies = Company.objects.filter(is_active=True)[:1]
             
        if not companies.exists():
             self.stdout.write(self.style.ERROR('No active company found for CMS seeding.'))
             return

        for company in companies:
            self.stdout.write(f'Processing Company: {company.name} (Slug: {company.slug})')
            
            # Find a user to be the author
            author = User.objects.filter(company=company).first()
            if not author:
                # Fallback to a superuser if no company user exists
                author = User.objects.filter(is_superuser=True).first()

            # --- Create Categories ---
            categories_data = [
                {'name': 'Tecnologia', 'slug': 'tecnologia'},
                {'name': 'Negócios', 'slug': 'negocios'},
                {'name': 'Inovação', 'slug': 'inovacao'},
                {'name': 'Marketing', 'slug': 'marketing'},
            ]
            
            created_categories = []
            for cat_data in categories_data:
                try:
                    cat, created = Category.all_objects.get_or_create(
                        company=company,
                        slug=cat_data['slug'],
                        defaults={'name': cat_data['name']}
                    )
                    created_categories.append(cat)
                    if created:
                        self.stdout.write(self.style.SUCCESS(f'  [+] Created Category: {cat.name}'))
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f'  [!] Failed to process Category {cat_data["name"]}: {str(e)}'))

            # --- Create Tags ---
            tags_data = ['SaaS', 'Startup', 'Gestão', 'Dicas', 'Produtividade', 'Tutorial']
            created_tags = []
            for tag_name in tags_data:
                try:
                    tag, created = Tag.all_objects.get_or_create(
                        company=company,
                        slug=slugify(tag_name),
                        defaults={'name': tag_name}
                    )
                    created_tags.append(tag)
                    if created:
                        self.stdout.write(self.style.SUCCESS(f'  [+] Created Tag: {tag.name}'))
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f'  [!] Failed to process Tag {tag_name}: {str(e)}'))

            # --- Create 9 Articles ---
            articles_data = [
                {
                    'title': 'O Futuro do SaaS no Brasil',
                    'excerpt': 'Descubra as tendências que estão moldando o mercado de software como serviço no país.',
                    'content': '<p>O mercado de SaaS no Brasil está em plena expansão. Com a digitalização acelerada das empresas, soluções em nuvem tornaram-se essenciais...</p>',
                    'cover_image': 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2426&auto=format&fit=crop',
                    'cat_index': 0
                },
                {
                    'title': '5 Dicas para Escalar sua Startup',
                    'excerpt': 'Estratégias comprovadas para levar seu negócio ao próximo nível de crescimento sustentável.',
                    'content': '<p>Escalar uma startup exige mais do que apenas um bom produto. É preciso ter processos definidos, uma equipe alinhada e foco total no cliente...</p>',
                    'cover_image': 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=2532&auto=format&fit=crop',
                    'cat_index': 1
                },
                {
                    'title': 'Inteligência Artificial nos Negócios',
                    'excerpt': 'Como a IA está transformando a tomada de decisão e automatizando processos corporativos.',
                    'content': '<p>A Inteligência Artificial deixou de ser ficção científica para se tornar uma ferramenta indispensável no mundo dos negócios...</p>',
                    'cover_image': 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=2340&auto=format&fit=crop',
                    'cat_index': 2
                },
                {
                    'title': 'Marketing Digital: Guia Completo',
                    'excerpt': 'Tudo o que você precisa saber para criar campanhas de sucesso e atrair leads qualificados.',
                    'content': '<p>O Marketing Digital é um vasto universo de estratégias. Desde SEO até campanhas de mídia paga, dominar esses canais é crucial...</p>',
                    'cover_image': 'https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?q=80&w=2348&auto=format&fit=crop',
                    'cat_index': 3
                },
                {
                    'title': 'Liderança na Era Remota',
                    'excerpt': 'Desafios e oportunidades de gerenciar equipes distribuídas globalmente.',
                    'content': '<p>O trabalho remoto veio para ficar. Líderes modernos precisam adaptar suas habilidades para manter a cultura e a produtividade...</p>',
                    'cover_image': 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2340&auto=format&fit=crop',
                    'cat_index': 1
                },
                {
                    'title': 'Segurança de Dados em Nuvem',
                    'excerpt': 'Práticas essenciais para proteger as informações da sua empresa e dos seus clientes.',
                    'content': '<p>Com o aumento dos ataques cibernéticos, a segurança de dados tornou-se uma prioridade máxima para CIOs e gestores de TI...</p>',
                    'cover_image': 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2340&auto=format&fit=crop',
                    'cat_index': 0
                },
                {
                    'title': 'A Revolução das Fintechs',
                    'excerpt': 'Como a tecnologia está democratizando o acesso a serviços financeiros.',
                    'content': '<p>As fintechs estão desafiando os bancos tradicionais com serviços mais ágeis, baratos e centrados na experiência do usuário...</p>',
                    'cover_image': 'https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=2340&auto=format&fit=crop',
                    'cat_index': 2
                },
                {
                    'title': 'Produtividade com Ferramentas No-Code',
                    'excerpt': 'Crie soluções complexas sem escrever uma única linha de código.',
                    'content': '<p>O movimento No-Code está empoderando profissionais de todas as áreas a criarem suas próprias ferramentas e automatizações...</p>',
                    'cover_image': 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=2344&auto=format&fit=crop',
                    'cat_index': 0
                },
                {
                    'title': 'Customer Success: Além do Suporte',
                    'excerpt': 'Transforme clientes satisfeitos em advogados da sua marca.',
                    'content': '<p>Customer Success não é apenas um nome bonito para suporte. É uma estratégia proativa para garantir que seu cliente atinja os resultados desejados...</p>',
                    'cover_image': 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=2340&auto=format&fit=crop',
                    'cat_index': 3
                },
            ]

            for idx, article_data in enumerate(articles_data):
                try:
                    cat = created_categories[article_data['cat_index']] if created_categories else None
                    
                    # Check if article exists by slug to avoid duplicates
                    article, created = Article.all_objects.get_or_create(
                        company=company,
                        slug=slugify(article_data['title']),
                        defaults={
                            'title': article_data['title'],
                            'content': article_data['content'],
                            'excerpt': article_data['excerpt'],
                            'category': cat,
                            'author': author,
                            'status': Article.STATUS_PUBLISHED,
                            'published_at': timezone.now(),
                            # We can use the cover_image URL string here if the model supports storing it temporarily
                            # or if we extended it. Since we can't easily download, we will set it if the field allows or ignore.
                            # Assuming standard ImageField, passing a URL string usually fails validation or save.
                            # However, for demo purposes, if we can't save the URL, we skip it.
                            # BUT, to make the demo look good, we really want these images.
                            # Let's try to set it, if it fails, it fails gracefully.
                            # Actually, standard Django ImageField expects a file object.
                            # We will skip setting 'cover_image' to avoid errors and rely on frontend placeholders or manual edits.
                        }
                    )
                    
                    # Add random tags
                    if created_tags:
                        article.tags.set(random.sample(created_tags, k=min(len(created_tags), 2)))

                    if created:
                        self.stdout.write(self.style.SUCCESS(f'  [+] Created Article: {article.title}'))
                    else:
                        self.stdout.write(f'  [.] Article {article.title} already exists')
                        
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f'  [!] Failed to process Article {article_data["title"]}: {str(e)}'))

        self.stdout.write(self.style.SUCCESS('CMS seeding completed!'))
        
        # Health Check
        self.verify_seed_health()
    
    def verify_seed_health(self):
        """Verifica se o seed do CMS foi executado com sucesso"""
        self.stdout.write(self.style.WARNING('\n🔍 Running CMS health check...'))
        
        companies = Company.objects.all()
        total_categories = 0
        total_tags = 0
        total_articles = 0
        issues = []
        
        for company in companies:
            cat_count = Category.all_objects.filter(company=company).count()
            tag_count = Tag.all_objects.filter(company=company).count()
            art_count = Article.all_objects.filter(company=company).count()
            
            total_categories += cat_count
            total_tags += tag_count
            total_articles += art_count
            
            if cat_count == 0:
                issues.append(f'Company "{company.name}" has no categories')
            if tag_count == 0:
                issues.append(f'Company "{company.name}" has no tags')
            if art_count == 0:
                issues.append(f'Company "{company.name}" has no articles')
        
        self.stdout.write(self.style.SUCCESS(f'  ✓ Total Categories: {total_categories}'))
        self.stdout.write(self.style.SUCCESS(f'  ✓ Total Tags: {total_tags}'))
        self.stdout.write(self.style.SUCCESS(f'  ✓ Total Articles: {total_articles}'))
        self.stdout.write(self.style.SUCCESS(f'  ✓ Companies processed: {companies.count()}'))
        
        if issues:
            self.stdout.write(self.style.WARNING(f'\n⚠️  Found {len(issues)} issue(s):'))
            for issue in issues:
                self.stdout.write(self.style.WARNING(f'   • {issue}'))
        else:
            self.stdout.write(self.style.SUCCESS('\n✅ CMS health check passed!'))
