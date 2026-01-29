from django.contrib.auth.models import AnonymousUser
from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from rest_framework_simplejwt.tokens import UntypedToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from django.contrib.auth import get_user_model
from jwt import decode as jwt_decode
from django.conf import settings
from urllib.parse import parse_qs

User = get_user_model()

@database_sync_to_async
def get_user(validated_token):
    try:
        user_id = validated_token['user_id']
        # Use all_objects to bypass tenant filter (context is empty in ASGI)
        return User.all_objects.get(id=user_id)
    except (User.DoesNotExist, Exception):
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
                scope["user"] = await get_user(decoded_data)
                
            except (InvalidToken, TokenError, Exception):
                # Token invalid
                scope["user"] = AnonymousUser()
        else:
            scope["user"] = AnonymousUser()

        return await super().__call__(scope, receive, send)
