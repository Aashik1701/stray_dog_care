const axios = require('axios');
require('dotenv').config();

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const NLP_SERVICE_URL = process.env.NLP_SERVICE_URL || 'http://localhost:8000';
const AUTH_TOKEN = process.argv[2]; // Pass token as argument

async function checkNLPService() {
  console.log('🔍 Checking NLP Service Status...\n');

  // Check NLP service directly
  console.log('1. Checking NLP service directly:');
  try {
    const healthResponse = await axios.get(`${NLP_SERVICE_URL}/health`, { timeout: 3000 });
    console.log('   ✅ NLP service is running');
    console.log('   Response:', JSON.stringify(healthResponse.data, null, 2));
  } catch (error) {
    console.log('   ❌ NLP service is NOT running');
    console.log('   Error:', error.message);
    console.log(`   💡 Start it with: cd nlp_service && python3 -m uvicorn main:app --host 0.0.0.0 --port 8000`);
  }

  // Check backend NLP status endpoint
  console.log('\n2. Checking backend NLP status:');
  try {
    const statusResponse = await axios.get(`${BACKEND_URL}/api/nlp/status`);
    console.log('   ✅ Backend NLP status:', JSON.stringify(statusResponse.data, null, 2));
    
    if (statusResponse.data?.data?.circuitOpen) {
      console.log('   ⚠️  Circuit breaker is OPEN');
      if (AUTH_TOKEN) {
        console.log('\n3. Attempting to reset circuit breaker...');
        try {
          const resetResponse = await axios.post(
            `${BACKEND_URL}/api/nlp/reset-circuit`,
            {},
            { headers: { Authorization: `Bearer ${AUTH_TOKEN}` } }
          );
          console.log('   ✅ Circuit breaker reset:', JSON.stringify(resetResponse.data, null, 2));
        } catch (error) {
          console.log('   ❌ Failed to reset:', error.response?.data || error.message);
        }
      } else {
        console.log('   💡 To reset circuit breaker, pass your auth token:');
        console.log(`      node check-nlp-service.js <your-auth-token>`);
      }
    } else {
      console.log('   ✅ Circuit breaker is CLOSED (requests will go through)');
    }
  } catch (error) {
    console.log('   ❌ Failed to get backend status:', error.message);
  }

  console.log('\n📝 Summary:');
  console.log('   - NLP Service URL:', NLP_SERVICE_URL);
  console.log('   - Backend URL:', BACKEND_URL);
  console.log('   - To start NLP service: cd nlp_service && python3 -m uvicorn main:app --host 0.0.0.0 --port 8000');
}

checkNLPService().catch(console.error);

