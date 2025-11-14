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
      // If health check succeeds and circuit is open, reset it
      if (this._circuitOpen() && data?.status === 'ok') {
        console.log('🔄 NLP service is healthy, resetting circuit breaker');
        this._failureCount = 0;
        this._circuitOpenUntil = 0;
      }
      return { reachable: true, raw: data };
    } catch (e) {
      return { reachable: false, error: e?.message };
    }
  }

  // Method to manually reset circuit breaker
  resetCircuit() {
    console.log('🔄 Manually resetting NLP circuit breaker');
    this._failureCount = 0;
    this._circuitOpenUntil = 0;
  }

  _circuitOpen() {
    return Date.now() < this._circuitOpenUntil;
  }

  async _requestWithRetry(fn, opName = 'nlp') {
    if (!this.enabled) return null;
    if (this._circuitOpen()) {
      // Before rejecting, check if service is actually healthy now
      const health = await this.checkHealth();
      if (health.reachable) {
        console.log('✅ NLP service recovered, resetting circuit and proceeding with request');
        // Force reset since service is reachable
        this.resetCircuit();
        // Now proceed with the request (circuit is closed)
      } else {
        const err = new Error('NLP service unavailable (circuit open). The NLP service may not be running.');
        err.code = 'NLP_CIRCUIT_OPEN';
        err.serviceUnavailable = true;
        throw err;
      }
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

  async findDuplicates(text, candidates = [], threshold) {
    const url = `${NLP_SERVICE_URL}/api/nlp/find-duplicates`;
    const params = {};
    if (Array.isArray(candidates) && candidates.length) params.candidates = candidates;
    if (typeof threshold === 'number') params.threshold = threshold;
    const exec = async () => {
      const { data } = await axios.post(url, { text }, { timeout: NLP_TIMEOUT, params });
      return data;
    };
    return this._requestWithRetry(exec, 'findDuplicates');
  }

  async embed(text) {
    const url = `${NLP_SERVICE_URL}/api/nlp/embed`;
    const exec = async () => {
      const { data } = await axios.post(
        url,
        { text },
        { timeout: Math.min(NLP_TIMEOUT, 10000) }
      );
      return data;
    };
    return this._requestWithRetry(exec, 'embed');
  }

  async pipeline(text, language = 'en') {
    const url = `${NLP_SERVICE_URL}/api/nlp/pipeline`;
    const exec = async () => {
      const { data } = await axios.post(
        url,
        { text, language },
        { timeout: NLP_TIMEOUT }
      );
      return data;
    };
    return this._requestWithRetry(exec, 'pipeline');
  }

  async predict(text = 'This is a great day!') {
    const url = `${NLP_SERVICE_URL}/predict`;
    const exec = async () => {
      const { data } = await axios.get(url, {
        params: { text },
        timeout: Math.min(NLP_TIMEOUT, 5000),
      });
      return data;
    };
    return this._requestWithRetry(exec, 'predict');
  }
}

module.exports = new NLPService();
