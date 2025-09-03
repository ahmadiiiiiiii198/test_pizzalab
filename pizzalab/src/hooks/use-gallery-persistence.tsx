
import { useToast } from "@/hooks/use-toast";
import { GalleryImage } from "@/types/gallery";
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";

interface GalleryPersistenceOptions {
  images: GalleryImage[];
  setImages: React.Dispatch<React.SetStateAction<GalleryImage[]>>;
  setHasChanges: React.Dispatch<React.SetStateAction<boolean>>;
}

export const useGalleryPersistence = ({ 
  images, 
  setImages, 
  setHasChanges 
}: GalleryPersistenceOptions) => {
  const { toast } = useToast();

  const saveChanges = useCallback(async () => {
    try {
      console.log("Gallery: Saving images:", images.length);
      
      // Process images before storage
      const processedImages = images.map((img, index) => {
        // Create a clean version for storage
        const cleanImage = {
          id: parseInt(img.id) || index + 1,
          storage_path: img.src,
          title: img.alt || "Gallery Image",
          description: img.alt || "Gallery Image",
          featured: !!img.featured,
          order: index,
          created_at: new Date().toISOString()
        };
        
        return cleanImage;
      });
      
      // Save to localStorage for immediate feedback and offline access
      localStorage.setItem('galleryImages', JSON.stringify(images));
      
      // First, clear existing gallery entries
      const { error: deleteError } = await supabase
        .from('gallery_images')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

      if (deleteError) {
        console.warn("Gallery: Error deleting existing gallery items:", deleteError);
      }

      // Transform images to match gallery_images table structure
      const galleryRecords = processedImages.map((img, index) => ({
        id: `${Date.now()}-${index}`,
        title: img.title || `Gallery Image ${index + 1}`,
        description: img.description || '',
        image_url: img.storage_path || '',
        category: 'main',
        sort_order: img.order || (index + 1),
        is_active: true,
        created_at: new Date().toISOString()
      }));

      // Add new entries to the gallery_images table
      const { error: insertError } = await supabase
        .from('gallery_images')
        .insert(galleryRecords);
        
      if (insertError) {
        console.warn("Gallery: Error inserting new gallery items:", insertError);
        // Fallback to settings table if gallery_images table insert fails
        const { error: settingsError } = await supabase
          .from('settings')
          .upsert({
            key: 'gallery_images',
            value: images as unknown as Json,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'key'
          });

        if (settingsError) {
          throw settingsError;
        }
      }
      
      // Dispatch a custom event for cross-component communication
      const event = new CustomEvent('localStorageUpdated', {
        detail: { 
          key: 'galleryImages', 
          timestamp: Date.now(),
          source: 'gallery-save'
        }
      });
      window.dispatchEvent(event);
      
      setHasChanges(false);
      
      console.log("Gallery: Images saved successfully:", processedImages.length);
      
      toast({
        title: "Gallery saved",
        description: "Your gallery changes have been saved successfully",
      });

      return true;
    } catch (error) {
      console.error('Gallery: Error saving gallery changes:', error);
      
      toast({
        title: "Save failed",
        description: "There was a problem saving your gallery changes. Please try again.",
        variant: "destructive",
      });

      return false;
    }
  }, [images, toast, setHasChanges]);

  const updateImageOrder = useCallback((newOrder: GalleryImage[]) => {
    setImages(newOrder);
    setHasChanges(true);
  }, [setImages, setHasChanges]);

  return {
    saveChanges,
    updateImageOrder
  };
};
