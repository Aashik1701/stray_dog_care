const Report = require('../models/Report');
const nlpService = require('../services/nlpService');
const {
  buildNlFilter,
  extractDateRange,
  parseIsoDate,
} = require('../utils/nlQueryParser');

// GET /api/search/semantic?q=...
exports.semanticSearch = async (req, res) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const limit = Math.min(parseInt(req.query.limit || '10', 10) || 10, 50);
    if (!q) {
      return res.status(400).json({ success: false, message: 'Query q is required' });
    }

    // 1) Embed the query via NLP service
    const emb = await nlpService.embed(q);
    const vector = Array.isArray(emb?.vector) ? emb.vector : [];
    if (!vector.length) {
      return res.status(502).json({ success: false, message: 'Embedding not available' });
    }

    // 2) Vector search in reports
    const indexName = process.env.REPORTS_VECTOR_INDEX || 'embedding_vector';
    const agg = await Report.aggregate([
      {
        $vectorSearch: {
          index: indexName,
          path: 'embedding',
          queryVector: vector,
          numCandidates: Math.max(100, limit * 5),
          limit,
        },
      },
      {
        $project: {
          _id: 1,
          raw_text: 1,
          summary: 1,
          urgency_score: 1,
          sentiment: 1,
          classification: 1,
          location_hint: 1,
          created_at: 1,
          score: { $meta: 'vectorSearchScore' },
        },
      },
    ]);

    return res.json({ success: true, data: { query: q, results: agg } });
  } catch (e) {
    console.error('[search] semantic error:', e);
    return res.status(500).json({ success: false, message: 'Semantic search failed' });
  }
};

// GET /api/search/nl?q=injured dogs in zone 7 last week
exports.nlSearch = async (req, res) => {
  try {
    const rawQuery = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (!rawQuery) return res.status(400).json({ success: false, message: 'Query q is required' });

    const { filter, appliedRules, limitOverride, sort } = buildNlFilter(rawQuery);

    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const requestedLimit = req.query.limit ? parseInt(req.query.limit, 10) : (limitOverride || 20);
    const limit = Math.min(Math.max(requestedLimit || 20, 1), 100);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Report.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Report.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: {
        query: rawQuery,
        filter,
        appliedRules,
        items,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (e) {
    console.error('[search] nl error:', e);
    return res.status(500).json({ success: false, message: 'NL search failed' });
  }
};

exports.__private__ = {
  buildNlFilter,
  extractDateRange,
  parseIsoDate,
};
