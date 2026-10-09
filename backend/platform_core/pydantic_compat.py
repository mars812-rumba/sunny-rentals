"""Small compatibility helpers for Pydantic 1 test and Pydantic 2 runtime."""

from pydantic import VERSION, constr


def pattern_string(pattern: str):
    """Keep validation enabled across the regex -> pattern API rename."""
    keyword = "pattern" if int(VERSION.split(".", 1)[0]) >= 2 else "regex"
    return constr(**{keyword: pattern})
