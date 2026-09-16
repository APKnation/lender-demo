#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
export DJANGO_SETTINGS_MODULE=lender.test_settings
if [ -f "venv/bin/python" ]; then
    PYTHON_BIN="venv/bin/python"
elif [ -f ".venv/bin/python" ]; then
    PYTHON_BIN=".venv/bin/python"
else
    PYTHON_BIN="python"
fi
$PYTHON_BIN manage.py test core.tests "$@"
