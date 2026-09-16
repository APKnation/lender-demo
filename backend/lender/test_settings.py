"""
Test-specific settings – uses PostgreSQL with a dedicated test database.

Override DATABASE_URL via the TEST_DATABASE_URL env var if needed.
"""
from lender.settings import *  # noqa: F401,F403

# Use a separate test database
DATABASES = {
    "default": env.db_url(
        "TEST_DATABASE_URL",
        default="postgres://lender_user:lender_password@localhost:5432/lender_db",
    )
}

# Faster password hashing in tests
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.MD5PasswordHasher",
]

# Disable throttling during tests
REST_FRAMEWORK = {
    **REST_FRAMEWORK,
    "DEFAULT_THROTTLE_CLASSES": [],
}

# Disable logging to keep test output clean
LOGGING = {}

# Allow all hosts in tests
ALLOWED_HOSTS = ["*"]

# Skip SSL checks
SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
