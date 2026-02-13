import os
import sys
import django

# Setup Django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.core.models import Company
from apps.module_manager.models import Module, TenantModule

def enable_modules():
    c = Company.objects.first()
    if not c:
        print("No company found.")
        return

    print(f"Company: {c.name}")
    
    modules_to_enable = [
        ('messenger', 'Messenger'),
        ('pages', 'CMS Pages'),
        ('articles', 'Articles')
    ]

    for code, name in modules_to_enable:
        mod, _ = Module.objects.get_or_create(code=code, defaults={'name': name})
        
        try:
            tm = TenantModule.objects.get(company=c, module=mod)
            if not tm.is_active:
                tm.is_active = True
                tm.save()
                print(f"Re-enabled module: {code}")
            else:
                print(f"Module already active: {code}")
        except TenantModule.DoesNotExist:
            try:
                tm = TenantModule(company=c, module=mod, is_active=True)
                tm.save()
                print(f"Enabled module: {code}")
            except Exception as e:
                # Se falhar aqui, provavelmente é IntegrityError por concorrência ou dados sujos
                print(f"Failed to enable module {code}: {e}")
                # Tentar recuperar novamente para confirmar
                try:
                    tm = TenantModule.objects.get(company=c, module=mod)
                    if not tm.is_active:
                        tm.is_active = True
                        tm.save()
                        print(f"Recovered and enabled module: {code}")
                except:
                    pass

if __name__ == "__main__":
    enable_modules()
