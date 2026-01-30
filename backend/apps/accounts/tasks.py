from celery import shared_task
import time
import logging

logger = logging.getLogger(__name__)

@shared_task
def send_welcome_email(user_id, username, email):
    """
    Task to send a welcome email to the user.
    """
    logger.info(f"Starting to send welcome email to {username} ({email})...")
    
    # Simulate email sending latency
    time.sleep(2)
    
    # In a real scenario, we would use send_mail here
    # send_mail(
    #     "Welcome to Backbone!",
    #     f"Hello {username}, welcome to our platform.",
    #     "noreply@backbone.com",
    #     [email],
    #     fail_silently=False,
    # )
    
    logger.info(f"Welcome email sent to {username} ({email}).")
    return f"Email sent to {email}"
