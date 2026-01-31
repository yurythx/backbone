import uuid
from django.db import models
from django.conf import settings
from shared_kernel.models import BaseTenantModel

class Company(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    slug = models.SlugField(unique=True)
    domain = models.CharField(max_length=255, blank=True, null=True, unique=True)
    branding = models.JSONField(default=dict, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class TenantBranding(models.Model):
    """
    Configurações de white-label por tenant/empresa.
    Permite personalizar logo, ícone e cores da interface.
    """
    PALETTE_CHOICES = (
        ('django-green', 'Django Green'),
        ('ocean-blue', 'Ocean Blue'),
        ('royal-purple', 'Royal Purple'),
        ('sunset-orange', 'Sunset Orange'),
        ('forest-green', 'Forest Green'),
        ('slate-gray', 'Slate Gray'),
    )
    
    company = models.OneToOneField(
        Company, 
        on_delete=models.CASCADE,
        related_name='theme_branding'
    )
    company_name = models.CharField(
        max_length=200,
        help_text="Nome customizado da empresa (pode diferir do Company.name)"
    )
    logo = models.ImageField(
        upload_to='branding/logos/',
        blank=True,
        null=True,
        help_text="Logo da empresa (PNG/SVG, max 2MB)"
    )
    icon = models.ImageField(
        upload_to='branding/icons/',
        blank=True,
        null=True,
        help_text="Ícone/favicon (ICO/PNG, recomendado 32x32 ou 64x64)"
    )
    primary_color = models.CharField(
        max_length=7,
        default='#0C4B33',
        help_text="Cor primária em hexadecimal (ex: #0C4B33)"
    )
    theme_palette = models.CharField(
        max_length=50,
        choices=PALETTE_CHOICES,
        default='django-green',
        help_text="Paleta de cores pré-estabelecida"
    )
    
    # Footer Customization
    footer_text = models.CharField(
        max_length=255, 
        blank=True, 
        help_text="Texto exibido no rodapé (ex: Todos os direitos reservados)"
    )
    facebook_url = models.URLField(blank=True, null=True)
    instagram_url = models.URLField(blank=True, null=True)
    linkedin_url = models.URLField(blank=True, null=True)
    twitter_url = models.URLField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Tenant Branding"
        verbose_name_plural = "Tenant Brandings"

    def __str__(self):
        return f"Branding for {self.company.name}"


class TenantEmailConfig(models.Model):
    """
    Configurações de SMTP customizado por tenant.
    """
    company = models.OneToOneField(
        Company,
        on_delete=models.CASCADE,
        related_name='email_config'
    )
    use_custom_smtp = models.BooleanField(
        default=False,
        help_text="Se ativado, utiliza as configurações abaixo em vez do SMTP padrão do sistema."
    )
    smtp_host = models.CharField(max_length=255, blank=True)
    smtp_port = models.IntegerField(default=587)
    smtp_user = models.CharField(max_length=255, blank=True)
    smtp_password = models.CharField(max_length=255, blank=True, help_text="Senha do servidor SMTP")
    smtp_use_tls = models.BooleanField(default=True)
    from_email = models.EmailField(blank=True, help_text="E-mail remetente (ex: contato@empresa.com)")

    def __str__(self):
        return f"SMTP Config for {self.company.name}"


class AuditLog(BaseTenantModel):
    """
    Registro de auditoria de ações críticas.
    """
    ACTION_CHOICES = (
        ('create', 'Create'),
        ('update', 'Update'),
        ('delete', 'Delete'),
        ('login', 'Login'),
        ('logout', 'Logout'),
        ('export', 'Export'),
        ('other', 'Other'),
    )

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    resource = models.CharField(max_length=100, help_text="Ex: User, Article, Settings")
    resource_id = models.CharField(max_length=100, blank=True, null=True)
    details = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user} - {self.action} {self.resource} - {self.created_at}"

