"""
Logging filter that injects the correlation ID into log records.
"""
import logging


class CorrelationFilter(logging.Filter):
    """Attach ``request.correlation_id`` to every log record."""

    def filter(self, record):
        from threading import local

        _thread_locals = getattr(self, "_thread_locals", None) or local()
        record.correlation_id = getattr(_thread_locals, "correlation_id", "-")
        if hasattr(_thread_locals, "correlation_id"):
            record.correlation_id = _thread_locals.correlation_id
        return True
