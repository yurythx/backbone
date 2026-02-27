from django.contrib.auth import get_user_model
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.contrib.auth.tokens import default_token_generator
from django.conf import settings
from django.utils import timezone
from shared_kernel.email import send_notification_email
from .models import Role, Invitation

User = get_user_model()

class AccountService:
    @staticmethod
    def request_password_reset(email):
        """
        Generates a password reset token and sends an email to the user.
        """
        try:
            user = User.all_objects.get(email=email)
            token = default_token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            
            reset_url = f"{settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}"
            
            send_notification_email(
                subject="Recuperação de Senha - Backbone",
                recipient_list=[email],
                template_name="emails/password_reset.html",
                context={
                    "reset_url": reset_url,
                    "subject": "Recuperação de Senha"
                }
            )
            return True
        except User.DoesNotExist:
            return False

    @staticmethod
    def confirm_password_reset(uid, token, new_password):
        """
        Confirms the password reset with the provided token and UID.
        """
        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.all_objects.get(pk=user_id)
            
            if default_token_generator.check_token(user, token):
                user.set_password(new_password)
                user.save()
                return True
            return False
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return False

    @staticmethod
    def create_invitation(sender, company, email, role):
        """
        Creates an invitation and sends the invitation email.
        """
        invitation = Invitation.objects.create(
            company=company,
            invited_by=sender,
            email=email,
            role=role
        )
        
        invite_url = f"{settings.FRONTEND_URL}/accept-invite?token={invitation.token}"
        
        send_notification_email(
            subject=f"Convite para {company.name} - Backbone",
            recipient_list=[email],
            template_name="emails/invitation.html",
            context={
                "company_name": company.name,
                "invite_url": invite_url,
                "subject": "Convite de Acesso"
            }
        )
        return invitation

    @staticmethod
    def accept_invitation(token, first_name, last_name, password):
        """
        Validates the invitation token and creates a new user.
        """
        try:
            invite = Invitation.all_objects.get(token=token, status='pending')

            if invite.is_expired:
                invite.status = 'expired'
                invite.save()
                return None, "Este convite expirou."

            # A6: gerar username único — email como username pode causar IntegrityError
            # se o mesmo email for convidado por dois tenants diferentes
            base_username = f"{invite.email.split('@')[0]}_{invite.company.slug}"
            # Limita o comprimento (AbstractUser.username max_length=150)
            base_username = base_username[:140]
            username = base_username
            counter = 1
            while User.all_objects.filter(username=username).exists():
                username = f"{base_username}_{counter}"
                counter += 1

            # Create user
            user = User.objects.create_user(
                company=invite.company,
                username=username,
                email=invite.email,
                first_name=first_name,
                last_name=last_name,
                password=password,
                role=invite.role
            )

            # Update invitation status
            invite.status = 'accepted'
            invite.accepted_at = timezone.now()
            invite.save()

            return user, None

        except Invitation.DoesNotExist:
            return None, "Convite inválido ou já utilizado."
    @staticmethod
    def ensure_default_roles(company):
        """
        Garante que os papéis padrão existam para a empresa.
        Útil para inicializar novas empresas ou migrar as existentes.
        """
        from .permissions import DEFAULT_ROLES
        from django.db import IntegrityError, transaction
        
        roles_processed = []
        for role_name, config in DEFAULT_ROLES.items():
            try:
                with transaction.atomic():
                    role, created = Role.all_objects.get_or_create(
                        company=company,
                        name=role_name,
                        defaults={
                            'description': config['description'],
                            'permissions': config['permissions'],
                            'is_system_role': True
                        }
                    )
                    if not created and role.is_system_role:
                        role.permissions = config['permissions']
                        role.description = config['description']
                        role.save(update_fields=['permissions', 'description'])
            except IntegrityError:
                # Race condition: someone created it between get and create.
                # Recover by fetching and updating using the global manager.
                role = Role.all_objects.get(company=company, name=role_name)
                if role.is_system_role:
                    role.permissions = config['permissions']
                    role.description = config['description']
                    role.save(update_fields=['permissions', 'description'])
            
            roles_processed.append(role_name)
        
        return roles_processed
