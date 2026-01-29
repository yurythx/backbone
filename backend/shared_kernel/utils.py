import os
from django.utils.encoding import smart_str
from shared_kernel.tenant_context import get_current_company

def tenant_upload_to(directory):
    """
    Returns a function to be used as upload_to in FileField/ImageField.
    The path will be: tenants/{company_slug}/{directory}/{filename}
    """
    def upload_handler(instance, filename):
        company_slug = 'public'
        if hasattr(instance, 'company') and instance.company:
            company_slug = instance.company.slug
        
        # Ensure unique filename if needed, but for now just keep original
        return os.path.join(f'tenants/{company_slug}', directory, filename)
    
    return upload_handler

def make_key_with_tenant(key, key_prefix, version):
    """
    Custom key function for django-redis to prefix keys with company slug.
    Format: {key_prefix}:{version}:{company_slug}:{key}
    """
    company = get_current_company()
    company_slug = company.slug if company else 'public'
    
    return ':'.join([
        smart_str(key_prefix),
        smart_str(version),
        smart_str(company_slug),
        smart_str(key)
    ])
