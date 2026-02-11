from django.core.management.base import BaseCommand
from django.db import transaction
from apps.core.models import Company
from apps.accounts.models import User, Role
from apps.accounts.permissions import DEFAULT_ROLES

class Command(BaseCommand):
    help = 'Creates default test users (Alexandre, Kettly, Yuri) for each company.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('Starting user seeding...'))

        companies = Company.objects.all()
        
        if not companies.exists():
             self.stdout.write(self.style.WARNING('No companies found. Skipping user seed.'))
             return

        users_to_create = [
            {'username': 'alexandre', 'email': 'alexandre@backbone.com', 'password': 'alexandre123', 'first_name': 'Alexandre', 'last_name': 'Admin'},
            {'username': 'kettly', 'email': 'kettly@backbone.com', 'password': 'kettly123', 'first_name': 'Kettly', 'last_name': 'Editor'},
            {'username': 'yuri', 'email': 'yuri@backbone.com', 'password': 'yuri123', 'first_name': 'Yuri', 'last_name': 'Developer'},
        ]

        with transaction.atomic():
            for company in companies:
                self.stdout.write(f'Processing Company: {company.name}')
                
                # Get the 'Admin' role or fallback to first available
                admin_role = Role.objects.filter(company=company, name='Administrador').first()
                if not admin_role:
                    admin_role = Role.objects.filter(company=company).first()
                
                for user_data in users_to_create:
                    username = user_data['username']
                    # Ensure username is unique per company logic or global? AbstractUser is global unique username.
                    # We will append company slug if needed, but for simplicity let's try direct first.
                    # If global username collision, we skip or update.
                    
                    try:
                        user, created = User.objects.update_or_create(
                            username=username,
                            defaults={
                                'email': user_data['email'],
                                'first_name': user_data['first_name'],
                                'last_name': user_data['last_name'],
                                'company': company,
                                'role': admin_role,
                                'is_staff': True, # Give them access to admin just in case
                                'is_superuser': True # Give them full power as requested "tudo liberado"
                            }
                        )
                        
                        if created:
                            user.set_password(user_data['password'])
                            user.save()
                            self.stdout.write(self.style.SUCCESS(f'  [+] Created User: {username}'))
                        else:
                            # If updating, maybe reset password too? Let's ensure password is set.
                            user.set_password(user_data['password'])
                            user.save()
                            self.stdout.write(f'  [.] User {username} updated')
                            
                    except Exception as e:
                        self.stdout.write(self.style.WARNING(f'  [!] Failed to process User {username}: {str(e)}'))

        self.stdout.write(self.style.SUCCESS('User seeding completed!'))
