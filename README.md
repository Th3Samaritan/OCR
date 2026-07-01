# Hermes

Long-horizon document intelligence: parse messy multi-page documents with **Unlimited-OCR**,
extract typed data with **Gemini** (provider-pluggable), then **audit** it with a deterministic rule engine. The
verdicts are arithmetic (code, not the LLM), so they can't hallucinate a number — the model only
finds and explains; the engine decides.

> Full strategy: `Hermes-Plan.pdf`. Two-page dev spec: `Hermes-Technical.pdf`.
> The original Colab/Kaggle notebook demo is documented in `docs/notebook-demo.md`.

## Architecture

```
React (Vercel) ──HTTPS──► FastAPI orchestrator (CPU host) ──HTTPS──► OCR service (GPU box / Modal)
  apps/web                 apps/api  (jobs · LLM extraction · hermes engine)   services/ocr  (Unlimited-OCR)
```

Flow: `upload → PDF→images → OCR (markdown + grounding boxes) → Gemini extraction (typed schema) → hermes audit → result → frontend polls`.

## Repo layout

| Path | What |
|---|---|
| `hermes/` | Verification engine. `core.py` (engine) + domain packs: `financial.py`, `bank.py`, `insurance.py`, `clinical.py`, `legal.py`, plus `registry.py` (verifiable-records core). Each pack has a `demo_*.py`. |
| `apps/api/` | FastAPI orchestrator — async jobs, LLM extraction (Gemini), audit + onboard + verify flows, DB persistence, cost guard. |
| `apps/web/` | React + Vite + TypeScript + Tailwind frontend (audit, verification, onboarding, dashboard). See `apps/web/README.md`. |
| `services/ocr/` | Unlimited-OCR HTTP service (`main.py` local/box, `modal_app.py` serverless). |
| `tests/` | pytest suite (engine packs + API + OCR contract + verification). |
| `bench/` | Audit-layer accuracy benchmark — labeled corpus + precision/recall/F1 scorecard (`python -m bench`). |

## Prerequisites

Python 3.13. Install deps globally (no venv):

```
pip install fastapi "uvicorn[standard]" python-multipart httpx google-genai sqlalchemy pymupdf pytest
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

# Audit-layer benchmark (precision/recall/F1 on a labeled corpus)
python -m bench                 # scorecard
python -m bench --verbose       # + every case
python -m bench --json          # machine-readable (CI/dashboards)

# Backend orchestrator (mock OCR + mock extraction)
python -m apps.api.smoketest            # end-to-end check
uvicorn apps.api.main:app --reload      # serve on :8000

# OCR service (mock model)
python -m services.ocr.smoketest
uvicorn services.ocr.main:app --port 8011
```

### Full (non-mock) stack

1. **OCR (GPU box):** `OCR_MOCK_MODEL=0 uvicorn services.ocr.main:app --port 8011` (loads Unlimited-OCR; expose via Cloudflare Tunnel for a stable URL). Deploy serverless with `modal deploy services/ocr/modal_app.py`.
2. **API:** set `OCR_SERVICE_URL` (the OCR URL) and `GOOGLE_API_KEY` (Gemini), then `uvicorn apps.api.main:app`. Mock modes switch off automatically once those are set. For persistence, set `DATABASE_URL` to a Postgres URL (defaults to a local SQLite file).
3. **Web:** `apps/web` with `VITE_API_URL` pointing at the API.

## Environment variables

| var | where | default | effect |
|---|---|---|---|
| `GOOGLE_API_KEY` | api | — | Gemini key; unset → mock extraction |
| `EXTRACTION_PROVIDER` | api | `gemini` | set `anthropic` to use Claude instead |
| `GEMINI_MODEL` | api | `gemini-2.5-flash` | verify against your SDK |
| `OCR_SERVICE_URL` | api | — | unset → mock OCR |
| `DATABASE_URL` | api | `sqlite:///./hermes.db` | set `postgresql+psycopg://…` in prod |
| `CORS_ORIGINS` | api | `*` | set to the Vercel origin in prod |
| `RATE_LIMIT_PER_MIN` / `DAILY_JOB_CAP` | api | `5` / `200` | open-access cost guard |
| `OCR_MOCK_MODEL` | ocr | `1` | `0` loads the real model |
| `OCR_MODEL_NAME` | ocr | `baidu/Unlimited-OCR` | |

## Benchmark

`python -m bench` scores the **audit layer** — the deterministic verdict that must never be wrong. It runs a hand-labeled corpus (`bench/corpus.py`) through every pack: a *clean* document per domain (nothing should flag) and the planted-error demo sample (a known defect set), plus isolated single-defect cases for the financial lead. Scoring is per-rule — **recall** = defects caught, **precision** = absence of false alarms — reported per pack and overall. It exits non-zero on any miss or false alarm, so it's also a CI gate (`tests/test_bench.py`). Extraction accuracy (OCR + LLM) is *not* measured here — that needs a GPU/key and a labeled OCR set; this isolates the arithmetic that backs the product claim.

## Add a domain pack

1. New file `hermes/<domain>.py`: a Pydantic schema + rule functions `fn(doc) -> list[Finding]` + a `<DOMAIN>_RULE_PACK` list. Rules are pure arithmetic/logic.
2. Run them with `run_pack(PACK, doc)`; format with `render_report(findings)`.
3. Add `tests/test_<domain>.py` (planted sample flags expected · clean doc → 0 flags · single-error isolation).
4. Export from `hermes/__init__.py`.
5. Add a clean + defective `Case` to `bench/corpus.py` so the new pack is scored by the benchmark.

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
