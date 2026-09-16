"""
Custom middleware for correlation IDs and audit logging.
"""
import uuid

from django.utils.deprecation import MiddlewareMixin


class CorrelationIdMiddleware(MiddlewareMixin):
    """Attach a request-correlation ID to every incoming HTTP request."""

    HEADER = "X-Correlation-ID"

    def process_request(self, request):
        correlation_id = request.META.get(self.HEADER) or request.headers.get(
            self.HEADER
        )
        if not correlation_id:
            correlation_id = uuid.uuid4().hex
        request.correlation_id = correlation_id
        request.META[self.HEADER] = correlation_id

    def process_response(self, request, response):
        correlation_id = getattr(request, "correlation_id", None)
        if correlation_id:
            response[self.HEADER] = correlation_id
        return response
