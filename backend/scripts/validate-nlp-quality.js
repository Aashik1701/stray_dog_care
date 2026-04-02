const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

const NLP_URL = process.env.NLP_SERVICE_URL || 'http://localhost:8000';

const translationSamples = [
  {
    language: 'hi',
    text: 'कुत्ता घायल है और बहुत खून बह रहा है',
    expectedHints: ['dog', 'injur', 'bleed'],
  },
  {
    language: 'ta',
    text: 'இந்த நாய் மிகவும் பலவீனமாக உள்ளது',
    expectedHints: ['dog', 'weak'],
  },
  {
    language: 'kn',
    text: 'ಜೋನ್ 7ರಲ್ಲಿ ಗಾಯಗೊಂಡ ನಾಯಿ ಕಂಡುಬಂದಿದೆ',
    expectedHints: ['zone', 'injur', 'dog'],
  },
  {
    language: 'en',
    text: 'Dog appears injured near school gate',
    expectedHints: ['dog', 'injur'],
  },
];

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { audioPath: null, audioLanguage: 'en' };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--audio' && args[i + 1]) {
      result.audioPath = args[i + 1];
      i += 1;
    } else if (arg === '--language' && args[i + 1]) {
      result.audioLanguage = args[i + 1];
      i += 1;
    }
  }

  return result;
}

function scoreHintMatch(translatedText, hints) {
  const lower = String(translatedText || '').toLowerCase();
  let hits = 0;
  for (const hint of hints) {
    if (lower.includes(String(hint).toLowerCase())) hits += 1;
  }
  return {
    hits,
    total: hints.length,
    ratio: hints.length ? hits / hints.length : 0,
  };
}

async function validateTranslationPipeline() {
  console.log(`\n[translation] using NLP URL: ${NLP_URL}`);
  const results = [];

  for (const sample of translationSamples) {
    const payload = { text: sample.text, language: sample.language };
    try {
      const { data } = await axios.post(`${NLP_URL}/api/nlp/pipeline`, payload, { timeout: 60000 });
      const translated = data?.translated_text || '';
      const translationMeta = data?.translation || {};
      const score = scoreHintMatch(translated, sample.expectedHints);

      const ok = Boolean(translated && translated.trim());
      results.push({
        type: 'translation',
        language: sample.language,
        ok,
        translated,
        applied: !!translationMeta.applied,
        fallback: !!translationMeta.fallback,
        reason: translationMeta.reason || null,
        hintScore: score,
      });
    } catch (e) {
      results.push({
        type: 'translation',
        language: sample.language,
        ok: false,
        error: e?.response?.data || e?.message || String(e),
      });
    }
  }

  return results;
}

async function validateAsr(audioPath, language) {
  if (!audioPath) {
    return {
      skipped: true,
      reason: 'No audio path provided. Pass --audio <path-to-file> to run ASR validation.',
    };
  }

  const abs = path.resolve(process.cwd(), audioPath);
  if (!fs.existsSync(abs)) {
    return { skipped: false, ok: false, error: `Audio file not found: ${abs}` };
  }

  const form = new FormData();
  form.append('language', language || 'en');
  form.append('audio', fs.createReadStream(abs));

  try {
    const { data } = await axios.post(`${NLP_URL}/api/nlp/speech-to-text`, form, {
      timeout: 90000,
      headers: form.getHeaders(),
      maxBodyLength: Infinity,
    });

    const text = String(data?.text || '').trim();
    return {
      skipped: false,
      ok: Boolean(text),
      text,
      model: data?.model || null,
      fallback: !!data?.fallback,
      reason: data?.reason || null,
      confidence: typeof data?.confidence === 'number' ? data.confidence : null,
    };
  } catch (e) {
    return {
      skipped: false,
      ok: false,
      error: e?.response?.data || e?.message || String(e),
    };
  }
}

function printTranslationResults(results) {
  console.log('\n=== Translation Validation Results ===');
  for (const r of results) {
    if (!r.ok) {
      console.log(`- [FAIL] ${r.language}:`, r.error || 'empty translation output');
      continue;
    }
    const scoreTxt = `${r.hintScore.hits}/${r.hintScore.total}`;
    console.log(
      `- [OK] ${r.language}: applied=${r.applied} fallback=${r.fallback} hints=${scoreTxt}` +
      (r.reason ? ` reason=${r.reason}` : '')
    );
  }
}

function printAsrResult(result) {
  console.log('\n=== ASR Validation Result ===');
  if (result.skipped) {
    console.log(`- [SKIP] ${result.reason}`);
    return;
  }
  if (!result.ok) {
    console.log('- [FAIL]', result.error || 'ASR returned empty text');
    return;
  }
  console.log(
    `- [OK] model=${result.model || 'unknown'} fallback=${result.fallback} ` +
    `confidence=${result.confidence ?? 'n/a'}`
  );
  if (result.reason) {
    console.log(`  reason=${result.reason}`);
  }
  console.log(`  text=${result.text}`);
}

async function main() {
  const { audioPath, audioLanguage } = parseArgs();

  let healthOk = true;
  try {
    const { data } = await axios.get(`${NLP_URL}/health`, { timeout: 5000 });
    console.log('[health] ok', JSON.stringify(data));
  } catch (e) {
    healthOk = false;
    console.error('[health] failed:', e?.message || e);
  }

  if (!healthOk) {
    process.exit(1);
    return;
  }

  const translationResults = await validateTranslationPipeline();
  const asrResult = await validateAsr(audioPath, audioLanguage);

  printTranslationResults(translationResults);
  printAsrResult(asrResult);

  const hasTranslationFailure = translationResults.some((r) => !r.ok);
  const hasAsrFailure = !asrResult.skipped && !asrResult.ok;

  if (hasTranslationFailure || hasAsrFailure) {
    process.exit(1);
    return;
  }

  console.log('\nValidation passed.');
}

main().catch((e) => {
  console.error('Validation run failed:', e?.message || e);
  process.exit(1);
});
