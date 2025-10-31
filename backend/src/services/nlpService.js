const axios = require('axios');

const NLP_SERVICE_URL = process.env.NLP_SERVICE_URL || 'http://localhost:8000';
const NLP_ENABLED = (process.env.NLP_ENABLED || 'true').toLowerCase() === 'true';
const NLP_TIMEOUT = parseInt(process.env.NLP_TIMEOUT || '30000', 10);
const NLP_MAX_RETRIES = parseInt(process.env.NLP_MAX_RETRIES || '2', 10);
const NLP_RETRY_BASE_MS = parseInt(process.env.NLP_RETRY_BASE_MS || '300', 10);
const NLP_CIRCUIT_FAILURE_THRESHOLD = parseInt(process.env.NLP_CIRCUIT_FAILURE_THRESHOLD || '3', 10);
const NLP_CIRCUIT_OPEN_MS = parseInt(process.env.NLP_CIRCUIT_OPEN_MS || '60000', 10);

class NLPService {
  constructor() {
    this._failureCount = 0;
    this._circuitOpenUntil = 0; // timestamp ms
  }

  get enabled() {
    return NLP_ENABLED;
  }

  status() {
    return {
      enabled: this.enabled,
      circuitOpen: this._circuitOpen(),
      failureCount: this._failureCount,
      circuitOpenUntil: this._circuitOpenUntil,
      serviceUrl: NLP_SERVICE_URL,
      timeoutMs: NLP_TIMEOUT,
      maxRetries: NLP_MAX_RETRIES,
    };
  }

  async checkHealth() {
    if (!this.enabled) return { reachable: false };
    try {
      const url = `${NLP_SERVICE_URL}/health`;
      const { data } = await axios.get(url, { timeout: Math.min(NLP_TIMEOUT, 3000) });
      return { reachable: true, raw: data };
    } catch (e) {
      return { reachable: false, error: e?.message };
    }
  }

  _circuitOpen() {
    return Date.now() < this._circuitOpenUntil;
  }

  async _requestWithRetry(fn, opName = 'nlp') {
    if (!this.enabled) return null;
    if (this._circuitOpen()) {
      const err = new Error('NLP circuit open');
      err.code = 'NLP_CIRCUIT_OPEN';
      throw err;
    }

    let attempt = 0;
    let lastErr = null;
    while (attempt <= NLP_MAX_RETRIES) {
      try {
        const result = await fn();
        // success -> reset failures
        this._failureCount = 0;
        return result;
      } catch (e) {
        lastErr = e;
        attempt += 1;
        // Non-retryable HTTP codes
        const status = e?.response?.status;
        if (status && status < 500 && status !== 429) {
          break;
        }
        if (attempt > NLP_MAX_RETRIES) break;
        const delay = NLP_RETRY_BASE_MS * Math.pow(2, attempt - 1);
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    // record failure and possibly open circuit
    this._failureCount += 1;
    if (this._failureCount >= NLP_CIRCUIT_FAILURE_THRESHOLD) {
      this._circuitOpenUntil = Date.now() + NLP_CIRCUIT_OPEN_MS;
    }
    throw lastErr || new Error(`${opName} failed`);
  }

  async analyzeReport(text, language = 'en') {
    const url = `${NLP_SERVICE_URL}/api/nlp/analyze-report`;
    const exec = async () => {
      const { data } = await axios.post(url, { text, language }, { timeout: NLP_TIMEOUT });
      return data;
    };
    return this._requestWithRetry(exec, 'analyzeReport');
  }

  async speechToText(formData) {
    const url = `${NLP_SERVICE_URL}/api/nlp/speech-to-text`;
    const exec = async () => {
      const { data } = await axios.post(url, formData, { timeout: NLP_TIMEOUT, headers: formData.getHeaders?.() });
      return data;
    };
    return this._requestWithRetry(exec, 'speechToText');
  }

  async findDuplicates(text) {
    const url = `${NLP_SERVICE_URL}/api/nlp/find-duplicates`;
    const exec = async () => {
      const { data } = await axios.post(url, { text }, { timeout: NLP_TIMEOUT });
      return data;
    };
    return this._requestWithRetry(exec, 'findDuplicates');
  }
}

module.exports = new NLPService();
