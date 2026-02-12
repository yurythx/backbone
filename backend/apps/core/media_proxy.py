import mimetypes
import logging
from django.http import StreamingHttpResponse, Http404, HttpResponse
from django.core.files.storage import default_storage
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from django.conf import settings

logger = logging.getLogger(__name__)

class MediaProxyView(APIView):
    """
    Proxy para servir arquivos de media do Storage (S3/MinIO) através da API.
    Isso permite acessar arquivos do MinIO interno sem expô-lo publicamente.
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request, path):
        # Proteção básica contra path traversal (embora o storage já trate isso)
        if '..' in path:
             raise Http404

        # Se estiver usando S3, o path pode precisar de ajuste dependendo de como foi salvo
        # Mas geralmente o path vindo da URL bate com o path no bucket (ex: avatars/img.jpg)
        
        # Em algumas configs do django-storages com S3, o nome do arquivo pode incluir o prefixo 'media/'
        # Vamos tentar encontrar o arquivo
        file_path = path
        
        # Se configuramos AWS_MEDIA_LOCATION = 'media', o arquivo real no bucket pode estar em 'media/path'
        if hasattr(settings, 'AWS_MEDIA_LOCATION') and settings.AWS_MEDIA_LOCATION:
             if not file_path.startswith(f"{settings.AWS_MEDIA_LOCATION}/"):
                  # Tenta prefixar se não encontrar direto
                  if not default_storage.exists(file_path):
                       file_path = f"{settings.AWS_MEDIA_LOCATION}/{path}"

        if not default_storage.exists(file_path):
            raise Http404(f"File not found: {file_path}")

        try:
            file = default_storage.open(file_path, 'rb')
            content_type, encoding = mimetypes.guess_type(file_path)
            content_type = content_type or 'application/octet-stream'

            response = StreamingHttpResponse(file, content_type=content_type)
            response['Content-Disposition'] = 'inline'
            # Cache headers para performance (1 dia)
            response['Cache-Control'] = 'public, max-age=86400'
            return response
        except Exception as e:
            print(f"Error serving media: {e}")
            raise Http404
