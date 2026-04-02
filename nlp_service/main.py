import os
# Avoid importing torchvision via transformers image utils (text-only service)
os.environ.setdefault("TRANSFORMERS_NO_TORCHVISION", "1")

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from typing import Optional, List, cast
from functools import lru_cache
import re
import tempfile
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
DEFAULT_TRANSLATION_MODEL = os.environ.get(
    "NLP_TRANSLATION_MODEL", "facebook/nllb-200-distilled-600M"
)
NLP_TRANSLATION_ENABLED = (
    os.environ.get("NLP_TRANSLATION_ENABLED", "true").lower() == "true"
)
NLLB_SOURCE_LANGS = {
    "en": "eng_Latn",
    "hi": "hin_Deva",
    "ta": "tam_Taml",
    "te": "tel_Telu",
    "kn": "kan_Knda",
    "ml": "mal_Mlym",
}
DEFAULT_ASR_MODEL = os.environ.get("NLP_ASR_MODEL", "openai/whisper-small")
NLP_ASR_ENABLED = (
    os.environ.get("NLP_ASR_ENABLED", "true").lower() == "true"
)


class AnalyzePayload(BaseModel):
    text: str
    language: Optional[str] = "en"
 

class EmbedPayload(BaseModel):
    text: str
    language: Optional[str] = None


class DuplicatePayload(BaseModel):
    text: str
    candidates: Optional[List[str]] = None
    threshold: Optional[float] = None


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
        "translation_model": os.environ.get(
            "NLP_TRANSLATION_MODEL", DEFAULT_TRANSLATION_MODEL
        ),
        "translation_enabled": NLP_TRANSLATION_ENABLED,
        "asr_model": os.environ.get("NLP_ASR_MODEL", DEFAULT_ASR_MODEL),
        "asr_enabled": NLP_ASR_ENABLED,
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

    # Translate to English when source language is non-English.
    # Falls back to source text if translation model/runtime is unavailable.
    lang = normalize_language_code(payload.language)
    translated_text, translation = translate_to_english(text, lang)

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
        "translation": translation,
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
    """Duplicate detector with multi-strategy fallback.

    Supports candidates/threshold from request body and query params.
    Strategy order:
      1) IndicBERT (if torch + model available)
      2) Sentence-Transformers fallback
      3) Explicit no-result fallback with reason metadata
    """
    text = (payload.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="text is required")

    body_candidates = payload.candidates or []
    query_candidates = candidates or []
    merged = body_candidates if body_candidates else query_candidates
    cand_texts = [str(c).strip() for c in merged if str(c).strip()]
    thr = float(payload.threshold if payload.threshold is not None else (threshold or 0.82))

    if not cand_texts:
        return {
            "is_potential_duplicate": False,
            "similar_reports": [],
            "threshold": thr,
            "candidate_count": 0,
            "strategy": "none",
            "fallback": True,
            "reason": "no_candidates",
        }

    errors: List[str] = []

    if HAS_TORCH:
        try:
            model, tok, device_t = get_indicbert()
            q = _encode_embedding(text, model, tok, device_t)
            cand_vecs = [
                _encode_embedding(c, model, tok, device_t) for c in cand_texts
            ]
            sims = [float(F.cosine_similarity(q, v, dim=0)) for v in cand_vecs]
            paired = sorted(
                zip(cand_texts, sims), key=lambda x: x[1], reverse=True
            )
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
                "threshold": thr,
                "candidate_count": len(cand_texts),
                "strategy": "indicbert",
                "fallback": False,
            }
        except Exception as e:
            err = f"indicbert_error: {e}"
            errors.append(err)
            print(f"[NLP] duplicates fallback due to error: {err}")

    if HAS_ST:
        try:
            st = get_st_embedder()
            vecs = st.encode(
                [text] + cand_texts,
                normalize_embeddings=True,
                convert_to_numpy=True,
                show_progress_bar=False,
            )
            q = vecs[0]
            cands = vecs[1:]
            sims = [float(np.dot(q, v)) for v in cands]
            paired = sorted(
                zip(cand_texts, sims), key=lambda x: x[1], reverse=True
            )
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
                "threshold": thr,
                "candidate_count": len(cand_texts),
                "strategy": "sentence-transformers",
                "fallback": bool(errors),
                "reason": " ; ".join(errors) if errors else None,
            }
        except Exception as e:
            err = f"st_error: {e}"
            errors.append(err)
            print(f"[NLP] ST fallback failed: {err}")

    reason = " ; ".join(errors) if errors else "no_model_available"
    return {
        "is_potential_duplicate": False,
        "similar_reports": [],
        "threshold": thr,
        "candidate_count": len(cand_texts),
        "strategy": "none",
        "fallback": True,
        "reason": reason,
    }

 
@app.post("/api/nlp/speech-to-text")
async def speech_to_text(
    audio: UploadFile = File(...),
    language: Optional[str] = Form(None),
):
    preferred_lang = normalize_language_code(language)
    model_name = os.environ.get("NLP_ASR_MODEL", DEFAULT_ASR_MODEL)

    data = await audio.read()
    if not data:
        raise HTTPException(status_code=400, detail="audio file is empty")

    if not NLP_ASR_ENABLED:
        name = audio.filename or "audio"
        return {
            "text": f"Transcribed text from {name} (fallback)",
            "language": preferred_lang,
            "confidence": 0.0,
            "model": model_name,
            "fallback": True,
            "reason": "asr_disabled",
        }

    suffix = ".wav"
    if audio.filename and "." in audio.filename:
        ext = audio.filename.rsplit(".", 1)[-1].lower()
        if ext and len(ext) <= 8:
            suffix = f".{ext}"

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(data)
            tmp_path = tmp.name

        asr = get_asr_pipeline()
        result = asr(tmp_path)

        text = ""
        confidence = 0.0
        if isinstance(result, dict):
            text = str(result.get("text", "")).strip()
            if result.get("score") is not None:
                confidence = float(result.get("score") or 0.0)
        elif isinstance(result, str):
            text = result.strip()

        if not text:
            raise RuntimeError("ASR returned empty text")

        return {
            "text": text,
            "language": preferred_lang,
            "confidence": confidence,
            "model": model_name,
            "fallback": False,
        }
    except Exception as e:
        print(f"[NLP] ASR fallback due to error: {e}")
        name = audio.filename or "audio"
        return {
            "text": f"Transcribed text from {name} (fallback)",
            "language": preferred_lang,
            "confidence": 0.0,
            "model": model_name,
            "fallback": True,
            "reason": "asr_error",
        }
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass


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


@lru_cache(maxsize=1)
def get_asr_pipeline():
    from transformers import pipeline
    model_name = os.environ.get("NLP_ASR_MODEL", DEFAULT_ASR_MODEL)
    return pipeline(
        "automatic-speech-recognition",
        model=model_name,
        device=DEVICE,
    )


def normalize_language_code(language: Optional[str]) -> str:
    if not language:
        return "en"
    lang = str(language).strip().lower()
    if not lang:
        return "en"
    lang = lang.replace("_", "-")
    if "-" in lang:
        lang = lang.split("-")[0]
    return lang or "en"


@lru_cache(maxsize=1)
def get_translation_pipeline():
    from transformers import pipeline
    model_name = os.environ.get(
        "NLP_TRANSLATION_MODEL", DEFAULT_TRANSLATION_MODEL
    )
    return pipeline("translation", model=model_name, device=DEVICE)


def translate_to_english(text: str, language: Optional[str]):
    lang = normalize_language_code(language)
    model_name = os.environ.get(
        "NLP_TRANSLATION_MODEL", DEFAULT_TRANSLATION_MODEL
    )
    meta = {
        "source_language": lang,
        "target_language": "en",
        "model": model_name,
        "applied": False,
        "fallback": False,
    }

    if lang in ("en", "eng"):
        return text, meta

    if not NLP_TRANSLATION_ENABLED:
        meta["fallback"] = True
        meta["reason"] = "translation_disabled"
        return text, meta

    src_lang = NLLB_SOURCE_LANGS.get(lang)
    if not src_lang:
        meta["fallback"] = True
        meta["reason"] = "unsupported_language_code"
        return text, meta

    try:
        translator = get_translation_pipeline()
        out = translator(
            text,
            src_lang=src_lang,
            tgt_lang="eng_Latn",
            max_length=512,
            truncation=True,
        )
        if isinstance(out, list) and out:
            translated = str(out[0].get("translation_text", "")).strip()
            if translated:
                meta["applied"] = True
                return translated, meta

        meta["fallback"] = True
        meta["reason"] = "empty_translation_output"
        return text, meta
    except Exception as e:
        print(f"[NLP] translation fallback due to error: {e}")
        meta["fallback"] = True
        meta["reason"] = "translation_error"
        return text, meta


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
