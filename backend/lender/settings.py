"""
Django settings for the Lender Subsystem.

Production-ready – PostgreSQL only, HTTPS-ready, secured cookies,
CORS, and per-institution configuration via environment variables.
"""

import os
from pathlib import Path

import environ

BASE_DIR = Path(__file__).resolve().parent.parent.parent  # repo root → NMB/

env = environ.Env(
    DEBUG=(bool, False),
)

env_file = BASE_DIR / ".env"
if env_file.exists():
    environ.Env.read_env(env_file)

# --------------------------------------------------------------------------- #
# Core Django
# --------------------------------------------------------------------------- #
SECRET_KEY = env("SECRET_KEY", default="dev-insecure-key")
DEBUG = env("DEBUG", default=False)
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["localhost", "127.0.0.1"])
ROOT_URLCONF = "lender.urls"
WSGI_APPLICATION = "lender.wsgi.application"
ASGI_APPLICATION = "lender.asgi.application"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Custom user model with role-based access control
AUTH_USER_MODEL = "core.CustomUser"

# --------------------------------------------------------------------------- #
# Institution configuration
# --------------------------------------------------------------------------- #
LENDER_ID = env("LENDER_ID", default="NMB-001")
INSTITUTION_NAME = env("INSTITUTION_NAME", default="NMB Bank")
INSTITUTION_TYPE = env("INSTITUTION_TYPE", default="COMMERCIAL_BANK")
BORROWER_REF_PREFIX = env("BORROWER_REF_PREFIX", default="BRW-TZ")
CENTRAL_SYSTEM_URL = env("CENTRAL_SYSTEM_URL", default="http://localhost:8000")
CENTRAL_API_KEY = env("CENTRAL_API_KEY", default="")

# --------------------------------------------------------------------------- #
# Applications
# --------------------------------------------------------------------------- #
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # third-party
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "django_filters",
    "drf_spectacular",
    # local
    "core",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "lender.middleware.CorrelationIdMiddleware",
    "lender.middleware.CurrentRequestMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XframeOptionsMiddleware",
]

# --------------------------------------------------------------------------- #
# Database – PostgreSQL only
# --------------------------------------------------------------------------- #
DATABASES = {
    "default": env.db_url("DATABASE_URL", default="postgres://lender_user:lender_password@localhost:5432/lender_db")
}
# Force PostgreSQL – reject SQLite in non-test environments.
if not DEBUG and "sqlite" in DATABASES["default"]["ENGINE"].lower():
    raise RuntimeError("SQLite is forbidden. Use PostgreSQL via DATABASE_URL.")

# --------------------------------------------------------------------------- #
# Cache
# --------------------------------------------------------------------------- #
REDIS_URL = env("REDIS_URL", default="redis://localhost:6379/1")
CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": REDIS_URL,
        "OPTIONS": {"CLIENT_CLASS": "django_redis.client.DefaultClient"},
    }
}

# --------------------------------------------------------------------------- #
# Templates
# --------------------------------------------------------------------------- #
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# --------------------------------------------------------------------------- #
# Passwords
# --------------------------------------------------------------------------- #
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 12}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# --------------------------------------------------------------------------- #
# Internationalisation
# --------------------------------------------------------------------------- #
LANGUAGE_CODE = "en-us"
TIME_ZONE = "Africa/Dar_es_Salaam"
USE_I18N = True
USE_TZ = True

# --------------------------------------------------------------------------- #
# Static & media
# --------------------------------------------------------------------------- #
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
DEFAULT_FILE_STORAGE = "django.core.files.storage.ManifestStaticFilesStorage"

# --------------------------------------------------------------------------- #
# CORS
# --------------------------------------------------------------------------- #
CORS_ALLOW_CREDENTIALS = env.bool("CORS_ALLOW_CREDENTIALS", default=True)
CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=["http://localhost:4200"])

# --------------------------------------------------------------------------- #
# Security – HTTPS ready
# --------------------------------------------------------------------------- #
SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=False)
SESSION_COOKIE_SECURE = env.bool("SESSION_COOKIE_SECURE", default=True)
CSRF_COOKIE_SECURE = env.bool("CSRF_COOKIE_SECURE", default=True)
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
SECURE_HSTS_SECONDS = env.int("SECURE_HSTS_SECONDS", default=31536000)
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# --------------------------------------------------------------------------- #
# DRF
# --------------------------------------------------------------------------- #
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "core.authentication.APIKeyAuthentication",
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_FILTER_BACKENDS": ["django_filters.rest_framework.DjangoFilterBackend"],
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "core.throttling.BurstRateThrottle",
        "core.throttling.SustainedRateThrottle",
        "core.throttling.CentralSystemPullThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "100/day",
        "user": "10000/day",
        "burst": "120/minute",
        "sustained": "1000/hour",
        "central_pull": "300/minute",
    },
}

# --------------------------------------------------------------------------- #
# Simple JWT
# --------------------------------------------------------------------------- #
from datetime import timedelta  # noqa: E402

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": env("SECRET_KEY", default="dev-insecure-key"),
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# --------------------------------------------------------------------------- #
# drf-spectacular (Swagger / OpenAPI)
# --------------------------------------------------------------------------- #
SPECTACULAR_SETTINGS = {
    "TITLE": "DAIRE Lender Subsystem API",
    "DESCRIPTION": f"API for **{INSTITUTION_NAME}** (**{LENDER_ID}**) – the DAIRE Central System lender connector.",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "SERVE_PERMISSIONS": [],
    "TAGS": [
        {"name": "borrowers", "description": "Borrower lookup and normalised data"},
        {"name": "central", "description": "DAIRE Central System integration (pull / push)"},
        {"name": "audit", "description": "Audit and compliance logs"},
        {"name": "health", "description": "Health checks"},
    ],
}

# --------------------------------------------------------------------------- #
# Logging
# --------------------------------------------------------------------------- #
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "[{asctime}] {levelname} {correlation_id} {name}:{lineno} {message}",
            "style": "{",
        },
    },
    "filters": {
        "correlation": {"()": "lender.logging_filters.CorrelationFilter"},
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
            "filters": ["correlation"],
        },
    },
    "loggers": {
        "core": {"handlers": ["console"], "level": "INFO"},
        "lender": {"handlers": ["console"], "level": "INFO"},
    },
}
