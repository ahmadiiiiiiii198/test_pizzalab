const fetch = require('node-fetch');

async function testAPI() {
  try {
    console.log('🧪 Testing API endpoints...');
    
    // Test health endpoint
    console.log('\n1. Testing health endpoint...');
    const healthResponse = await fetch('http://localhost:3001/health');
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData);
    
    // Test get hero content
    console.log('\n2. Testing get hero content...');
    const getResponse = await fetch('http://localhost:3001/api/hero-content');
    const getData = await getResponse.json();
    console.log('✅ Get hero content:', JSON.stringify(getData, null, 2));
    
    // Test update hero content
    console.log('\n3. Testing update hero content...');
    const updateData = {
      welcomeMessage: "BENVENUTI DA PIZZALAB - UPDATED!",
      pizzaType: "la Pizza Napoletana Autentica"
    };
    
    const updateResponse = await fetch('http://localhost:3001/api/hero-content', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData)
    });
    
    const updateResult = await updateResponse.json();
    console.log('✅ Update result:', JSON.stringify(updateResult, null, 2));
    
    console.log('\n🎉 All API tests completed successfully!');
    
  } catch (error) {
    console.error('❌ API test failed:', error);
  }
}

testAPI();
