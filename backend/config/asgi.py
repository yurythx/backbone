import os
import django
from django.core.asgi import get_asgi_application

# Setup Django before importing Channels
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from shared_kernel.channels_middleware import JwtAuthMiddleware
import apps.messenger.routing

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": JwtAuthMiddleware(
        URLRouter(
            apps.messenger.routing.websocket_urlpatterns
        )
    ),
})
