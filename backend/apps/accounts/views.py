from rest_framework import generics, permissions
from .serializers import UserRegistrationSerializer
from django.contrib.auth import get_user_model

User = get_user_model()

class UserRegistrationView(generics.CreateAPIView):
    queryset = User.all_objects.all() # all_objects pois o tenant context pode não estar setado no registro
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]
