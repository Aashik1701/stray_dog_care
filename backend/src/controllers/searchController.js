const Report = require('../models/Report');
const nlpService = require('../services/nlpService');

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
    const q = typeof req.query.q === 'string' ? req.query.q.toLowerCase() : '';
    if (!q) return res.status(400).json({ success: false, message: 'Query q is required' });

    const filter = {};

    // zone extraction
    const zoneMatch = q.match(/zone\s+(\d+|[a-z]+)/i);
    if (zoneMatch) {
      const zone = zoneMatch[1];
      filter['location_hint.zone'] = zone;
    }

    // time range extraction (last week|month|day)
    const now = new Date();
    if (/last\s+week/.test(q)) {
      const from = new Date(now);
      from.setDate(from.getDate() - 7);
      filter.created_at = { $gte: from };
    } else if (/last\s+month/.test(q)) {
      const from = new Date(now);
      from.setMonth(from.getMonth() - 1);
      filter.created_at = { $gte: from };
    } else if (/last\s+day|yesterday/.test(q)) {
      const from = new Date(now);
      from.setDate(from.getDate() - 1);
      filter.created_at = { $gte: from };
    }

    // intent: injured/bite/adoption -> classification includes
    const intents = [];
    if (/injur|bleed|wound|limp/.test(q)) intents.push('injury case');
    if (/bite/.test(q)) intents.push('bite incident');
    if (/adopt/.test(q)) intents.push('adoption request');
    if (intents.length) {
      filter['classification.label'] = { $in: intents };
    }

    // urgency keyword
    if (/urgent|critical|emergency/.test(q)) {
      filter.urgency_score = { $gte: 0.75 };
    }

    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 100);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Report.find(filter).sort({ created_at: -1 }).skip(skip).limit(limit).lean(),
      Report.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: {
        query: q,
        filter,
        items,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (e) {
    console.error('[search] nl error:', e);
    return res.status(500).json({ success: false, message: 'NL search failed' });
  }
};
