from django.core.management.base import BaseCommand
from django.db import transaction
from apps.core.models import Company
from apps.accounts.models import Role
from apps.accounts.permissions import DEFAULT_ROLES

class Command(BaseCommand):
    help = 'Cria ou atualiza os papéis (roles) padrão e suas permissões para todas as empresas'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('Iniciando atualização de papéis padrão...'))

        companies = Company.objects.all()
        
        if not companies.exists():
            self.stdout.write(self.style.WARNING('Nenhuma empresa encontrada. Rodando apenas para garantir estrutura.'))

        total_updated = 0
        
        with transaction.atomic():
            for company in companies:
                self.stdout.write(f'Processando empresa: {company.name} ({company.domain})')
                
                for role_name, role_data in DEFAULT_ROLES.items():
                    role, created = Role.objects.update_or_create(
                        company=company,
                        name=role_name,
                        defaults={
                            'description': role_data['description'],
                            'permissions': role_data['permissions'],
                            # Papéis padrão podem ser marcados como sistema se quisermos impedir deleção
                            # 'is_system_role': True 
                        }
                    )
                    
                    status = "Criado" if created else "Atualizado"
                    self.stdout.write(f'  - Role {role_name}: {status}')
                    total_updated += 1

        self.stdout.write(self.style.SUCCESS(f'Concluído! Total de papéis processados: {total_updated}'))
