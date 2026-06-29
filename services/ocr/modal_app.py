"""Modal deployment of the OCR service — the scale-to-zero GPU tier.

    modal deploy services/ocr/modal_app.py

Serves the SAME FastAPI app as the local server (services/ocr/main.py), so the
contract is identical: GET /health and POST /ocr. Point the orchestrator's
OCR_SERVICE_URL at the deployed URL and nothing else changes.

NOTE: this is a deploy template — verify the decorator/class names against your
installed Modal version (`modal --version`); Modal's API evolves. The model
loads lazily on the first /ocr request (cold start includes weight load).
"""
import modal

app = modal.App("hermes-ocr")

image = (
    modal.Image.debian_slim(python_version="3.12")
    .pip_install(
        "torch", "torchvision", "transformers==4.57.1",
        "einops", "addict", "easydict", "pymupdf",
        "fastapi", "pydantic",
    )
    .env({"OCR_MOCK_MODEL": "0"})
    .add_local_python_source("services")
)


@app.function(gpu="A10G", image=image, scaledown_window=300, timeout=1200)
@modal.asgi_app()
def fastapi_app():
    from services.ocr.main import app as ocr_app
    return ocr_app
