#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
export DJANGO_SETTINGS_MODULE=lender.test_settings
python manage.py test core.tests "$@"
