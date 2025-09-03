const http = require('http');

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (error) {
          resolve(data);
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

async function testAPI() {
  try {
    console.log('🧪 Testing API endpoints...');
    
    // Test health endpoint
    console.log('\n1. Testing health endpoint...');
    const healthOptions = {
      hostname: 'localhost',
      port: 3001,
      path: '/health',
      method: 'GET'
    };
    
    const healthData = await makeRequest(healthOptions);
    console.log('✅ Health check:', healthData);
    
    // Test get hero content
    console.log('\n2. Testing get hero content...');
    const getOptions = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/hero-content',
      method: 'GET'
    };
    
    const getData = await makeRequest(getOptions);
    console.log('✅ Get hero content success:', getData.success);
    console.log('📄 Hero data preview:', {
      welcomeMessage: getData.data?.welcomeMessage,
      pizzaType: getData.data?.pizzaType,
      subtitle: getData.data?.subtitle
    });
    
    console.log('\n🎉 API tests completed successfully!');
    
  } catch (error) {
    console.error('❌ API test failed:', error.message);
  }
}

testAPI();
