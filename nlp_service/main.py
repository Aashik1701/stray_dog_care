from fastapi import FastAPI, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional, List
from transformers import pipeline
from functools import lru_cache
import re
import os

try:
    import torch
    HAS_TORCH = True
except Exception:
    torch = None  # type: ignore
    HAS_TORCH = False

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


class AnalyzePayload(BaseModel):
    text: str
    language: Optional[str] = "en"


class DuplicatePayload(BaseModel):
    text: str


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

 
@app.post("/api/nlp/find-duplicates")
def find_duplicates(payload: DuplicatePayload):
    # Stub: always return no duplicates
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
    return pipeline(
        "sentiment-analysis",
        model="distilbert-base-uncased-finetuned-sst-2-english",
        device=DEVICE,
    )


@lru_cache(maxsize=1)
def get_zero_shot_pipeline():
    return pipeline(
        "zero-shot-classification",
        model="facebook/bart-large-mnli",
        device=DEVICE,
    )


@lru_cache(maxsize=1)
def get_summarizer_pipeline():
    # smaller, faster summarizer than BART-large
    return pipeline(
        "summarization",
        model="sshleifer/distilbart-cnn-12-6",
        device=DEVICE,
    )


@lru_cache(maxsize=1)
def get_ner_pipeline():
    # Aggregated token classification merges B-/I- spans
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
