const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// MongoDB connection string
const connectionString = "mongodb+srv://ahmadiemperor_db_user:svZEolmfhlagqshT@cluster0.src3yaw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

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
  heroImage: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
};

async function syncHeroToFrontend() {
  let client;
  
  try {
    console.log('🔌 Connecting to MongoDB...');
    client = new MongoClient(connectionString);
    await client.connect();
    console.log('✅ Connected to MongoDB successfully!');
    
    // Get hero content from MongoDB
    const db = client.db('pizzalab');
    const heroCollection = db.collection('hero_content');
    
    const heroContent = await heroCollection.findOne({ isActive: true });
    
    let contentToSync;
    if (heroContent) {
      // Remove MongoDB _id field
      const { _id, ...contentWithoutId } = heroContent;
      contentToSync = contentWithoutId;
      console.log('✅ Hero content found in MongoDB');
    } else {
      contentToSync = DEFAULT_HERO_CONTENT;
      console.log('⚠️ No hero content found in MongoDB, using default');
    }
    
    // Create a JavaScript file that can be loaded by the frontend
    const jsContent = `
// Auto-generated hero content from MongoDB
// Last updated: ${new Date().toISOString()}

window.mongoHeroContent = ${JSON.stringify(contentToSync, null, 2)};

// Also set in localStorage for immediate access
if (typeof localStorage !== 'undefined') {
  try {
    localStorage.setItem('heroContent_mongodb_cache', JSON.stringify(window.mongoHeroContent));
    localStorage.setItem('heroContent_mongodb_cache_timestamp', Date.now().toString());
    console.log('🍕 [Sync] Hero content synced to localStorage');
  } catch (error) {
    console.warn('⚠️ [Sync] Failed to sync to localStorage:', error);
  }
}

// Dispatch event to notify components
if (typeof window !== 'undefined' && window.dispatchEvent) {
  window.dispatchEvent(new CustomEvent('heroContentSynced', {
    detail: window.mongoHeroContent
  }));
}
`;

    // Write to public directory so it can be loaded by the frontend
    const publicPath = path.join(__dirname, 'pizzalab', 'public', 'hero-content.js');
    fs.writeFileSync(publicPath, jsContent);
    console.log('✅ Hero content synced to:', publicPath);
    
    // Also create a JSON file for direct access
    const jsonPath = path.join(__dirname, 'pizzalab', 'public', 'hero-content.json');
    fs.writeFileSync(jsonPath, JSON.stringify(contentToSync, null, 2));
    console.log('✅ Hero content JSON created at:', jsonPath);
    
    console.log('🎉 Hero content sync completed successfully!');
    console.log('📄 Content preview:', {
      welcomeMessage: contentToSync.welcomeMessage,
      pizzaType: contentToSync.pizzaType,
      subtitle: contentToSync.subtitle
    });
    
  } catch (error) {
    console.error('❌ Error syncing hero content:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 MongoDB connection closed');
    }
  }
}

// Run the sync if this script is executed directly
if (require.main === module) {
  syncHeroToFrontend();
}

module.exports = { syncHeroToFrontend };
