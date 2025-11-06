const axios = require('axios');
const FormData = require('form-data');
const Report = require('../models/Report');
const nlpService = require('../services/nlpService');

// Threshold for duplicate detection via vector search
const DUPLICATE_THRESHOLD = parseFloat(process.env.REPORT_DUPLICATE_THRESHOLD || '0.82');
const VECTOR_INDEX = process.env.REPORTS_VECTOR_INDEX || 'embedding_vector';

// Helper: flatten pipeline entities to array of {type,text,score}
function normalizeEntities(entities) {
  if (!entities || typeof entities !== 'object') return [];
  const out = [];
  const pushAll = (arr, type) => {
    if (Array.isArray(arr)) {
      for (const v of arr) {
        if (typeof v === 'string') {
          out.push({ type, text: v, score: 0 });
        } else if (v && typeof v === 'object' && v.text) {
          out.push({ type, text: v.text, score: Number(v.score || 0) });
        }
      }
    }
  };
  pushAll(entities.breeds, 'breed');
  pushAll(entities.locations, 'location');
  pushAll(entities.symptoms, 'symptom');
  pushAll(entities.dates, 'date');
  return out;
}

async function fetchAudioAsFormData(audioUrl) {
  const resp = await axios.get(audioUrl, { responseType: 'arraybuffer' });
  const contentType = resp.headers['content-type'] || 'audio/mpeg';
  const filename = audioUrl.split('/').pop() || 'audio.wav';
  const form = new FormData();
  form.append('audio', Buffer.from(resp.data), { filename, contentType });
  return form;
}

exports.createReport = async (req, res) => {
  try {
    const { text, audioUrl, language } = req.body || {};
    if (!text && !audioUrl) {
      return res.status(400).json({ success: false, message: 'Provide text or audioUrl' });
    }

    // 1) Speech-to-text if audioUrl is provided
    let rawText = text || '';
    if (!rawText && audioUrl) {
      try {
        const form = await fetchAudioAsFormData(audioUrl);
        const asr = await nlpService.speechToText(form);
        rawText = asr?.text || '';
      } catch (e) {
        return res.status(502).json({ success: false, message: 'ASR failed', error: e?.message });
      }
    }

    if (!rawText.trim()) {
      return res.status(400).json({ success: false, message: 'Empty text after ASR' });
    }

    // 2) Call pipeline
    let pipe;
    try {
      pipe = await nlpService.pipeline(rawText, language || 'en');
    } catch (e) {
      return res.status(502).json({ success: false, message: 'NLP pipeline failed', error: e?.message });
    }

    // 3) Vector duplicate search using embedding
    const embedding = Array.isArray(pipe?.embedding) ? pipe.embedding : [];
    if (!embedding.length) {
      return res.status(500).json({ success: false, message: 'Embedding missing from pipeline result' });
    }

    let duplicateOf = null;
    try {
      const agg = await Report.aggregate([
        {
          $vectorSearch: {
            index: VECTOR_INDEX,
            path: 'embedding',
            queryVector: embedding,
            numCandidates: 100,
            limit: 3,
          },
        },
        {
          $project: {
            _id: 1,
            score: { $meta: 'vectorSearchScore' },
          },
        },
      ]);

      if (agg && agg.length) {
        const top = agg[0];
        const sim = typeof top.score === 'number' ? top.score : 0;
        if (sim >= DUPLICATE_THRESHOLD) {
          duplicateOf = top._id;
        }
      }
    } catch (e) {
      // If vector search not available, continue without duplicate
      console.warn('[reports] vector search failed or unavailable:', e?.message);
    }

    // 4) Save report
    const classification = Array.isArray(pipe?.classification) ? pipe.classification : [];
    const sentiment = pipe?.sentiment || null;
    const urgency = typeof pipe?.urgency_score === 'number' ? pipe.urgency_score : 0;
    const entities = normalizeEntities(pipe?.entities);
    const location_hint = {
      zone: null,
      area: (entities.find(e => e.type === 'location')?.text) || null,
    };

    const report = await Report.create({
      raw_text: rawText,
      translated_text: pipe?.translated_text || rawText,
      classification,
      sentiment,
      urgency_score: urgency,
      entities,
      summary: pipe?.summary || null,
      embedding,
      location_hint,
      duplicate_of: duplicateOf,
      created_by: req.user?._id || null,
    });

    // 5) Emit high urgency alert via Socket.io
    if (urgency >= 0.75 && req.app && req.app.get && req.app.get('io')) {
      req.app.get('io').emit('report.highUrgency', {
        id: report._id,
        urgency,
        area: report.location_hint?.area,
        summary: report.summary,
      });
    }

    return res.status(201).json({ success: true, data: report });
  } catch (e) {
    console.error('[reports] create error:', e);
    return res.status(500).json({ success: false, message: 'Failed to create report' });
  }
};

// GET /api/reports (list with basic filters)
exports.listReports = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 100);
    const skip = (page - 1) * limit;

    const { q, minUrgency, from, to } = req.query;
    const filter = {};

    if (q && typeof q === 'string') {
      filter.$or = [
        { raw_text: { $regex: q, $options: 'i' } },
        { translated_text: { $regex: q, $options: 'i' } },
        { summary: { $regex: q, $options: 'i' } },
      ];
    }
    if (minUrgency) {
      const v = parseFloat(String(minUrgency));
      if (!Number.isNaN(v)) filter.urgency_score = { $gte: v };
    }
    if (from || to) {
      filter.created_at = {};
      if (from) filter.created_at.$gte = new Date(String(from));
      if (to) filter.created_at.$lte = new Date(String(to));
    }

    const [items, total] = await Promise.all([
      Report.find(filter)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Report.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: {
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (e) {
    console.error('[reports] list error:', e);
    return res.status(500).json({ success: false, message: 'Failed to list reports' });
  }
};

// GET /api/reports/:id
exports.getReportById = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Report.findById(id).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    return res.json({ success: true, data: doc });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to fetch report' });
  }
};
