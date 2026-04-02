function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function parseIsoDate(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function extractDateRange(queryLower) {
  const now = new Date();

  const betweenMatch = queryLower.match(/\b(?:between|from)\s+(\d{4}-\d{2}-\d{2})\s+(?:and|to|-)\s+(\d{4}-\d{2}-\d{2})\b/);
  if (betweenMatch) {
    const d1 = parseIsoDate(betweenMatch[1]);
    const d2 = parseIsoDate(betweenMatch[2]);
    if (d1 && d2) {
      const from = d1 <= d2 ? d1 : d2;
      const to = d1 <= d2 ? d2 : d1;
      return { $gte: startOfDay(from), $lte: endOfDay(to) };
    }
  }

  const onMatch = queryLower.match(/\bon\s+(\d{4}-\d{2}-\d{2})\b/);
  if (onMatch) {
    const d = parseIsoDate(onMatch[1]);
    if (d) return { $gte: startOfDay(d), $lte: endOfDay(d) };
  }

  const lastNMatch = queryLower.match(/\blast\s+(\d{1,3})\s+(day|days|week|weeks|month|months)\b/);
  if (lastNMatch) {
    const count = Math.max(parseInt(lastNMatch[1], 10), 1);
    const unit = lastNMatch[2];
    const from = new Date(now);
    if (unit.startsWith('day')) {
      from.setDate(from.getDate() - count);
    } else if (unit.startsWith('week')) {
      from.setDate(from.getDate() - (count * 7));
    } else {
      from.setMonth(from.getMonth() - count);
    }
    return { $gte: from };
  }

  if (/\bthis\s+week\b/.test(queryLower)) {
    const from = new Date(now);
    const day = from.getDay();
    const shift = (day + 6) % 7;
    from.setDate(from.getDate() - shift);
    return { $gte: startOfDay(from) };
  }

  if (/\bthis\s+month\b/.test(queryLower)) {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { $gte: from };
  }

  if (/\blast\s+week\b/.test(queryLower)) {
    const from = new Date(now);
    from.setDate(from.getDate() - 7);
    return { $gte: from };
  }

  if (/\blast\s+month\b/.test(queryLower)) {
    const from = new Date(now);
    from.setMonth(from.getMonth() - 1);
    return { $gte: from };
  }

  if (/\blast\s+day\b|\byesterday\b/.test(queryLower)) {
    const from = new Date(now);
    from.setDate(from.getDate() - 1);
    return { $gte: from };
  }

  if (/\btoday\b/.test(queryLower)) {
    return { $gte: startOfDay(now), $lte: endOfDay(now) };
  }

  return null;
}

function buildNlFilter(rawQuery) {
  const query = rawQuery.trim();
  const q = query.toLowerCase();
  const filter = {};
  const appliedRules = [];
  let limitOverride = null;
  let sort = { created_at: -1 };

  const zoneMatch = q.match(/\bzone\s*[-:]?\s*([a-z0-9]+)\b/i);
  if (zoneMatch) {
    const token = String(zoneMatch[1]).trim();
    if (token) {
      const normalized = /^\d+$/.test(token) ? token : token.toUpperCase();
      filter['location_hint.zone'] = {
        $regex: `^\\s*(?:zone\\s*)?${escapeRegex(normalized)}\\s*$`,
        $options: 'i',
      };
      appliedRules.push(`zone:${normalized}`);
    }
  }

  const areaMatch = query.match(/\b(?:in|near|at)\s+([A-Za-z0-9][A-Za-z0-9\s-]{2,})(?=\s+(?:last|this|today|yesterday|from|between|with|and|show|find|where|urgent|critical|reports?|dogs?|cases?)\b|$)/i);
  if (areaMatch) {
    const area = areaMatch[1].trim().replace(/[.,!?]+$/, '');
    if (area && !/^zone\b/i.test(area)) {
      filter['location_hint.area'] = { $regex: escapeRegex(area), $options: 'i' };
      appliedRules.push(`area:${area}`);
    }
  }

  const dateRange = extractDateRange(q);
  if (dateRange) {
    filter.created_at = dateRange;
    appliedRules.push('date-range');
  }

  const intentRules = [
    {
      label: 'injury case',
      pattern: /\b(injur(?:y|ed|ies)?|bleed(?:ing)?|wound(?:ed|s)?|fractur(?:e|ed|es)?|limp(?:ing)?|hurt)\b/,
    },
    { label: 'bite incident', pattern: /\b(bite|rabies|attack|attacked)\b/ },
    { label: 'adoption request', pattern: /\b(adopt|adoption|foster|rescue)\b/ },
    { label: 'cruelty report', pattern: /\b(cruelty|abuse|poison|beating)\b/ },
    { label: 'health concern', pattern: /\b(fever|vomit|diarrh|mange|weak|sick)\b/ },
  ];

  const matchedIntents = intentRules
    .filter(rule => rule.pattern.test(q))
    .map(rule => rule.label);
  if (matchedIntents.length) {
    filter['classification.label'] = { $in: [...new Set(matchedIntents)] };
    appliedRules.push(`intents:${matchedIntents.join(',')}`);
  }

  if (/\bnegative\b/.test(q)) {
    filter['sentiment.label'] = 'negative';
    appliedRules.push('sentiment:negative');
  } else if (/\bpositive\b/.test(q)) {
    filter['sentiment.label'] = 'positive';
    appliedRules.push('sentiment:positive');
  } else if (/\bneutral\b/.test(q)) {
    filter['sentiment.label'] = 'neutral';
    appliedRules.push('sentiment:neutral');
  }

  const urgencyAbove = q.match(/\burgency\s*(?:>=|>|above|over|at\s+least)\s*(0(?:\.\d+)?|1(?:\.0+)?)\b/);
  const urgencyBelow = q.match(/\burgency\s*(?:<=|<|below|under|at\s+most)\s*(0(?:\.\d+)?|1(?:\.0+)?)\b/);
  if (urgencyAbove || urgencyBelow) {
    filter.urgency_score = {};
    if (urgencyAbove) filter.urgency_score.$gte = parseFloat(urgencyAbove[1]);
    if (urgencyBelow) filter.urgency_score.$lte = parseFloat(urgencyBelow[1]);
    appliedRules.push('urgency:numeric');
  } else if (/\b(urgent|critical|emergency|high\s+priority)\b/.test(q)) {
    filter.urgency_score = { $gte: 0.75 };
    appliedRules.push('urgency:high');
  } else if (/\b(low\s+priority|non[-\s]?urgent|minor)\b/.test(q)) {
    filter.urgency_score = { $lte: 0.4 };
    appliedRules.push('urgency:low');
  }

  if (/\b(duplicate|duplicates|similar\s+reports?)\b/.test(q)) {
    filter.duplicate_of = { $ne: null };
    appliedRules.push('duplicate:true');
  } else if (/\b(unique|non[-\s]?duplicate|without\s+duplicates?)\b/.test(q)) {
    filter.duplicate_of = null;
    appliedRules.push('duplicate:false');
  }

  const topMatch = q.match(/\b(?:top|first)\s+(\d{1,3})\b/);
  if (topMatch) {
    limitOverride = Math.min(Math.max(parseInt(topMatch[1], 10), 1), 100);
    appliedRules.push(`limit:${limitOverride}`);
  }

  if (/\b(most\s+urgent|highest\s+urgency)\b/.test(q)) {
    sort = { urgency_score: -1, created_at: -1 };
    appliedRules.push('sort:urgency-desc');
  } else if (/\b(least\s+urgent|lowest\s+urgency)\b/.test(q)) {
    sort = { urgency_score: 1, created_at: -1 };
    appliedRules.push('sort:urgency-asc');
  } else if (/\b(oldest|earliest)\b/.test(q)) {
    sort = { created_at: 1 };
    appliedRules.push('sort:created-asc');
  }

  return { filter, appliedRules, limitOverride, sort };
}

module.exports = {
  buildNlFilter,
  extractDateRange,
  parseIsoDate,
};
