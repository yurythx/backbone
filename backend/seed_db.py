import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.core.models import Company
from apps.accounts.models import Role
from django.contrib.auth import get_user_model

User = get_user_model()

from apps.module_manager.models import Module, TenantModule

# 1. Create Company
company, _ = Company.objects.get_or_create(
    slug='suporte',
    defaults={'name': 'Suporte Backbone', 'is_active': True}
)

# 2. Create Default Modules
modules_data = [
    {'code': 'articles', 'name': 'Artigos', 'description': 'Gerenciamento de blogs e notícias', 'is_default': True},
    {'code': 'messenger', 'name': 'Messenger', 'description': 'Chat em tempo real', 'is_default': True},
    {'code': 'pages', 'name': 'CMS (Páginas)', 'description': 'Gestão de páginas institucionais', 'is_default': True},
    {'code': 'finance', 'name': 'Financeiro', 'description': 'Controles financeiros e fluxo de caixa', 'is_default': False},
    {'code': 'calendar', 'name': 'Agenda', 'description': 'Eventos e compromissos', 'is_default': False},
]

for m_data in modules_data:
    module, created = Module.objects.get_or_create(
        code=m_data['code'],
        defaults={
            'name': m_data['name'],
            'description': m_data['description'],
            'is_default': m_data['is_default']
        }
    )
    if created:
        print(f"Module {m_data['code']} created.")
    
    # Enable for the default company
    TenantModule.objects.get_or_create(
        company=company,
        module=module,
        defaults={'is_active': True}
    )

# 3. Create Super Admin User
if not User.objects.filter(username='admin').exists():
    try:
        user = User.objects.create_superuser(
            username='admin',
            email='admin@localhost',
            password='password123',
            company=company
        )
        print("Admin user created.")
    except Exception as e:
        print(f"Error creating admin user: {e}")
else:
    print("Admin user exists.")

print("Backend Seeded Successfully.")
