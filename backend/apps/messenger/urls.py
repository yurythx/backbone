from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ConversationViewSet, ContactViewSet

router = DefaultRouter()
router.register(r'conversations', ConversationViewSet, basename='conversations')
router.register(r'contacts', ContactViewSet, basename='contacts')

urlpatterns = [
    path('', include(router.urls)),
]
