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
            invite = Invitation.objects.get(token=token, status='pending')
            
            if invite.is_expired:
                invite.status = 'expired'
                invite.save()
                return None, "Este convite expirou."
                
            # Create user
            user = User.objects.create_user(
                company=invite.company,
                username=invite.email,
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
