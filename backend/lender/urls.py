"""
URL configuration for the Lender Subsystem.
"""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", include("core.urls_health")),
    path("api/auth/", include("core.urls_auth")),
    path("api/", include("core.urls_borrowers")),
    path("api/", include("core.urls_lists")),
    path("api/central/", include("core.urls_central")),
    path("api/audit/", include("core.urls_audit")),
    path("api/portal/", include("core.urls_portal")),
    path("api/docs/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/swagger/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/docs/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
