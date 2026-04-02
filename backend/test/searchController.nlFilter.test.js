const test = require('node:test');
const assert = require('node:assert/strict');

const { buildNlFilter } = require('../src/utils/nlQueryParser');

test('buildNlFilter extracts zone and injury intent', () => {
  const { filter, appliedRules } = buildNlFilter('injured dogs in zone 7 last week');

  assert.ok(filter['location_hint.zone']);
  assert.match(filter['location_hint.zone'].$regex, /7/);
  assert.ok(filter.created_at);
  assert.ok(filter['classification.label']);
  assert.ok(Array.isArray(filter['classification.label'].$in));
  assert.ok(filter['classification.label'].$in.includes('injury case'));
  assert.ok(appliedRules.includes('date-range'));
});

test('buildNlFilter extracts area query', () => {
  const { filter, appliedRules } = buildNlFilter('find reports in Indiranagar today');

  assert.ok(filter['location_hint.area']);
  assert.equal(filter['location_hint.area'].$options, 'i');
  assert.match(filter['location_hint.area'].$regex, /Indiranagar/);
  assert.ok(filter.created_at);
  assert.ok(appliedRules.includes('date-range'));
});

test('buildNlFilter parses urgency numeric thresholds', () => {
  const { filter, appliedRules } = buildNlFilter('show reports with urgency >= 0.8');

  assert.deepEqual(filter.urgency_score, { $gte: 0.8 });
  assert.ok(appliedRules.includes('urgency:numeric'));
});

test('buildNlFilter parses duplicate filter intents', () => {
  const { filter, appliedRules } = buildNlFilter('show duplicate reports in zone 3');

  assert.deepEqual(filter.duplicate_of, { $ne: null });
  assert.ok(appliedRules.includes('duplicate:true'));
});

test('buildNlFilter honors top-N and urgency sorting', () => {
  const { limitOverride, sort, appliedRules } = buildNlFilter('top 5 most urgent reports');

  assert.equal(limitOverride, 5);
  assert.deepEqual(sort, { urgency_score: -1, created_at: -1 });
  assert.ok(appliedRules.includes('sort:urgency-desc'));
});

test('buildNlFilter parses sentiment and this month ranges', () => {
  const { filter, appliedRules } = buildNlFilter('negative reports this month');

  assert.equal(filter['sentiment.label'], 'negative');
  assert.ok(filter.created_at);
  assert.ok(appliedRules.includes('sentiment:negative'));
  assert.ok(appliedRules.includes('date-range'));
});
