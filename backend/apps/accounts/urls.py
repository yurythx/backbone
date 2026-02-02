from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenRefreshView,
)
from .views import (
    UserRegistrationView, UserViewSet, RoleViewSet,
    PasswordResetRequestView, PasswordResetConfirmView,
    InvitationViewSet, AcceptInvitationView,
    CustomTokenObtainPairView
)
from .theme_views import UserThemePreferenceViewSet

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='users')
router.register(r'roles', RoleViewSet, basename='roles')
router.register(r'invitations', InvitationViewSet, basename='invitations')
router.register(r'preferences/theme', UserThemePreferenceViewSet, basename='user-theme-preferences')

urlpatterns = [
    path('register/', UserRegistrationView.as_view(), name='register'),
    path('password-reset/', PasswordResetRequestView.as_view(), name='password_reset_request'),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    path('invitations/accept/', AcceptInvitationView.as_view(), name='accept_invitation'),
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('', include(router.urls)),
]
