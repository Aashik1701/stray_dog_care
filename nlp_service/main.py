import os
# Avoid importing torchvision via transformers image utils (text-only service)
os.environ.setdefault("TRANSFORMERS_NO_TORCHVISION", "1")

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from typing import Optional, List, cast
from functools import lru_cache
import re
import numpy as np

try:
    import torch
    HAS_TORCH = True
except Exception:
    torch = None  # type: ignore
    HAS_TORCH = False
 
if HAS_TORCH:
    import torch.nn.functional as F  # type: ignore
    from transformers import AutoTokenizer, AutoModel  # type: ignore

# Sentence-Transformers (robust sentence embedding pipeline)
try:
    from sentence_transformers import SentenceTransformer  # type: ignore
    HAS_ST = True
except Exception:
    SentenceTransformer = None  # type: ignore
    HAS_ST = False

# Defer importing transformers.pipeline to inside functions (avoids E402)

app = FastAPI(title="Stray Dog NLP Service", version="0.2.0")

# Compute device for acceleration
USE_CUDA = bool(int(os.environ.get("USE_CUDA", "1")))
DEVICE = 0 if (HAS_TORCH and USE_CUDA and torch.cuda.is_available()) else -1
DEVICE_NAME = (
    f"cuda:{torch.cuda.current_device()}"
    if (HAS_TORCH and DEVICE == 0)
    else "cpu"
)

_MODELS_WARMED = False
DEFAULT_EMBED_MODEL = (
    "sentence-transformers/multi-qa-MiniLM-L6-cos-v1"
)


class AnalyzePayload(BaseModel):
    text: str
    language: Optional[str] = "en"
 

class EmbedPayload(BaseModel):
    text: str
    language: Optional[str] = None


class DuplicatePayload(BaseModel):
    text: str


class PipelinePayload(BaseModel):
    text: str
    language: Optional[str] = None


@app.get("/health")
def health():
    return {
        "status": "ok",
        "device": DEVICE_NAME,
        "cuda": (
            bool(HAS_TORCH and torch.cuda.is_available())
            if HAS_TORCH
            else False
        ),
        "warmed": _MODELS_WARMED,
        "version": app.version,
        "embed_model": os.environ.get(
            "NLP_EMBED_MODEL", DEFAULT_EMBED_MODEL
        ),
    }


@app.get("/predict")
def predict(text: Optional[str] = "This is a great day!"):
    """Lightweight endpoint to verify inference pipeline works.
    Runs sentiment over provided text and returns label + device info.
    """
    clf = get_sentiment_pipeline()
    out = clf(text, truncation=True)[0]
    return {
        "ok": True,
        "model": "distilbert-sst2",
        "label": out.get("label"),
        "score": float(out.get("score", 0.0)),
        "device": DEVICE_NAME,
    }


@app.post("/api/nlp/analyze-report")
def analyze_report(payload: AnalyzePayload):
    text = payload.text.strip()
    low = text.lower()

    # Pipelines (lazy-init & cached)
    sentiment_clf = get_sentiment_pipeline()
    zero_shot = get_zero_shot_pipeline()
    summarizer = get_summarizer_pipeline()
    ner = get_ner_pipeline()

    # Sentiment
    sent = sentiment_clf(text, truncation=True)[0]
    sentiment_label = sent["label"].lower()  # 'positive'|'negative'
    # score available if needed (kept for potential thresholds)
    # sentiment_score = float(sent["score"]) if "score" in sent else 0.0

    # Zero-shot category
    candidate_labels = [
        "bite incident",
        "injury case",
        "adoption request",
        "cruelty report",
        "health concern",
        "general sighting",
    ]
    z = zero_shot(text, candidate_labels=candidate_labels, multi_label=False)
    category = z["labels"][0] if isinstance(z, dict) else "general sighting"
    confidence = float(z["scores"][0]) if isinstance(z, dict) else 0.0

    # Summarize (keep it short for UI)
    summary = summarizer(
        text,
        max_length=60,
        min_length=12,
        do_sample=False,
    )[0]["summary_text"]

    # Heuristic urgency mapping using sentiment + keywords
    negative_keywords = ["bleed", "injur", "bite", "die", "critical", "urgent"]
    keyword_hit = any(k in low for k in negative_keywords)
    urgency = 0.8 * (1.0 if sentiment_label == "negative" else 0.3) + (
        0.2 if keyword_hit else 0.0
    )
    urgency = max(0.0, min(1.0, urgency))

    # Named Entity Recognition (locations via NER, symptoms via heuristics)
    entities = extract_entities(text, ner)

    return {
        "category": category,
        "confidence": confidence,
        "sentiment": sentiment_label,
        "urgency": urgency,
        "urgency_score": urgency,
        "summary": summary,
        "entities": entities,
    }


@app.post("/api/nlp/pipeline")
def unified_pipeline(payload: PipelinePayload):
    """Run the full NLP pipeline in one call and return a unified payload.
    Fields: language, translated_text, embedding, sentiment, urgency_score,
    classification (top-3 labels), entities, summary.
    """
    text = (payload.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="text is required")

    # Simple language handling (stub: assume provided or 'en')
    lang = payload.language or "en"
    translated_text = text  # stub: integrate IndicTrans2 later

    # Pipelines
    sentiment_clf = get_sentiment_pipeline()
    zero_shot = get_zero_shot_pipeline()
    summarizer = get_summarizer_pipeline()
    ner = get_ner_pipeline()

    # Sentiment
    sent = sentiment_clf(translated_text, truncation=True)[0]
    sentiment_label = sent.get("label", "neutral").lower()
    # Urgency heuristic (reuse analyze logic)
    low = translated_text.lower()
    negative_keywords = [
        "bleed", "injur", "bite", "die", "critical", "urgent",
    ]
    keyword_hit = any(k in low for k in negative_keywords)
    urgency = 0.8 * (1.0 if sentiment_label == "negative" else 0.3) + (
        0.2 if keyword_hit else 0.0
    )
    urgency = max(0.0, min(1.0, urgency))

    # Classification (zero-shot top-3)
    candidate_labels = [
        "bite incident",
        "injury case",
        "adoption request",
        "cruelty report",
        "health concern",
        "general sighting",
    ]
    z = zero_shot(
        translated_text, candidate_labels=candidate_labels, multi_label=False
    )
    if isinstance(z, dict):
        labels = z.get("labels", [])[:3]
        scores = z.get("scores", [])[:3]
        classification = []
        for i, lbl in enumerate(labels):
            sc = float(scores[i]) if i < len(scores) else 0.0
            classification.append({"label": lbl, "score": sc})
    else:
        classification = [{"label": "general sighting", "score": 1.0}]

    # Summary
    summary = summarizer(
        translated_text, max_length=60, min_length=12, do_sample=False
    )[0]["summary_text"]

    # Entities
    entities = extract_entities(translated_text, ner)

    # Embedding via Sentence-Transformers
    try:
        st_model = get_st_embedder()
        vec = st_model.encode(
            translated_text,
            normalize_embeddings=True,
            convert_to_numpy=True,
            show_progress_bar=False,
        ).tolist()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Embedding failed: {e}")

    return {
        "language": lang,
        "translated_text": translated_text,
        "embedding": vec,
        "sentiment": {
            "label": sentiment_label,
            "score": float(sent.get("score", 0.0)),
        },
        "urgency_score": urgency,
        "classification": classification,
        "entities": entities,
        "summary": summary,
        "model": os.environ.get("NLP_EMBED_MODEL", DEFAULT_EMBED_MODEL),
        "dim": len(vec),
    }

 
@app.post("/api/nlp/find-duplicates")
def find_duplicates(
    payload: DuplicatePayload,
    candidates: Optional[List[str]] = None,
    threshold: Optional[float] = 0.82,
):
    """Optional duplicate detector using IndicBERT embeddings when available.
        - If `candidates` is provided, compute cosine similarity and
            return matches >= threshold.
    - If not provided or model unavailable, return the previous stub response.
    """
    text = (payload.text or "").strip()
    if candidates and len(candidates) > 0 and HAS_TORCH:
        try:
            model, tok, device_t = get_indicbert()
            q = _encode_embedding(text, model, tok, device_t)
            cand_vecs = [
                _encode_embedding(c, model, tok, device_t) for c in candidates
            ]
            # Cosine similarity
            sims = [float(F.cosine_similarity(q, v, dim=0)) for v in cand_vecs]
            paired = sorted(
                zip(candidates, sims), key=lambda x: x[1], reverse=True
            )
            similar = [
                {"text": c, "similarity": s}
                for (c, s) in paired
                if s >= (threshold or 0.82)
            ]
            thr = float(threshold or 0.82)
            s0 = cast(float, similar[0]["similarity"]) if similar else 0.0
            is_dup = bool(similar and s0 >= thr)
            return {
                "is_potential_duplicate": is_dup,
                "similar_reports": similar,
            }
        except Exception as e:
            # Fall back to stub if anything goes wrong
            print(f"[NLP] duplicates fallback due to error: {e}")
            # Try Sentence-Transformers fallback if available
            try:
                st = get_st_embedder()
                vecs = st.encode(
                    [text] + candidates,
                    normalize_embeddings=True,
                    convert_to_numpy=True,
                    show_progress_bar=False,
                )
                q = vecs[0]
                cands = vecs[1:]
                # cosine sim via dot product (normalized vectors)
                sims = [float(np.dot(q, v)) for v in cands]
                paired = sorted(
                    zip(candidates, sims), key=lambda x: x[1], reverse=True
                )
                thr = float(threshold or 0.82)
                similar = [
                    {"text": c, "similarity": s}
                    for (c, s) in paired
                    if s >= thr
                ]
                s0 = cast(float, similar[0]["similarity"]) if similar else 0.0
                is_dup = bool(similar and s0 >= thr)
                return {
                    "is_potential_duplicate": is_dup,
                    "similar_reports": similar,
                }
            except Exception as se:
                print(f"[NLP] ST fallback failed: {se}")
    # Default stub behavior
    return {
        "is_potential_duplicate": False,
        "similar_reports": [],
    }

 
@app.post("/api/nlp/speech-to-text")
async def speech_to_text(
    audio: UploadFile = File(...),
    language: Optional[str] = Form(None),
):
    # Stub transcription: echo filename
    name = audio.filename or "audio"
    return {
        "text": f"Transcribed text from {name} (stub)",
        "language": language or "en",
        "confidence": 0.8,
    }


@lru_cache(maxsize=1)
def get_sentiment_pipeline():
    from transformers import pipeline
    return pipeline(
        "sentiment-analysis",
        model="distilbert-base-uncased-finetuned-sst-2-english",
        device=DEVICE,
    )


@lru_cache(maxsize=1)
def get_zero_shot_pipeline():
    from transformers import pipeline
    return pipeline(
        "zero-shot-classification",
        model="facebook/bart-large-mnli",
        device=DEVICE,
    )


@lru_cache(maxsize=1)
def get_summarizer_pipeline():
    # smaller, faster summarizer than BART-large
    from transformers import pipeline
    return pipeline(
        "summarization",
        model="sshleifer/distilbart-cnn-12-6",
        device=DEVICE,
    )


@lru_cache(maxsize=1)
def get_ner_pipeline():
    # Aggregated token classification merges B-/I- spans
    from transformers import pipeline
    return pipeline(
        "token-classification",
        model="dslim/bert-base-NER",
        aggregation_strategy="simple",
        device=DEVICE,
    )


SYMPTOM_KEYWORDS = [
    "injur", "bleed", "fractur", "wound", "limp", "mange", "rash",
    "cough", "fever", "weak", "starv", "thin", "vomit", "diarrh",
    "bite", "rabies", "pain", "swoll", "dehydrat",
]


def extract_entities(text: str, ner) -> dict:
    """Extract locations using NER and symptoms using keyword heuristics."""
    locations: List[str] = []
    try:
        ner_res = ner(text)
        for ent in ner_res:
            # ent example: {"entity_group": "LOC", "word": "Chennai", ...}
            if ent.get("entity_group") == "LOC":
                val = ent.get("word") or ""
                val = val.replace("##", "").strip()
                if val and val.lower() not in [
                    loc.lower() for loc in locations
                ]:
                    locations.append(val)
    except Exception:
        pass

    low = text.lower()
    symptoms = sorted({
        kw for kw in SYMPTOM_KEYWORDS if re.search(r"\b" + re.escape(kw), low)
    })

    return {
        "breeds": [],
        "locations": locations,
        "symptoms": symptoms,
        "dates": [],
    }


@lru_cache(maxsize=1)
def get_indicbert():
    """Load IndicBERT model and tokenizer from a local directory.
    Expects the following files in INDICBERT_MODEL_DIR
    (default: models/indicbert):
      - config.json
      - pytorch_model.bin
      - spiece.model
      - spiece.vocab (optional)

    Returns: (model, tokenizer, device)
    """
    model_dir = os.environ.get(
        "INDICBERT_MODEL_DIR", os.path.join("models", "indicbert")
    )
    if not HAS_TORCH:
        raise RuntimeError("Torch is required for IndicBERT embeddings")
    if not os.path.isdir(model_dir):
        raise FileNotFoundError(
            "IndicBERT model directory not found: "
            f"{model_dir}. Set INDICBERT_MODEL_DIR or create the folder."
        )

    tok = AutoTokenizer.from_pretrained(
        model_dir, use_fast=False, local_files_only=True
    )
    mdl = AutoModel.from_pretrained(model_dir, local_files_only=True)
    device_t = (
        torch.device("cuda:0")
        if (DEVICE == 0 and torch.cuda.is_available())
        else torch.device("cpu")
    )
    mdl = mdl.to(device_t)
    mdl.eval()
    return mdl, tok, device_t


def _encode_embedding(text: str, model, tokenizer, device_t):
    """Encode text to a normalized sentence embedding using mean pooling.
    Shape: (hidden_size,)
    """
    with torch.no_grad():
        inputs = tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            max_length=256,
        )
        inputs = {k: v.to(device_t) for k, v in inputs.items()}
        outputs = model(**inputs)
        last_hidden = outputs.last_hidden_state  # (1, seq, hidden)
        mask = inputs.get("attention_mask")  # (1, seq)
        mask = mask.unsqueeze(-1).expand(last_hidden.size()).float()
        # Mean pooling
        summed = torch.sum(last_hidden * mask, dim=1)
        counts = torch.clamp(mask.sum(dim=1), min=1e-9)
        mean_pooled = summed / counts
        emb = F.normalize(mean_pooled.squeeze(0), p=2, dim=-1)  # (hidden,)
        return emb


@lru_cache(maxsize=1)
def get_st_embedder():
    """Load a SentenceTransformer embedder.
    Model name can be overridden via NLP_EMBED_MODEL env var.
    Defaults to multi-qa-MiniLM-L6-cos-v1 (great for semantic search).
    """
    model_name = os.environ.get("NLP_EMBED_MODEL", DEFAULT_EMBED_MODEL)
    if not HAS_ST:
        raise RuntimeError(
            "sentence-transformers is not installed. "
            "Add it to requirements.txt"
        )
    device_arg = "cuda" if (HAS_TORCH and torch.cuda.is_available()) else "cpu"
    model = SentenceTransformer(model_name, device=device_arg)
    return model


@app.post("/api/nlp/embed")
def embed_text(payload: EmbedPayload):
    """Return a sentence-transformers embedding for the given text.
    Response: { ok, model, dim, vector: number[] }
    Falls back to detailed error if model/tokenizer incompatibility occurs.
    """
    try:
        st_model = get_st_embedder()
        vec = st_model.encode(
            payload.text,
            normalize_embeddings=True,
            convert_to_numpy=True,
            show_progress_bar=False,
        ).tolist()
        return {
            "ok": True,
            "model": os.environ.get("NLP_EMBED_MODEL", DEFAULT_EMBED_MODEL),
            "dim": len(vec),
            "vector": vec,
        }
    except Exception as e:
        # Provide a helpful hint if SentencePiece conversion errors arise
        msg = str(e)
        if "SentencePiece" in msg or "Tiktoken" in msg:
            msg += (
                " | Hint: Use SentenceTransformer or set NLP_EMBED_MODEL="
                "'sentence-transformers/all-MiniLM-L6-v2'."
            )
        raise HTTPException(status_code=500, detail=f"Embedding failed: {msg}")


@app.on_event("startup")
def warm_models():
    """Load models at process start and perform a tiny warm-up call
    to avoid first-request latency.
    """
    global _MODELS_WARMED
    try:
        s = get_sentiment_pipeline()
        z = get_zero_shot_pipeline()
        sm = get_summarizer_pipeline()
        n = get_ner_pipeline()
        # Best-effort load of IndicBERT (optional)
        try:
            _ = get_indicbert()
            print("[NLP] IndicBERT loaded")
        except Exception as e:
            print(f"[NLP] IndicBERT not loaded (optional): {e}")

        # Warm Sentence-Transformer embedder (primary path)
        try:
            st = get_st_embedder()
            _ = st.encode("ok", normalize_embeddings=True)
            print("[NLP] SentenceTransformer embedder loaded")
        except Exception as e:
            print(f"[NLP] ST embedder not loaded: {e}")

        # Tiny warm-up calls (fast and cached by HF)
        _ = s("ok")
        _ = z(
            "ok",
            candidate_labels=["general sighting", "health concern"],
            multi_label=False,
        )
        _ = sm(
            "Short text for warm up.",
            max_length=20,
            min_length=5,
            do_sample=False,
        )
        _ = n("Bangalore is a city.")

        _MODELS_WARMED = True
        print(f"[NLP] Models warmed on device: {DEVICE_NAME}")
    except Exception as e:
        print(f"[NLP] Warm-up failed: {e}")
