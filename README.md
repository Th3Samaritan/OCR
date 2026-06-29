# Hermes

Long-horizon document intelligence: parse messy multi-page documents with **Unlimited-OCR**,
extract typed data with **Claude**, then **audit** it with a deterministic rule engine. The
verdicts are arithmetic (code, not the LLM), so they can't hallucinate a number — the model only
finds and explains; the engine decides.

> Full strategy: `Hermes-Plan.pdf`. Two-page dev spec: `Hermes-Technical.pdf`.
> The original Colab/Kaggle notebook demo is documented in `docs/notebook-demo.md`.

## Architecture

```
React (Vercel) ──HTTPS──► FastAPI orchestrator (CPU host) ──HTTPS──► OCR service (GPU box / Modal)
  apps/web                 apps/api  (jobs · Claude · hermes engine)   services/ocr  (Unlimited-OCR)
```

Flow: `upload → PDF→images → OCR (markdown + grounding boxes) → Claude extraction (typed schema) → hermes audit → result → frontend polls`.

## Repo layout

| Path | What |
|---|---|
| `hermes/` | Verification engine. `core.py` (engine) + domain packs: `financial.py`, `bank.py`, `insurance.py`, `clinical.py`, `legal.py`, plus `registry.py` (verifiable-records core). Each pack has a `demo_*.py`. |
| `apps/api/` | FastAPI orchestrator — async jobs, Claude extraction, audit + onboard + verify flows, cost guard. |
| `apps/web/` | React + Vite frontend **[partner]**. |
| `services/ocr/` | Unlimited-OCR HTTP service (`main.py` local/box, `modal_app.py` serverless). |
| `tests/` | pytest suite (engine packs + API + OCR contract + verification). |

## Prerequisites

Python 3.13. Install deps globally (no venv):

```
pip install fastapi "uvicorn[standard]" python-multipart httpx anthropic pymupdf pytest
```

The GPU-only deps (torch, transformers, …) install on the GPU box / Modal — see `services/ocr/requirements.txt`.

## Quickstart (everything runs in mock mode — no GPU, no API key)

```
# Engine demos (deterministic audits + verification on planted-error samples)
python -m hermes.demo_financial
python -m hermes.demo_bank
python -m hermes.demo_insurance
python -m hermes.demo_clinical
python -m hermes.demo_legal
python -m hermes.demo_verify

# Tests
python -m pytest

# Backend orchestrator (mock OCR + mock extraction)
python -m apps.api.smoketest            # end-to-end check
uvicorn apps.api.main:app --reload      # serve on :8000

# OCR service (mock model)
python -m services.ocr.smoketest
uvicorn services.ocr.main:app --port 8011
```

### Full (non-mock) stack

1. **OCR (GPU box):** `OCR_MOCK_MODEL=0 uvicorn services.ocr.main:app --port 8011` (loads Unlimited-OCR; expose via Cloudflare Tunnel for a stable URL). Deploy serverless with `modal deploy services/ocr/modal_app.py`.
2. **API:** set `OCR_SERVICE_URL` (the OCR URL) and `ANTHROPIC_API_KEY`, then `uvicorn apps.api.main:app`. Mock modes switch off automatically once those are set.
3. **Web:** `apps/web` with `VITE_API_URL` pointing at the API.

## Environment variables

| var | where | default | effect |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | api | — | unset → mock extraction |
| `OCR_SERVICE_URL` | api | — | unset → mock OCR |
| `CLAUDE_MODEL` | api | `claude-opus-4-8` | |
| `CORS_ORIGINS` | api | `*` | set to the Vercel origin in prod |
| `RATE_LIMIT_PER_MIN` / `DAILY_JOB_CAP` | api | `5` / `200` | open-access cost guard |
| `OCR_MOCK_MODEL` | ocr | `1` | `0` loads the real model |
| `OCR_MODEL_NAME` | ocr | `baidu/Unlimited-OCR` | |

## Add a domain pack

1. New file `hermes/<domain>.py`: a Pydantic schema + rule functions `fn(doc) -> list[Finding]` + a `<DOMAIN>_RULE_PACK` list. Rules are pure arithmetic/logic.
2. Run them with `run_pack(PACK, doc)`; format with `render_report(findings)`.
3. Add `tests/test_<domain>.py` (planted sample flags expected · clean doc → 0 flags · single-error isolation).
4. Export from `hermes/__init__.py`.

See `hermes/financial.py` + `tests/test_financial.py` as the reference pattern.

## API contract (for the frontend)

**Audit flow**
- `POST /documents` (multipart, field `file`) → `{ job_id, status }`
- `GET /documents/{job_id}` → `{ status, result, error }`; `result.findings[]` = `{ rule, passed, severity, message, citations[] }`

**Verifiable-records flow**
- `POST /issuers/records` (json `IssuerRecord`) — onboard one record
- `POST /issuers/{id}/bulk-records` (json `{doc_type, key_field, rows[]}`) — onboard a register
- `POST /issuers/{id}/bulk-scans` (multipart `files[]` + `doc_type`) — onboard a scanned archive
- `POST /verify` (multipart `file` + optional `issuer_id`,`doc_type`) — Push: OCR → match
- `POST /verify/presented` (json `PresentedDocument`) — verify a structured doc
  → all return `{ status: confirmed|altered|not_issued|unverified, genuine, mismatches[], message }`

Full shape + screens: `Hermes-Technical.pdf`.
