import { useState, useEffect, useCallback } from 'react';
import type { HeroContent } from '@/types/hero';

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

// Cache configuration
const CACHE_KEY = 'heroContent_mongodb_cache';
const CACHE_TIMESTAMP_KEY = 'heroContent_mongodb_cache_timestamp';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// API base URL
const API_BASE_URL = 'http://localhost:3001';

/**
 * Custom hook for managing hero content with MongoDB
 */
export function useMongoHeroContent(): [HeroContent, (value: HeroContent) => Promise<boolean>, boolean] {
  const [content, setContent] = useState<HeroContent>(DEFAULT_HERO_CONTENT);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Fetch hero content from MongoDB API
   */
  const fetchHeroContent = useCallback(async (): Promise<HeroContent> => {
    try {
      console.log('🍕 [useMongoHeroContent] Fetching hero content from MongoDB API...');
      
      // Check cache first
      const cachedData = localStorage.getItem(CACHE_KEY);
      const cacheTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
      
      if (cachedData && cacheTimestamp) {
        const age = Date.now() - parseInt(cacheTimestamp);
        if (age < CACHE_DURATION) {
          console.log('🍕 [useMongoHeroContent] Using cached hero content');
          return JSON.parse(cachedData);
        }
      }

      // First try to fetch from synced JSON file
      try {
        const jsonResponse = await fetch('/hero-content.json', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (jsonResponse.ok) {
          const data = await jsonResponse.json();

          // Cache the result
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(data));
            localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
          } catch (error) {
            console.warn('⚠️ [useMongoHeroContent] Failed to cache data:', error);
          }

          console.log('✅ [useMongoHeroContent] Hero content fetched from synced JSON');
          return data;
        }
      } catch (jsonError) {
        console.warn('⚠️ [useMongoHeroContent] JSON fetch failed, trying API:', jsonError);
      }

      // Fallback to API
      const response = await fetch(`${API_BASE_URL}/api/hero-content`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        // Cache the result
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(data.data));
          localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
        } catch (error) {
          console.warn('⚠️ [useMongoHeroContent] Failed to cache data:', error);
        }

        console.log('✅ [useMongoHeroContent] Hero content fetched from API');
        return data.data;
      } else {
        throw new Error(data.error || 'Failed to fetch hero content');
      }

    } catch (error) {
      console.error('❌ [useMongoHeroContent] Error fetching hero content:', error);
      
      // Try localStorage fallback
      try {
        const cachedData = localStorage.getItem(CACHE_KEY);
        if (cachedData) {
          console.log('🍕 [useMongoHeroContent] Using localStorage fallback');
          return JSON.parse(cachedData);
        }
      } catch (cacheError) {
        console.warn('⚠️ [useMongoHeroContent] Cache fallback failed:', cacheError);
      }

      // Return default content as last resort
      console.log('🍕 [useMongoHeroContent] Using default hero content');
      return DEFAULT_HERO_CONTENT;
    }
  }, []);

  /**
   * Update hero content in MongoDB
   */
  const updateHeroContent = useCallback(async (newContent: HeroContent): Promise<boolean> => {
    try {
      console.log('🍕 [useMongoHeroContent] Updating hero content in MongoDB...');
      
      const response = await fetch(`${API_BASE_URL}/api/hero-content`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newContent),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        // Update local state
        setContent(data.data);
        
        // Update cache
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(data.data));
          localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
        } catch (error) {
          console.warn('⚠️ [useMongoHeroContent] Failed to update cache:', error);
        }

        // Dispatch custom event for other components
        window.dispatchEvent(new CustomEvent('heroContentUpdated', {
          detail: data.data
        }));

        console.log('✅ [useMongoHeroContent] Hero content updated successfully');
        return true;
      } else {
        throw new Error(data.error || 'Failed to update hero content');
      }

    } catch (error) {
      console.error('❌ [useMongoHeroContent] Error updating hero content:', error);
      return false;
    }
  }, []);

  /**
   * Load hero content on component mount
   */
  useEffect(() => {
    let isMounted = true;

    const loadContent = async () => {
      setIsLoading(true);
      try {
        const heroContent = await fetchHeroContent();
        if (isMounted) {
          setContent(heroContent);
        }
      } catch (error) {
        console.error('❌ [useMongoHeroContent] Error loading content:', error);
        if (isMounted) {
          setContent(DEFAULT_HERO_CONTENT);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadContent();

    return () => {
      isMounted = false;
    };
  }, [fetchHeroContent]);

  /**
   * Listen for hero content updates from admin panel
   */
  useEffect(() => {
    const handleHeroContentUpdate = async (event: CustomEvent) => {
      console.log('🍕 [useMongoHeroContent] Received hero content update event:', event.detail);
      
      // Clear cache to force refresh
      try {
        localStorage.removeItem(CACHE_KEY);
        localStorage.removeItem(CACHE_TIMESTAMP_KEY);
        console.log('🧹 [useMongoHeroContent] Cleared hero content cache');
      } catch (e) {
        console.warn('⚠️ [useMongoHeroContent] Failed to clear cache:', e);
      }

      // Refresh content
      try {
        const freshContent = await fetchHeroContent();
        setContent(freshContent);
      } catch (error) {
        console.error('❌ [useMongoHeroContent] Error refreshing content:', error);
      }
    };

    window.addEventListener('heroContentUpdated', handleHeroContentUpdate as EventListener);

    return () => {
      window.removeEventListener('heroContentUpdated', handleHeroContentUpdate as EventListener);
    };
  }, [fetchHeroContent]);

  return [content, updateHeroContent, isLoading] as const;
}

/**
 * Preload hero content for better performance
 */
export async function preloadMongoHeroContent(): Promise<HeroContent> {
  try {
    // Check cache first
    const cachedData = localStorage.getItem(CACHE_KEY);
    const cacheTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
    
    if (cachedData && cacheTimestamp) {
      const age = Date.now() - parseInt(cacheTimestamp);
      if (age < CACHE_DURATION) {
        console.log('🍕 [preloadMongoHeroContent] Using cached hero content');
        return JSON.parse(cachedData);
      }
    }

    // First try synced JSON file
    try {
      const jsonResponse = await fetch('/hero-content.json');
      if (jsonResponse.ok) {
        const data = await jsonResponse.json();

        // Cache the result
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(data));
          localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
        } catch (error) {
          console.warn('⚠️ [preloadMongoHeroContent] Failed to cache data:', error);
        }

        return data;
      }
    } catch (jsonError) {
      console.warn('⚠️ [preloadMongoHeroContent] JSON fetch failed, trying API:', jsonError);
    }

    // Fallback to API
    const response = await fetch(`${API_BASE_URL}/api/hero-content`);
    const data = await response.json();

    if (data.success && data.data) {
      // Cache the result
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(data.data));
        localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
      } catch (error) {
        console.warn('⚠️ [preloadMongoHeroContent] Failed to cache data:', error);
      }

      return data.data;
    }
    
    return DEFAULT_HERO_CONTENT;
  } catch (error) {
    console.warn('⚠️ [preloadMongoHeroContent] Failed to preload, using default:', error);
    return DEFAULT_HERO_CONTENT;
  }
}

// Start preloading immediately
preloadMongoHeroContent();
