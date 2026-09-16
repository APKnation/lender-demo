#!/usr/bin/env bash
# Docker entrypoint – runs migrations, seeds, then starts Gunicorn
set -e

cd /app

echo ">> Running migrations..."
python manage.py migrate

echo ">> Creating superuser if needed..."
python manage.py shell -c "
from django.contrib.auth import get_user_model
from django.conf import settings
User = get_user_model()
if not User.objects.filter(email=settings.DJANGO_SUPERUSER_EMAIL).exists():
    User.objects.create_superuser(
        email=settings.DJANGO_SUPERUSER_EMAIL,
        password=settings.DJANGO_SUPERUSER_PASSWORD,
        full_name='Admin',
        role='ADMIN',
    )
    print('  Superuser created.')
else:
    print('  Superuser already exists.')
" 2>/dev/null || true

echo ">> Seeding data..."
python manage.py seed_data --clear

echo ">> Starting Gunicorn..."
exec gunicorn -c gunicorn.conf.py lender.wsgi:application
