"""OCR service config. Mock-model mode is ON by default so the service runs on
any machine; set OCR_MOCK_MODEL=0 on the GPU box / Modal to load the real model.
"""
import os


def _bool(value: str | None, default: bool) -> bool:
    if value is None:
        return default
    return value.lower() in ("1", "true", "yes", "on")


MOCK_MODEL = _bool(os.getenv("OCR_MOCK_MODEL"), True)
MODEL_NAME = os.getenv("OCR_MODEL_NAME", "baidu/Unlimited-OCR")
