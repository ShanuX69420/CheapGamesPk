"""Django settings for cheapgamespk."""

from pathlib import Path

import dj_database_url
from dotenv import load_dotenv
import os

BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / ".env")


def env_bool(name, default=False):
    return os.getenv(name, str(default)).lower() in {"1", "true", "yes", "on"}


def env_list(name, default=""):
    return [item.strip() for item in os.getenv(name, default).split(",") if item.strip()]


SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "dev-only-insecure-key-change-me")
DEBUG = env_bool("DJANGO_DEBUG", True)
ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third party
    "rest_framework",
    "corsheaders",
    "django_filters",
    # Local
    "apps.catalog",
    "apps.inventory",
    "apps.orders",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    # Serves the admin's CSS/JS straight from gunicorn, so nginx never needs
    # to know where staticfiles live.
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

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

# Postgres in production via DATABASE_URL, e.g.
# postgres://cheapgamespk:pass@127.0.0.1:5432/cheapgamespk
#
# Tested for emptiness, not just presence: `DATABASE_URL=` sitting blank in a
# .env parses to Django's dummy backend, which fails at the first query with a
# message that says nothing about the real cause.
_database_url = os.getenv("DATABASE_URL", "").strip()

if _database_url:
    DATABASES = {
        "default": dj_database_url.parse(
            _database_url, conn_max_age=600, conn_health_checks=True
        )
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = os.getenv("DJANGO_TIME_ZONE", "Asia/Karachi")
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"
    },
}
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_PAGINATION_CLASS": "apps.catalog.pagination.StorefrontPagination",
    "PAGE_SIZE": int(os.getenv("CATALOG_PAGE_SIZE", "24")),
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
        "rest_framework.renderers.BrowsableAPIRenderer",
    ],
    "DEFAULT_THROTTLE_CLASSES": ["rest_framework.throttling.ScopedRateThrottle"],
    "DEFAULT_THROTTLE_RATES": {
        # Ordering is anonymous and unauthenticated, so this limit is the only
        # thing standing between us and a flooded order list.
        "order_create": os.getenv("THROTTLE_ORDER_CREATE", "20/hour"),
    },
}

CORS_ALLOWED_ORIGINS = env_list(
    "CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
)

# Storefront currency. Prices are stored in this currency.
STORE_CURRENCY = os.getenv("STORE_CURRENCY", "PKR")

# Public URL of the storefront. Used to build the full order link the admin
# shows staff, which is what gets pasted into the chat.
SITE_URL = os.getenv("SITE_URL", "http://localhost:3000").rstrip("/")

# Contact number for "Buy on WhatsApp", digits only with country code. This is
# the only channel the store sells through, so blank leaves buyers with no way
# to order at all.
WHATSAPP_NUMBER = os.getenv("WHATSAPP_NUMBER", "")


# --- Production hardening -------------------------------------------------
# All of this is a no-op in development. It switches on with DJANGO_DEBUG=False
# so there is one flag to get wrong, not eight.

# Django only knows the request arrived over HTTPS because nginx says so —
# gunicorn itself is spoken to over plain HTTP on localhost.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# Admin login POSTs are rejected without this once we are behind HTTPS.
CSRF_TRUSTED_ORIGINS = env_list("CSRF_TRUSTED_ORIGINS")

if not DEBUG:
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    # Off when nginx already redirects http->https, which it does in our setup.
    # Leaving it on breaks server-side rendering: Next fetches the API over
    # plain http on loopback, and Django answers those with a 301 to https
    # instead of data.
    SECURE_SSL_REDIRECT = env_bool("SECURE_SSL_REDIRECT", True)
    if not SECURE_SSL_REDIRECT:
        # W008 exists to catch a site with no redirect anywhere. Ours is one
        # layer up, so the warning is noise — and deploy.sh treats warnings as
        # failures.
        SILENCED_SYSTEM_CHECKS = ["security.W008"]
    SECURE_HSTS_SECONDS = int(os.getenv("SECURE_HSTS_SECONDS", "31536000"))
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"
    X_FRAME_OPTIONS = "DENY"

    # A missing key in production is a deploy that should fail loudly, not one
    # that silently runs on the dev default and invalidates every session.
    if SECRET_KEY == "dev-only-insecure-key-change-me":
        raise RuntimeError("DJANGO_SECRET_KEY must be set when DJANGO_DEBUG=False")

# Log to stdout so journalctl owns the log file, rotation and retention.
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {"simple": {"format": "{levelname} {name} {message}", "style": "{"}},
    "handlers": {
        "console": {"class": "logging.StreamHandler", "formatter": "simple"},
    },
    "root": {"handlers": ["console"], "level": "INFO"},
    "loggers": {
        "django.request": {"handlers": ["console"], "level": "WARNING", "propagate": False},
    },
}
