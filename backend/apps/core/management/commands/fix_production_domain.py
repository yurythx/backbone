from django.core.management.base import BaseCommand
from apps.core.models import Company

class Command(BaseCommand):
    help = 'Alinha o domínio e slug da empresa raiz com o ambiente de produção'

    def handle(self, *args, **options):
        # Procura a empresa raiz padrão (slug raiz) ou a primeira empresa cadastrada
        company = Company.objects.filter(slug='raiz').first() or Company.all_companies.first()
        
        if company:
            old_domain = company.domain
            company.slug = 'projetoravenna'
            company.domain = 'projetoravenna.cloud'
            company.name = 'Ravenna'
            company.save()
            self.stdout.write(self.style.SUCCESS(f'✓ Empresa alinhada com sucesso!'))
            self.stdout.write(f'  - De: {old_domain}')
            self.stdout.write(f'  - Para: {company.domain} (slug: {company.slug})')
        else:
            self.stdout.write(self.style.ERROR('✗ Nenhuma empresa encontrada no banco de dados para alinhar.'))
