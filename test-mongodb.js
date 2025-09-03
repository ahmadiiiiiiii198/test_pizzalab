console.log('🚀 Starting MongoDB test...');

const { MongoClient } = require('mongodb');

const connectionString = "mongodb+srv://ahmadiemperor_db_user:svZEolmfhlagqshT@cluster0.src3yaw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

async function testConnection() {
  console.log('🔌 Testing MongoDB connection...');
  
  try {
    const client = new MongoClient(connectionString);
    console.log('📡 Attempting to connect...');
    
    await client.connect();
    console.log('✅ Connected to MongoDB successfully!');
    
    // List databases
    const adminDb = client.db().admin();
    const databases = await adminDb.listDatabases();
    console.log('📊 Available databases:', databases.databases.map(db => db.name));
    
    // Test pizzalab database
    const db = client.db('pizzalab');
    const collections = await db.listCollections().toArray();
    console.log('📁 Collections in pizzalab:', collections.map(col => col.name));
    
    await client.close();
    console.log('🔌 Connection closed successfully');
    
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.error('🔍 Full error:', error);
  }
}

testConnection();
