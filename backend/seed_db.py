import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.core.models import Company
from apps.accounts.models import Role
from django.contrib.auth import get_user_model

User = get_user_model()

# 1. Create Company
company, _ = Company.objects.get_or_create(
    slug='suporte',
    defaults={'name': 'Suporte Backbone', 'is_active': True}
)

# 2. Create Super Admin User
if not User.objects.filter(username='admin').exists():
    user = User.objects.create_superuser(
        username='admin',
        email='admin@localhost',
        password='password123',
        company=company
    )
    print("Admin user created.")
else:
    print("Admin user exists.")

print("Backend Seeded Successfully.")
