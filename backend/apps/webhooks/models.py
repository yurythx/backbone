import secrets

from django.db import models
from django.utils.translation import gettext_lazy as _

from shared_kernel.models import BaseTenantModel


class WebhookEvent(models.TextChoices):
    ARTICLE_CREATED = "article.created", _("Artigo Criado")
    ARTICLE_PUBLISHED = "article.published", _("Artigo Publicado")
    ARTICLE_UPDATED = "article.updated", _("Artigo Atualizado")
    ARTICLE_DELETED = "article.deleted", _("Artigo Deletado")
    PAGE_CREATED = "page.created", _("Página Criada")
    CONTACT_RECEIVED = "contact.received", _("Contato Recebido")
    USER_INVITED = "user.invited", _("Usuário Convidado")


class WebhookSubscription(BaseTenantModel):
    url = models.URLField(_("URL de Destino"), max_length=500)
    secret = models.CharField(_("Segredo de Assinatura"), max_length=255, default=secrets.token_hex)
    is_active = models.BooleanField(_("Ativo"), default=True)

    # Armazenar eventos como lista (JSON) ou M2M se formos sofisticados.
    # Para simplicidade e performance em Webhooks, JSONField é excelente.
    events = models.JSONField(_("Eventos Subscritos"), default=list)
    description = models.CharField(_("Descrição/Nome"), max_length=200, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Assinatura de Webhook")
        verbose_name_plural = _("Assinaturas de Webhook")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.description or self.url} ({self.company.slug})"

    def save(self, *args, **kwargs):
        if not self.secret:
            self.secret = secrets.token_hex(32)
        super().save(*args, **kwargs)
