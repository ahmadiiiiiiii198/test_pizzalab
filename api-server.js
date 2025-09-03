const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3001;

// MongoDB connection string
const MONGODB_CONNECTION_STRING = "mongodb+srv://ahmadiemperor_db_user:svZEolmfhlagqshT@cluster0.src3yaw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const DATABASE_NAME = 'pizzalab';
const COLLECTION_NAME = 'hero_content';

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB client
let mongoClient;
let db;

// Connect to MongoDB
async function connectToMongoDB() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    mongoClient = new MongoClient(MONGODB_CONNECTION_STRING);
    await mongoClient.connect();
    db = mongoClient.db(DATABASE_NAME);
    console.log('✅ Connected to MongoDB successfully!');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// Default hero content
const DEFAULT_HERO_CONTENT = {
  welcomeMessage: "BENVENUTI DA PIZZALAB",
  pizzaType: "la Pizza Napoletana",
  subtitle: "ad Alta Digeribilità, anche Gluten Free!",
  openingHours: "APERTO 7 SU 7 DALLE 19",
  buttonText: "ORDINA LA TUA PIZZA",
  welcomeMessageFont: "font-bold",
  pizzaTypeFont: "italic",
  subtitleFont: "font-light",
  heading: "BENVENUTI DA PIZZALAB",
  subheading: "la Pizza Napoletana ad Alta Digeribilità",
  backgroundImage: "https://images.unsplash.com/photo-1513104890138-7c749659a591?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80",
  heroImage: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
};

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Get hero content
app.get('/api/hero-content', async (req, res) => {
  try {
    console.log('🍕 [API] Fetching hero content...');
    
    const collection = db.collection(COLLECTION_NAME);
    const heroContent = await collection.findOne({ isActive: true });
    
    if (heroContent) {
      // Remove MongoDB _id from response
      const { _id, ...contentWithoutId } = heroContent;
      console.log('✅ [API] Hero content found');
      res.json({
        success: true,
        data: contentWithoutId
      });
    } else {
      console.log('⚠️ [API] No hero content found, returning default');
      res.json({
        success: true,
        data: DEFAULT_HERO_CONTENT
      });
    }
  } catch (error) {
    console.error('❌ [API] Error fetching hero content:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: DEFAULT_HERO_CONTENT // Fallback
    });
  }
});

// Update hero content
app.put('/api/hero-content', async (req, res) => {
  try {
    console.log('🍕 [API] Updating hero content...');
    
    const updateData = {
      ...req.body,
      updatedAt: new Date()
    };
    
    const collection = db.collection(COLLECTION_NAME);
    
    // Try to update existing document
    const result = await collection.updateOne(
      { isActive: true },
      { 
        $set: updateData
      }
    );
    
    if (result.matchedCount === 0) {
      // No existing document, create new one
      const newDocument = {
        ...DEFAULT_HERO_CONTENT,
        ...updateData,
        isActive: true,
        createdAt: new Date()
      };
      
      await collection.insertOne(newDocument);
      console.log('✅ [API] New hero content created');
    } else {
      console.log('✅ [API] Hero content updated');
    }
    
    // Return updated content
    const updatedContent = await collection.findOne({ isActive: true });
    const { _id, ...contentWithoutId } = updatedContent;
    
    res.json({
      success: true,
      data: contentWithoutId
    });
    
  } catch (error) {
    console.error('❌ [API] Error updating hero content:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create new hero content
app.post('/api/hero-content', async (req, res) => {
  try {
    console.log('🍕 [API] Creating new hero content...');
    
    // Deactivate existing content
    const collection = db.collection(COLLECTION_NAME);
    await collection.updateMany(
      { isActive: true },
      { $set: { isActive: false } }
    );
    
    // Create new content
    const newContent = {
      ...DEFAULT_HERO_CONTENT,
      ...req.body,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await collection.insertOne(newContent);
    
    // Return created content
    const { _id, ...contentWithoutId } = newContent;
    
    console.log('✅ [API] New hero content created with ID:', result.insertedId);
    res.status(201).json({
      success: true,
      data: contentWithoutId
    });
    
  } catch (error) {
    console.error('❌ [API] Error creating hero content:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete hero content (set inactive)
app.delete('/api/hero-content/:id', async (req, res) => {
  try {
    console.log('🍕 [API] Deactivating hero content...');
    
    const collection = db.collection(COLLECTION_NAME);
    const result = await collection.updateOne(
      { _id: new MongoClient.ObjectId(req.params.id) },
      { 
        $set: { 
          isActive: false,
          updatedAt: new Date()
        }
      }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Hero content not found'
      });
    }
    
    console.log('✅ [API] Hero content deactivated');
    res.json({
      success: true,
      message: 'Hero content deactivated'
    });
    
  } catch (error) {
    console.error('❌ [API] Error deactivating hero content:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ [API] Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🔌 Closing MongoDB connection...');
  if (mongoClient) {
    await mongoClient.close();
  }
  console.log('👋 Server shutting down gracefully');
  process.exit(0);
});

// Start server
async function startServer() {
  await connectToMongoDB();
  
  app.listen(PORT, () => {
    console.log(`🚀 API Server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🍕 Hero API: http://localhost:${PORT}/api/hero-content`);
  });
}

startServer().catch(error => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});
