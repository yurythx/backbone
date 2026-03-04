import logging
from django.contrib.auth.models import AnonymousUser
from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from rest_framework_simplejwt.tokens import UntypedToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from django.contrib.auth import get_user_model
from jwt import decode as jwt_decode
from django.conf import settings
from urllib.parse import parse_qs

logger = logging.getLogger(__name__)

User = get_user_model()

@database_sync_to_async
def get_user(validated_token):
    try:
        user_id = validated_token['user_id']
        # Use all_objects to bypass tenant filter (context is empty in ASGI)
        # select_related('company') ensures we have the tenant context available in the consumer
        return User.all_objects.select_related('company').get(id=user_id)
    except (User.DoesNotExist, Exception) as e:
        logger.warning(f"[JwtAuthMiddleware] User {user_id} not found: {e}")
        return AnonymousUser()

class JwtAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        # Parse query string
        query_string = scope.get("query_string", b"").decode("utf-8")
        query_params = parse_qs(query_string)
        token = query_params.get("token", [None])[0]

        if token:
            try:
                # Verify token validity
                UntypedToken(token)
                
                # Decode manually to avoid sync db access inside simplejwt calls if any
                decoded_data = jwt_decode(token, settings.SECRET_KEY, algorithms=["HS256"])
                
                # Get user from DB
                user = await get_user(decoded_data)
                scope["user"] = user
                
                if user.is_authenticated:
                    logger.debug(f"[JwtAuthMiddleware] Authenticated user: {user.username}")
                else:
                    logger.warning("[JwtAuthMiddleware] Token valid but user search returned AnonymousUser")
                
            except (InvalidToken, TokenError, Exception) as e:
                # Token invalid
                logger.warning(f"[JwtAuthMiddleware] Authentication failed: {str(e)}")
                scope["user"] = AnonymousUser()
        else:
            logger.debug("[JwtAuthMiddleware] No token provided in WebSocket connection")
            scope["user"] = AnonymousUser()

        return await super().__call__(scope, receive, send)
