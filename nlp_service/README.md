# NLP Service (FastAPI) — Starter

This is a minimal FastAPI service to support the Stray Dog Management System's NLP endpoints. It returns stubbed responses so you can wire the backend and mobile app before plugging real models.

## Endpoints
- POST `/api/nlp/analyze-report` — returns category, sentiment, urgency, summary, and basic entities
- POST `/api/nlp/find-duplicates` — returns potential duplicates (stubbed false)
- POST `/api/nlp/speech-to-text` — accepts `multipart/form-data` and returns a dummy transcription

## Run locally
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Troubleshooting installs
- Python version: If you're on Python < 3.10, the requirements use NumPy 1.26.x automatically; on Python ≥ 3.10 they use NumPy 2.x. If you still see a NumPy version error, verify your venv Python:
	- `python --version` should be 3.9+.
	- Recreate the venv with Python 3.10+ for best performance.
- PyTorch on macOS/Apple Silicon: If `pip install torch` fails or is slow, try one of:
	- Use Python 3.10+.
	- Use the CPU wheels index: `pip install torch --index-url https://download.pytorch.org/whl/cpu`.
	- Or install via Conda (recommended by PyTorch docs).
- First run will download model weights (hundreds of MB); allow time or pre-download with a stable connection.

- FastAPI form uploads: If you see `Form data requires "python-multipart" to be installed`, it's already included in `requirements.txt`. If the error persists, run:
  ```bash
  pip install python-multipart
  ```
  and restart the server.

- LibreSSL warning on macOS system Python: `urllib3 v2 only supports OpenSSL 1.1.1+, current ssl is LibreSSL …` — it's a warning, but if HTTPS downloads fail (e.g., model weights), use a Python from python.org/Homebrew/pyenv (3.10+) which links to OpenSSL 1.1.1+.

## Next steps
- Swap stub logic with real models (Hugging Face transformers, spaCy, Whisper)
- Add Redis cache/queue for heavy tasks
- Add auth and rate limits if exposing publicly

## Using IndicBERT for embeddings

This service can load a local IndicBERT model and expose sentence embeddings:

1) Place model files in a local folder (default: `nlp_service/models/indicbert`):

- `config.json`
- `pytorch_model.bin`
- `spiece.model`
- `spiece.vocab` (optional)

You can change the folder by setting the `INDICBERT_MODEL_DIR` environment variable.

2) Start the service as usual. On startup, it will attempt to load IndicBERT (optional).

3) Call the endpoint to get an embedding for text:

POST `/api/nlp/embed`
Body:
```
{ "text": "A stray dog is injured near Andheri station." }
```

Response:
```
{
	"ok": true,
	"model": "indic-bert",
	"dim": 768,
	"vector": [ ... numbers ... ]
}
```

4) Optional duplicates check with candidates via the existing endpoint:

POST `/api/nlp/find-duplicates?threshold=0.82`
Body:
```
{ "text": "lost dog near park" }
```

Query param `candidates` can be sent as a repeated parameter from clients that support it,
or you can call `/api/nlp/embed` for each piece of text and compute similarities client-side
or in your Node backend.

Notes:
- Embeddings require PyTorch. The service already pins `torch` in `requirements.txt`.
- If the model folder is missing, the embed endpoint returns 404.
- If Torch is not available, the embed endpoint returns 501.
