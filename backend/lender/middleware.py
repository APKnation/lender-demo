"""
Custom middleware for the Lender Subsystem:
  * CorrelationIdMiddleware – attaches a request correlation ID
  * CurrentRequestMiddleware – stores the active request in thread-local
    storage so model signals can access ``request.user`` etc.
"""
import threading
import uuid

_thread_locals = threading.local()


def get_current_request():
    """Return the currently active HttpRequest, or ``None``."""
    return getattr(_thread_locals, "request", None)


class CorrelationIdMiddleware:
    """Attach a request-correlation ID to every incoming HTTP request."""

    HEADER = "X-Correlation-ID"

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        correlation_id = (
            request.headers.get(self.HEADER)
            or request.META.get(self.HEADER)
            or uuid.uuid4().hex
        )
        request.correlation_id = correlation_id
        request.META[self.HEADER] = correlation_id
        _thread_locals.request = request
        try:
            response = self.get_response(request)
        finally:
            response[self.HEADER] = correlation_id
            _thread_locals.request = None
        return response


class CurrentRequestMiddleware:
    """Store the current request in thread-local storage for signals."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        _thread_locals.request = request
        try:
            return self.get_response(request)
        finally:
            _thread_locals.request = None
