import os
import sys
import django
import traceback

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

def run_debug():
    print("--- Django Debug Script ---")
    try:
        print("1. Checking Database Connection...")
        # TODO:
        # - [x] Validar fluxo de login com o novo seletor (Identificado erro 500 - Em correção)
        # - [ ] Corrigir Erro 500 e CORS no Backend
        # - [ ] Restaurar responsividade dos containers
        # - [ ] Review final e documentação
        from django.db import connection
        connection.ensure_connection()
        print("✓ DB Connection OK")

        print("2. Importing Company model...")
        from apps.core.models import Company
        print("✓ Import OK")

        print("3. Querying Companies...")
        companies = list(Company.objects.all().only('name', 'slug'))
        print(f"✓ Found {len(companies)} companies")
        for c in companies:
            print(f"  - {c.name} ({c.slug})")

        print("4. Testing Token endpoint logic (User model)...")
        from apps.accounts.models import User
        user_count = User.all_objects.count()
        print(f"✓ Found {user_count} users")

    except Exception:
        print("\n!!! ERROR DETECTED !!!")
        traceback.print_exc()

if __name__ == "__main__":
    run_debug()
