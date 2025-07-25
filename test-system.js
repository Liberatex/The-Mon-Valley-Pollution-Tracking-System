#!/usr/bin/env node

const axios = require('axios');

console.log('🧪 Testing Mon Valley Pollution Tracking System...\n');

async function testBackendHealth() {
  console.log('1. Testing Backend Health...');
  try {
    const response = await axios.get('http://localhost:5001/api/health');
    console.log('✅ Backend is healthy:', response.data.status);
    return true;
  } catch (error) {
    console.log('❌ Backend health check failed:', error.message);
    return false;
  }
}

async function testOllamaConnection() {
  console.log('\n2. Testing Ollama Connection...');
  try {
    const response = await axios.get('http://localhost:5001/api/ollama-test');
    console.log('✅ Ollama connection successful');
    console.log('   Model:', response.data.model);
    console.log('   Response:', response.data.response);
    return true;
  } catch (error) {
    console.log('❌ Ollama connection failed:', error.message);
    return false;
  }
}

async function testRAGKnowledgeBase() {
  console.log('\n3. Testing RAG Knowledge Base...');
  
  const testQueries = [
    'Tell me about air quality in the Mon Valley',
    'What are the health effects of PM2.5?',
    'Tell me about the Clairton steel mill',
    'What data sources do you use for air quality?'
  ];
  
  for (let i = 0; i < testQueries.length; i++) {
    const query = testQueries[i];
    console.log(`   Testing query ${i + 1}: "${query}"`);
    
    try {
      const response = await axios.post('http://localhost:5001/api/llama3-chat', {
        message: query
      });
      
      console.log(`   ✅ Response received (${response.data.response.length} chars)`);
      console.log(`   📚 Context used: ${response.data.context_used}`);
      if (response.data.sources && response.data.sources.length > 0) {
        console.log(`   🔗 Sources: ${response.data.sources.join(', ')}`);
      }
      
      // Add a small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.log(`   ❌ Query failed: ${error.message}`);
    }
  }
  
  return true;
}

async function testFrontendDeployment() {
  console.log('\n4. Testing Frontend Deployment...');
  try {
    const response = await axios.get('https://mv-pollution-tracking-system.web.app');
    console.log('✅ Frontend is deployed and accessible');
    console.log('   URL: https://mv-pollution-tracking-system.web.app');
    return true;
  } catch (error) {
    console.log('❌ Frontend deployment check failed:', error.message);
    return false;
  }
}

async function runAllTests() {
  const results = {
    backend: await testBackendHealth(),
    ollama: await testOllamaConnection(),
    rag: await testRAGKnowledgeBase(),
    frontend: await testFrontendDeployment()
  };
  
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  console.log(`Backend Health: ${results.backend ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Ollama Connection: ${results.ollama ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`RAG Knowledge Base: ${results.rag ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Frontend Deployment: ${results.frontend ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = Object.values(results).every(result => result);
  
  if (allPassed) {
    console.log('\n🎉 All tests passed! The system is working correctly.');
    console.log('\n🚀 Next Steps:');
    console.log('   1. Visit https://mv-pollution-tracking-system.web.app');
    console.log('   2. Test the BreatheAI chat feature');
    console.log('   3. Check the Dashboard and Sensor Map');
    console.log('   4. Submit a symptom report');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the errors above.');
  }
}

// Run the tests
runAllTests().catch(console.error); 