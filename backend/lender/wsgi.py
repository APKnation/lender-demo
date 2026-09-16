"""
WSGI config for the Lender Subsystem project.
"""
import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "lender.settings")
application = get_wsgi_application()
