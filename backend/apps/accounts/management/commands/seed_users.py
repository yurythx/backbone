from django.core.management.base import BaseCommand
from django.db import transaction

from apps.accounts.models import Role, User
from apps.core.models import Company


class Command(BaseCommand):
    help = "Creates default test users (Alexandre, Kettly, Yuri) for each company."

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING("Starting user seeding..."))

        companies = Company.objects.all()

        if not companies.exists():
            self.stdout.write(self.style.WARNING("No companies found. Skipping user seed."))
            return

        users_to_create = [
            {
                "username": "alexandre",
                "email": "alexandre@backbone.com",
                "password": "alexandre123",
                "first_name": "Alexandre",
                "last_name": "Admin",
                "role_name": "Administrador",
            },
            {
                "username": "kettly",
                "email": "kettly@backbone.com",
                "password": "kettly123",
                "first_name": "Kettly",
                "last_name": "Editor",
                "role_name": "Editor",
            },
            {
                "username": "yuri",
                "email": "yuri@backbone.com",
                "password": "yuri123",
                "first_name": "Yuri",
                "last_name": "Developer",
                "role_name": "Administrador",
            },
        ]

        with transaction.atomic():
            # Get the root company "Backbone Suporte"
            company = Company.objects.filter(slug="suporte").first()

            if not company:
                self.stdout.write(self.style.WARNING('Root Company "suporte" not found. Running seed_system first...'))
                try:
                    from django.core.management import call_command

                    call_command("seed_system")
                    company = Company.objects.filter(slug="suporte").first()
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"Failed to run seed_system: {e}"))

            if not company:
                self.stdout.write(
                    self.style.ERROR('Could not find or create "suporte" company. Ensure seed_system runs correctly.')
                )
                return

            self.stdout.write(f"Processing Root Company: {company.name}")

            for user_data in users_to_create:
                username = user_data["username"]
                role_name = user_data["role_name"]

                # Get the specific role for this user
                role = Role.objects.filter(company=company, name=role_name).first()
                if not role:
                    # Fallback to Admin if specific role not found
                    role = Role.objects.filter(company=company, name="Administrador").first()

                try:
                    with transaction.atomic():
                        # Safe role name check
                        is_admin = bool(role and role.name == "Administrador")
                        is_editor = bool(role and role.name == "Editor")

                        user, created = User.all_objects.update_or_create(
                            username=username,
                            company=company,
                            defaults={
                                "email": user_data["email"],
                                "first_name": user_data["first_name"],
                                "last_name": user_data["last_name"],
                                "role": role,
                                "is_staff": is_admin or is_editor,
                                "is_superuser": is_admin,
                            },
                        )

                        if created:
                            user.set_password(user_data["password"])
                            user.save()
                            self.stdout.write(
                                self.style.SUCCESS(
                                    f"  [+] Created User: {username} ({role.name if role else 'No Role'})"
                                )
                            )
                        else:
                            user.set_password(user_data["password"])
                            user.save()
                            self.stdout.write(f"  [.] User {username} updated")

                except Exception as e:
                    # If user exists but update_or_create failed (e.g. duplicate username across tenants but we are forcing root), try getting and updating
                    try:
                        # Safe role name check again
                        is_admin = bool(role and role.name == "Administrador")
                        is_editor = bool(role and role.name == "Editor")

                        user = User.all_objects.get(username=username)
                        user.company = company
                        user.role = role
                        user.is_staff = is_admin or is_editor
                        user.is_superuser = is_admin
                        user.set_password(user_data["password"])
                        user.save()
                        self.stdout.write(
                            self.style.SUCCESS(f"  [.] User {username} reassigned to {company.name} and updated.")
                        )
                    except Exception as inner_e:
                        self.stdout.write(
                            self.style.WARNING(f"  [!] Failed to process User {username}: {e!s} | Inner: {inner_e!s}")
                        )

        self.stdout.write(self.style.SUCCESS("User seeding completed!"))
