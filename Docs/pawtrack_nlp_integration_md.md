# PawTrack NLP Integration Guide

This document provides the complete NLP integration pipeline for PawTrack — including model roles, backend endpoints, data flow, database structure, and integration between the React Native app, Node backend, and FastAPI NLP service. Use this file to track completed tasks ✅ and pending tasks ⏳.

---
# ✅ Overview
PawTrack integrates multiple NLP modules to automate stray dog incident reporting:
- Speech-to-text
- Multilingual translation
- Classification
- NER (breed, symptoms, locations)
- Sentiment & urgency
- Summarization
- Duplicate detection (semantic embeddings)
- Natural language search

All models run inside an **NLP FastAPI microservice** connected to your **Node.js backend** and **React Native app**.

---
# ✅ System Architecture
```
React Native App → Node.js Backend → NLP Service (FastAPI) → MongoDB (Vector Search)
                                             ↘ Socket.io Alerts → Dashboard
```

---
# ✅ NLP Models Used
| Feature | Technology | Purpose |
|--------|------------|---------|
| Voice-to-Text | Whisper / Wav2Vec2 | Convert audio to text |
| Multilingual Support | IndicTrans2, mBART, IndicBERT | Translate + understand Indian languages |
| Classification | BERT / Zero-shot (BART-MNLI) | Category prediction (injury, adoption, bite, etc.) |
| NER | BERT-based NER | Extract locations, breeds, symptoms |
| Sentiment | DistilBERT SST-2 | Polarity and urgency detection |
| Summarization | BART / T5 | Generate short summaries |
| Embeddings | SBERT MiniLM | Semantic similarity & duplicate detection |
| Natural Language Query | DPR + rule-based | Dashboard English queries |

---
# ✅ NLP Pipeline (FastAPI)
### `/api/nlp/pipeline`
**Input:** text
**Output:**
- language
- translated_text
- embedding (384-dim vector)
- sentiment
- urgency_score
- classification labels
- NER entities
- summary

✅ This endpoint unifies all NLP tasks.

Example request:
```
curl -X POST http://localhost:8000/api/nlp/pipeline \
  -H "Content-Type: application/json" \
  -d '{"text":"Dog bleeding near school gate"}'
```

Notes:
- Current translation is stubbed (returns the same text). Integrate IndicTrans2 next.
- Embeddings are produced by `sentence-transformers/multi-qa-MiniLM-L6-cos-v1` (override with `NLP_EMBED_MODEL`).

---
# ✅ FastAPI Code (Completed ✅)
Included components:
- Embed model: `multi-qa-MiniLM-L6-cos-v1`
- Sentiment model: `sst-2`
- Zero-shot: `bart-large-mnli`
- Summarization: `distilbart-cnn-12-6`
- NER: `dslim/bert-base-NER`

---
# ✅ MongoDB Schema with Vector Search
Create Atlas index:
```
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 384,
      "similarity": "cosine"
    }
  ]
}
```

### `reports` collection:
```
{
  _id,
  raw_text,
  translated_text,
  classification: [ {label, score} ],
  sentiment: {label, score},
  urgency_score,
  entities: [{type, text, score}],
  summary,
  embedding: [...384 floats...],
  location_hint: {zone, area},
  created_at,
  duplicate_of: ObjectId | null
}
```

---
# ✅ Node.js Backend Flow (/api/reports)
1. Receive text or audio URL
2. If audio → call `/api/nlp/asr`
3. Call `/api/nlp/pipeline`
4. Run duplicate detection via MongoDB Vector Search
5. Save report and enrich meta-data
6. Emit Socket.io alert if urgency > threshold

---
# ✅ React Native Integration
Screen: **ReportScreen**
- Text or audio input
- Calls Node `/api/reports`
- Shows duplicate warning if flagged
- Clears input after submission

---
# ✅ Search Endpoints
### ✅ Semantic Search
`GET /api/search/semantic?q=injured dog near school`

Uses embeddings → Vector Search

### ✅ Natural-Language Query
`GET /api/search/nl?q=injured dogs in zone 7 last week`

Rule-based, upgradable to full NL→Mongo parser.

---
# ✅ Urgency Rules
Urgency score combines:
- Sentiment
- Keyword matches ("critical", "bleeding", etc.)
- Classification (injury/bite)

Threshold for alert: **>= 0.75**

---
# ✅ Testing Commands (Curl)
```
curl http://localhost:8000/health
curl -X POST http://localhost:8000/api/nlp/pipeline -d '{"text":"Dog bleeding near school gate"}'
curl -X POST http://localhost:3000/api/reports -d '{"text":"Dog bleeding..."}'
curl "http://localhost:3000/api/search/semantic?q=injured dog"
curl "http://localhost:3000/api/search/nl?q=dogs in zone 7 last week"
```

---
# ✅ TODO Checklist
## ✅ Completed
- FastAPI NLP service setup
- Embedding model working (MiniLM)
- Sentiment analysis
- Zero-shot classification (MNLI)
- Summarization
- NER
- Duplicate detection logic
- NLP `/pipeline` endpoint (unified)

## ⏳ Pending / In Progress
- Node.js `/api/reports` orchestration
- MongoDB Vector Index creation
- Socket.io real-time alerts
- React Native audio upload flow
- IndicTrans2 translation integration
- Natural-language query → MongoDB filter (full)
- Dashboard UI components for NLP data

## 📝 Future Enhancements
- Retrain BERT on domain-specific dog reports
- Add OCR for image-based complaint slips
- Add geo-coordinates extraction from text
- RAG-based NL search
- Analytics dashboards using summaries & sentiment trends

---
# ✅ Conclusion
This `.md` file serves as your **master reference and progress tracker** for the PawTrack NLP system. Keep marking features as ✅ as you implement them across the React Native app, Node backend, and FastAPI NLP microservice.

If you need automated tests, diagrams, or devops files next — just say the word!

