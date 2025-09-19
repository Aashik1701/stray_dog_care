// Compute shallow diff between before and after objects, return array of { field, from, to }
function diffObjects(before, after, allowedFields) {
  const changes = [];
  allowedFields.forEach(f => {
    const from = before?.[f];
    const to = after?.[f];
    const changed = JSON.stringify(from) !== JSON.stringify(to); // simple deep compare fallback
    if (changed) changes.push({ field: f, from, to });
  });
  return changes;
}

module.exports = { diffObjects };
