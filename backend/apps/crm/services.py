import logging

import requests

from apps.module_manager.models import TenantModule
from shared_kernel.sanitization import sanitize_url

logger = logging.getLogger(__name__)


def get_crm_integration_config(company):
    tenant_module = (
        TenantModule.all_objects.select_related("module")
        .filter(company=company, module__code="crm", is_active=True)
        .first()
    )
    return tenant_module.config if tenant_module else {}


def send_column_change_webhook(card, previous_column, new_column):
    config = get_crm_integration_config(card.company)
    webhook_url = (
        config.get("integration", {}).get("n8n_webhook_url")
        or config.get("n8n_webhook_url")
    )
    safe_url = sanitize_url(webhook_url, allowed_protocols=["http", "https"])

    if not safe_url:
        return False

    payload = {
        "card_id": card.id,
        "external_id": card.external_id,
        "new_column_title": new_column.title if new_column else None,
        "tenant_id": str(card.company_id),
        "previous_column_title": previous_column.title if previous_column else None,
        "integration_source": card.integration_source,
    }

    try:
        requests.post(safe_url, json=payload, timeout=10)
        return True
    except requests.RequestException:
        logger.exception(
            "crm_column_change_webhook_failed",
            extra={
                "deal_id": card.id,
                "company_id": str(card.company_id),
                "webhook_url": safe_url,
            },
        )
        return False
