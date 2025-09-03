import type { HeroContent } from '@/types/hero';

// MongoDB connection configuration
const MONGODB_CONNECTION_STRING = "mongodb+srv://ahmadiemperor_db_user:svZEolmfhlagqshT@cluster0.src3yaw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const DATABASE_NAME = 'pizzalab';
const COLLECTION_NAME = 'hero_content';

// Default hero content
const DEFAULT_HERO_CONTENT: HeroContent = {
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

class MongoHeroService {
  private cache: HeroContent | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private subscribers: Array<(content: HeroContent) => void> = [];

  /**
   * Fetch hero content from localStorage or return default
   * Since we can't directly connect to MongoDB from frontend,
   * we'll use localStorage as primary storage with sync via scripts
   */
  async getHeroContent(): Promise<HeroContent> {
    try {
      // Check cache first
      if (this.cache && (Date.now() - this.cacheTimestamp) < this.CACHE_DURATION) {
        console.log('🍕 [MongoHeroService] Using cached hero content');
        return this.cache;
      }

      console.log('🍕 [MongoHeroService] Loading hero content from localStorage...');

      // Try to get from localStorage (synced by background scripts)
      const cachedData = localStorage.getItem('heroContent_mongodb_cache');
      if (cachedData) {
        try {
          const parsed = JSON.parse(cachedData);
          this.cache = parsed;
          this.cacheTimestamp = Date.now();
          console.log('✅ [MongoHeroService] Hero content loaded from localStorage');
          return this.cache;
        } catch (parseError) {
          console.warn('⚠️ [MongoHeroService] Failed to parse cached data:', parseError);
        }
      }

      // If no cached data, try to fetch from synced JSON file
      try {
        const response = await fetch('/hero-content.json', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          this.cache = data;
          this.cacheTimestamp = Date.now();

          // Cache in localStorage
          localStorage.setItem('heroContent_mongodb_cache', JSON.stringify(data));

          console.log('✅ [MongoHeroService] Hero content fetched from synced JSON and cached');
          return this.cache;
        }
      } catch (jsonError) {
        console.warn('⚠️ [MongoHeroService] JSON fetch failed, trying API fallback:', jsonError);

        // Fallback to API if JSON fails
        try {
          const response = await fetch('http://localhost:3001/api/hero-content', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data) {
              this.cache = data.data;
              this.cacheTimestamp = Date.now();

              // Cache in localStorage
              localStorage.setItem('heroContent_mongodb_cache', JSON.stringify(data.data));

              console.log('✅ [MongoHeroService] Hero content fetched from API fallback and cached');
              return this.cache;
            }
          }
        } catch (apiError) {
          console.warn('⚠️ [MongoHeroService] API fallback also failed:', apiError);
        }
      }

      // Return default content as last resort
      console.log('🍕 [MongoHeroService] Using default hero content');
      this.cache = DEFAULT_HERO_CONTENT;
      return DEFAULT_HERO_CONTENT;

    } catch (error) {
      console.error('❌ [MongoHeroService] Error fetching hero content:', error);
      return DEFAULT_HERO_CONTENT;
    }
  }

  /**
   * Update hero content in localStorage and sync to MongoDB via API
   */
  async updateHeroContent(content: Partial<HeroContent>): Promise<boolean> {
    try {
      console.log('🍕 [MongoHeroService] Updating hero content...');

      // Update local cache immediately
      this.cache = { ...this.cache, ...content } as HeroContent;
      this.cacheTimestamp = Date.now();

      // Update localStorage cache immediately for instant UI update
      try {
        localStorage.setItem('heroContent_mongodb_cache', JSON.stringify(this.cache));
        console.log('✅ [MongoHeroService] Hero content updated in localStorage');
      } catch (error) {
        console.warn('⚠️ [MongoHeroService] Failed to update localStorage cache:', error);
      }

      // Notify subscribers immediately
      this.notifySubscribers(this.cache);

      // Try to sync to MongoDB via API in background
      try {
        const response = await fetch('http://localhost:3001/api/hero-content', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(content),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            console.log('✅ [MongoHeroService] Hero content synced to MongoDB');
          }
        } else {
          console.warn('⚠️ [MongoHeroService] Failed to sync to MongoDB, but local update succeeded');
        }
      } catch (apiError) {
        console.warn('⚠️ [MongoHeroService] API sync failed, but local update succeeded:', apiError);
      }

      return true;

    } catch (error) {
      console.error('❌ [MongoHeroService] Error updating hero content:', error);
      return false;
    }
  }

  /**
   * Subscribe to hero content changes
   */
  subscribe(callback: (content: HeroContent) => void): () => void {
    this.subscribers.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  /**
   * Notify all subscribers of content changes
   */
  private notifySubscribers(content: HeroContent): void {
    this.subscribers.forEach(callback => {
      try {
        callback(content);
      } catch (error) {
        console.error('❌ [MongoHeroService] Error in subscriber callback:', error);
      }
    });
  }

  /**
   * Clear cache and force refresh
   */
  clearCache(): void {
    this.cache = null;
    this.cacheTimestamp = 0;
    try {
      localStorage.removeItem('heroContent_mongodb_cache');
    } catch (error) {
      console.warn('⚠️ [MongoHeroService] Failed to clear localStorage cache:', error);
    }
  }

  /**
   * Preload hero content for better performance
   */
  async preload(): Promise<void> {
    try {
      await this.getHeroContent();
    } catch (error) {
      console.warn('⚠️ [MongoHeroService] Preload failed:', error);
    }
  }
}

// Create singleton instance
export const mongoHeroService = new MongoHeroService();

// Preload content immediately
mongoHeroService.preload();

export default mongoHeroService;
