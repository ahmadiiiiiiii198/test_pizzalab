const { MongoClient } = require('mongodb');

// MongoDB connection string
const connectionString = "mongodb+srv://ahmadiemperor_db_user:svZEolmfhlagqshT@cluster0.src3yaw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// Hero section data structure based on your types
const heroData = {
  // Main content fields
  welcomeMessage: "BENVENUTI DA PIZZALAB",
  pizzaType: "la Pizza Napoletana",
  subtitle: "ad Alta Digeribilità, anche Gluten Free!",
  openingHours: "APERTO 7 SU 7 DALLE 19",
  buttonText: "ORDINA LA TUA PIZZA",
  
  // Font styling options
  welcomeMessageFont: "font-bold",
  pizzaTypeFont: "italic",
  subtitleFont: "font-light",
  
  // Legacy fields for backward compatibility
  heading: "BENVENUTI DA PIZZALAB",
  subheading: "la Pizza Napoletana ad Alta Digeribilità",
  
  // Image fields (you can update these with your actual image URLs)
  backgroundImage: "https://images.unsplash.com/photo-1513104890138-7c749659a591?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80",
  heroImage: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
  
  // Metadata
  createdAt: new Date(),
  updatedAt: new Date(),
  isActive: true
};

async function setupHeroSection() {
  let client;
  
  try {
    console.log('🔌 Connecting to MongoDB...');
    client = new MongoClient(connectionString);
    await client.connect();
    console.log('✅ Connected to MongoDB successfully!');
    
    // Select database and collection
    const db = client.db('pizzalab');
    const heroCollection = db.collection('hero_content');
    
    // Check if hero content already exists
    const existingHero = await heroCollection.findOne({});
    
    if (existingHero) {
      console.log('📝 Hero content already exists. Updating...');
      const result = await heroCollection.updateOne(
        { _id: existingHero._id },
        { 
          $set: {
            ...heroData,
            updatedAt: new Date()
          }
        }
      );
      console.log('✅ Hero content updated successfully!', result);
    } else {
      console.log('📝 Creating new hero content...');
      const result = await heroCollection.insertOne(heroData);
      console.log('✅ Hero content created successfully!', result);
    }
    
    // Verify the data
    const savedHero = await heroCollection.findOne({});
    console.log('🍕 Saved hero content:', JSON.stringify(savedHero, null, 2));
    
    // Create indexes for better performance
    await heroCollection.createIndex({ isActive: 1 });
    await heroCollection.createIndex({ updatedAt: -1 });
    console.log('📊 Indexes created successfully!');
    
  } catch (error) {
    console.error('❌ Error setting up hero section:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 MongoDB connection closed');
    }
  }
}

// Additional function to get hero content
async function getHeroContent() {
  let client;
  
  try {
    console.log('🔌 Connecting to MongoDB to fetch hero content...');
    client = new MongoClient(connectionString);
    await client.connect();
    
    const db = client.db('pizzalab');
    const heroCollection = db.collection('hero_content');
    
    const heroContent = await heroCollection.findOne({ isActive: true });
    console.log('🍕 Current hero content:', JSON.stringify(heroContent, null, 2));
    
    return heroContent;
    
  } catch (error) {
    console.error('❌ Error fetching hero content:', error);
    return null;
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Additional function to update specific hero fields
async function updateHeroField(fieldName, newValue) {
  let client;
  
  try {
    console.log(`🔌 Connecting to MongoDB to update ${fieldName}...`);
    client = new MongoClient(connectionString);
    await client.connect();
    
    const db = client.db('pizzalab');
    const heroCollection = db.collection('hero_content');
    
    const result = await heroCollection.updateOne(
      { isActive: true },
      { 
        $set: {
          [fieldName]: newValue,
          updatedAt: new Date()
        }
      }
    );
    
    console.log(`✅ Updated ${fieldName} successfully!`, result);
    
    // Return updated document
    const updatedHero = await heroCollection.findOne({ isActive: true });
    return updatedHero;
    
  } catch (error) {
    console.error(`❌ Error updating ${fieldName}:`, error);
    return null;
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Run the setup if this script is executed directly
if (require.main === module) {
  setupHeroSection();
}

// Export functions for use in other scripts
module.exports = {
  setupHeroSection,
  getHeroContent,
  updateHeroField,
  heroData
};
