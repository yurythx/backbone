import environ
import os
from pathlib import Path
from datetime import timedelta
from django.core.exceptions import ImproperlyConfigured

env = environ.Env(
    DEBUG=(bool, False)
)

BASE_DIR = Path(__file__).resolve().parent.parent
environ.Env.read_env(os.path.join(BASE_DIR, '.env'))

# SECURITY: SECRET_KEY is required and must be set via environment variable
# Generate with: python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'
SECRET_KEY = env("SECRET_KEY")

if not SECRET_KEY:
    raise ImproperlyConfigured(
        "SECRET_KEY must be set in environment variables. "
        "Generate one with: python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'"
    )

DEBUG = env("DEBUG")
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["*"])

INSTALLED_APPS = [
    "daphne",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third party
    "rest_framework",
    "corsheaders",
    "channels",
    "rest_framework_simplejwt",
    "drf_spectacular",
    "reversion", # Version control
    "storages",  # Django Storages
    "django_celery_beat",
    "django_filters",
    # Local apps
    "apps.core",
    "apps.accounts.apps.AccountsConfig",
    "apps.licensing",
    "apps.module_manager",
    "apps.pages",
    "apps.articles",
    "apps.messenger",
    "apps.media",
    "apps.notifications",
    "apps.seo",
    "apps.webhooks",
    "apps.api_keys",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",  # Whitenoise for static files
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "csp.middleware.CSPMiddleware",  # Content Security Policy
    "shared_kernel.middleware.TenantMiddleware",
    "shared_kernel.middleware.LicensingMiddleware",
    "shared_kernel.logging_middleware.StructuredLoggingMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "shared_kernel.middleware.TenantSecurityMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

# Authentication Backends (LDAP + Standard)
AUTHENTICATION_BACKENDS = [
    'apps.core.ldap_backend.TenantLDAPBackend',  # LDAP multi-tenant
    'django.contrib.auth.backends.ModelBackend',  # Fallback padrão
]

REST_FRAMEWORK = {
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'config.pagination.DefaultPagination',
    'PAGE_SIZE': 10,
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework.authentication.BasicAuthentication',
    ],
    'DEFAULT_THROTTLE_CLASSES': [
        'shared_kernel.throttling.TenantRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        # SECURITY: Adjusted to realistic values to prevent abuse
        # tenant: authenticated users per company (1000 req/day = ~1 req/90sec)
        # anon: unauthenticated requests (100 req/day for onboarding, public endpoints)
        'tenant': '1000/day', 
        'anon': '100/day',
    }
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=1),
    "ROTATE_REFRESH_TOKENS": False,
    "BLACKLIST_AFTER_ROTATION": False,
    "UPDATE_LAST_LOGIN": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# Health check behavior in development
HEALTH_IGNORE_REDIS = env.bool("HEALTH_IGNORE_REDIS", default=False)

SPECTACULAR_SETTINGS = {
    'TITLE': 'Backbone SaaS API',
    'DESCRIPTION': 'API Multi-tenant para SaaS BlackBone',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
    'ENUM_NAME_OVERRIDES': {
        'StatusEnum': 'apps.core.models.StatusChoices',
    },
    'COMPONENT_NO_READ_ONLY_FIELDS': True,
    'CONTACT': {
        'name': 'Backbone Team',
        'email': 'support@backbone.com',
    },
    'APPEND_COMPONENTS': {
        'securitySchemes': {
            'ApiKeyAuth': {
                'type': 'apiKey',
                'in': 'header',
                'name': 'X-Company-Slug',
            }
        }
    },
    'SECURITY': [{'jwtAuth': []}, {'ApiKeyAuth': []}],
}

# CORS Configuration
# SECURITY: Always use explicit whitelist, never allow all origins
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = env.list(
    "CORS_ALLOWED_ORIGINS",
    default=[
        "http://localhost:3005",
        "http://127.0.0.1:3005",
    ] if DEBUG else []
)

if not DEBUG and not CORS_ALLOWED_ORIGINS:
    raise ImproperlyConfigured(
        "CORS_ALLOWED_ORIGINS must be set in production environment. "
        "Set the CORS_ALLOWED_ORIGINS environment variable."
    )

CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS", default=[
    "https://backbone.projetoravenna.cloud",
    "https://api.backbone.projetoravenna.cloud",
    "http://192.168.1.121:3005",
    "http://192.168.1.121:8005",
    "http://localhost:3005",
    "http://localhost:8005",
])

# Trust X-Forwarded-Host from Cloudflare/Proxy
USE_X_FORWARDED_HOST = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=[
    "api.backbone.projetoravenna.cloud",
    "backbone.projetoravenna.cloud",
    "192.168.1.121",
    "localhost",
    "127.0.0.1"
])

CORS_ALLOW_HEADERS = [
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
    "x-company-slug",
    "X-Company-Slug",
    "X-COMPANY-SLUG",
]

# Static & Media Files
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
if not DEBUG:
    STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

# MinIO / S3 Configuration
USE_S3 = env.bool("USE_S3", default=False)

if USE_S3:
    AWS_ACCESS_KEY_ID = env("AWS_ACCESS_KEY_ID", default="minioadmin")
    AWS_SECRET_ACCESS_KEY = env("AWS_SECRET_ACCESS_KEY", default="minioadmin")
    AWS_STORAGE_BUCKET_NAME = env("AWS_STORAGE_BUCKET_NAME", default="backbone-media")
    AWS_S3_ENDPOINT_URL = env("AWS_S3_ENDPOINT_URL", default="http://minio:9000")
    AWS_S3_REGION_NAME = env("AWS_S3_REGION_NAME", default="us-east-1")
    AWS_S3_SIGNATURE_VERSION = "s3v4"
    
    # Static files on S3
    # AWS_STATIC_LOCATION = 'static'
    # STATICFILES_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
    
    # Media files on S3
    AWS_MEDIA_LOCATION = 'media'
    DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
    
    # Configuração para Proxy de Media (MinIO interno -> API externa)
    # Gera URLs como: https://api.backbone.../media/caminho/arquivo.jpg
    # O endpoint /media/ na API fará o proxy para o MinIO
    AWS_S3_CUSTOM_DOMAIN = f'{ALLOWED_HOSTS[0]}/media' 
    AWS_QUERYSTRING_AUTH = False # Não assinar URLs (o proxy autentica ou é público)
    
    MEDIA_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/'
else:
    MEDIA_URL = '/media/'
    MEDIA_ROOT = BASE_DIR / 'media'

# Email Configuration
EMAIL_BACKEND = env.str("EMAIL_BACKEND", default="django.core.mail.backends.console.EmailBackend")
EMAIL_HOST = env.str("EMAIL_HOST", default="localhost")
EMAIL_PORT = env.int("EMAIL_PORT", default=1025)
EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", default=False)
EMAIL_HOST_USER = env.str("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env.str("EMAIL_HOST_PASSWORD", default="")
DEFAULT_FROM_EMAIL = env.str("DEFAULT_FROM_EMAIL", default="Backbone <noreply@backbone.io>")
SERVER_EMAIL = DEFAULT_FROM_EMAIL
FRONTEND_URL = env.str("FRONTEND_URL", default="http://localhost:3005")

# Channels
ASGI_APPLICATION = "config.asgi.application"

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {
    "default": env.db("DATABASE_URL", default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}")
}

# Redis Channel Layer & Cache
REDIS_URL = env("REDIS_URL", default=None)

if REDIS_URL:
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels_redis.core.RedisChannelLayer",
            "CONFIG": {
                "hosts": [REDIS_URL],
            },
        },
    }
    
    # Redis Cache Configuration
    CACHES = {
        "default": {
            "BACKEND": "django_redis.cache.RedisCache",
            "LOCATION": REDIS_URL,
            "OPTIONS": {
                "CLIENT_CLASS": "django_redis.client.DefaultClient",
                "KEY_FUNCTION": "shared_kernel.utils.make_key_with_tenant",
            }
        }
    }
    
    # Cache Session (Optional but recommended)
    # SESSION_ENGINE = "django.contrib.sessions.backends.cache"
    # SESSION_CACHE_ALIAS = "default"
else:
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels.layers.InMemoryChannelLayer"
        }
    }
    # Local memory cache for dev
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "unique-snowflake",
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
AUTH_USER_MODEL = "accounts.User"

# Logging Configuration
# Logging Configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
        'json': {
            '()': 'pythonjsonlogger.jsonlogger.JsonFormatter',
            'format': '%(levelname)s %(asctime)s %(module)s %(message)s %(request_id)s %(user_id)s %(tenant)s',
        }
    },
    'handlers': {
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'json' if not DEBUG else 'verbose',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': True,
        },
        'django.request': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}

# Web Push (VAPID) Settings
# Generate keys with: pywebpush generate-vapid-keys
VAPID_PUBLIC_KEY = env('VAPID_PUBLIC_KEY', default='BBA-PLACEHOLDER-FOR-VAPID-PUBLIC-KEY-MUST-BE-65-CHARS-LONG-BASE64')
VAPID_PRIVATE_KEY = env('VAPID_PRIVATE_KEY', default='-PLACEHOLDER-FOR-VAPID-PRIVATE-KEY-BASE64')
VAPID_ADMIN_EMAIL = env('VAPID_ADMIN_EMAIL', default='admin@backbone.com')

# AI Settings
GEMINI_API_KEY = env('GEMINI_API_KEY', default='')
OPENAI_API_KEY = env('OPENAI_API_KEY', default='')
# Sentry Configuration
SENTRY_DSN = env("SENTRY_DSN", default=None)
if SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.django import DjangoIntegration
    from sentry_sdk.integrations.redis import RedisIntegration
    from sentry_sdk.integrations.celery import CeleryIntegration
    
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[
            DjangoIntegration(),
            RedisIntegration(),
            CeleryIntegration(),
        ],
        traces_sample_rate=0.1,
        send_default_pii=True,
        environment=env("SENTRY_ENVIRONMENT", default="production"),
    )

# Celery Configuration
CELERY_BROKER_URL = REDIS_URL or "redis://localhost:6379/0"
CELERY_RESULT_BACKEND = REDIS_URL or "redis://localhost:6379/0"
CELERY_ACCEPT_CONTENT = ['application/json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE
CELERY_TASK_ALWAYS_EAGER = env.bool("CELERY_TASK_ALWAYS_EAGER", default=DEBUG)
CELERY_TASK_EAGER_PROPAGATES = env.bool("CELERY_TASK_EAGER_PROPAGATES", default=DEBUG)
CELERY_TASK_IGNORE_RESULT = True

# Field Encryption (for sensitive data like SMTP passwords)
# Generate key with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
FIELD_ENCRYPTION_KEY = env('FIELD_ENCRYPTION_KEY', default=None)

# Content Security Policy (CSP)
from .csp_config import *  # noqa

