import os
import django
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from channels.security.websocket import AllowedHostsOriginValidator
from shared_kernel.channels_middleware import JwtAuthMiddleware
import apps.messenger.routing
import apps.notifications.routing

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AllowedHostsOriginValidator(
        JwtAuthMiddleware(
            URLRouter(
                apps.messenger.routing.websocket_urlpatterns + 
                apps.notifications.routing.websocket_urlpatterns
            )
        )
    ),
})
