import logging
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings
from celery import shared_task

logger = logging.getLogger(__name__)

@shared_task(bind=True, max_retries=3)
def send_email_task(self, subject, recipient_list, template_name, context, from_email=None):
    """
    Tarefa Celery para envio de e-mails em background.
    """
    if not from_email:
        from_email = settings.DEFAULT_FROM_EMAIL
        
    try:
        html_content = render_to_string(template_name, context)
        text_content = strip_tags(html_content)
        
        email = EmailMultiAlternatives(
            subject,
            text_content,
            from_email,
            recipient_list
        )
        email.attach_alternative(html_content, "text/html")
        email.send()
        
        logger.info(f"Email enviado com sucesso para: {recipient_list}")
        return True
        
    except Exception as e:
        logger.error(f"Erro ao enviar email para {recipient_list}: {str(e)}")
        # Retenta em caso de erro temporário (ex: timeout do servidor SMTP)
        raise self.retry(exc=e, countdown=60)

def send_notification_email(subject, recipient_list, template_name, context, from_email=None):
    """
    Wrapper para disparar a tarefa Celery.
    """
    send_email_task.delay(subject, recipient_list, template_name, context, from_email)
