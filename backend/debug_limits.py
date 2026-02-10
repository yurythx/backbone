from apps.core.models import Company
from apps.accounts.models import User
from shared_kernel.licensing import check_feature_limit
import django
import os

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

for company in Company.objects.all():
    can_add, limit, current = check_feature_limit(company, 'max_users')
    print(f'Company: {company.name} ({company.slug})')
    print(f'  Limit: {limit}, Current: {current}, Can Add: {can_add}')
