"""
Health-check endpoint.

GET /health/
"""
from django.db import connection
from rest_framework import status, views
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema


class HealthCheckView(views.APIView):
    authentication_classes = []
    permission_classes = []

    @extend_schema(
        tags=["health"],
        responses={200: {"description": "Service is healthy"}},
    )
    def get(self, request, *args, **kwargs):
        db_status = "connected"
        try:
            connection.check()
        except Exception:
            db_status = "disconnected"

        return Response(
            {"status": "ok" if db_status == "connected" else "degraded", "database": db_status},
            status=status.HTTP_200_OK if db_status == "connected" else status.HTTP_503_SERVICE_UNAVAILABLE,
        )
