from django.core.management.base import BaseCommand

from apps.accounts.services import AccountService
from apps.core.models import Company


class Command(BaseCommand):
    help = "Seeds default roles (Admin, Editor, Membro) for all existing companies."

    def handle(self, *args, **options):
        companies = Company.objects.all()
        total = companies.count()
        self.stdout.write(self.style.SUCCESS(f"Starting seeding roles for {total} companies..."))

        for company in companies:
            roles_created = AccountService.ensure_default_roles(company)
            if roles_created:
                self.stdout.write(f"  Initialized roles for {company.name}: {', '.join(roles_created)}")
            else:
                self.stdout.write(f"  Roles already up-to-date for {company.name}")

        self.stdout.write(self.style.SUCCESS("Finished seeding roles."))
