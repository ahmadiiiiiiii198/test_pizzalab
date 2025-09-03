
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import GalleryImageCard from './GalleryImageCard';
import GalleryUploadDialog from './GalleryUploadDialog';
import MultipleImageUploader, { ImageWithLabel } from './MultipleImageUploader';
import { Plus, Save, Upload } from 'lucide-react';
import { useGalleryManager } from '@/hooks/use-gallery-manager';
import { GalleryImage } from '@/types/gallery';

const GalleryManager: React.FC = () => {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  const { 
    images, 
    isLoading,
    addImage,
    removeImage,
    handleDrop,
    updateImageOrder,
    saveChanges,
    toggleFeatured
  } = useGalleryManager();

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.currentTarget.classList.add('opacity-50');
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('opacity-50');
    setDragOverId(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    e.preventDefault();
    if (dragOverId !== id) {
      setDragOverId(id);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOverId(null);
  };

  const handleDelete = (id: string) => {
    removeImage(id);
    setHasChanges(true);
    toast({
      title: "Immagine rimossa",
      description: "L'immagine è stata rimossa dalla galleria",
    });
  };

  const handleUpload = (image: GalleryImage) => {
    addImage(image);
    setHasChanges(true);
    setIsDialogOpen(false);
    toast({
      title: "Immagine aggiunta",
      description: "L'immagine è stata aggiunta alla galleria",
    });
  };

  const handleMultipleUpload = (imageUrls: string[]) => {
    imageUrls.forEach((url, index) => {
      const newImage: GalleryImage = {
        id: `${Date.now()}-${index}`,
        url,
        title: `Immagine Galleria ${images.length + index + 1}`,
        description: '',
        order: images.length + index,
        is_featured: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      addImage(newImage);
    });

    setHasChanges(true);
    toast({
      title: `${imageUrls.length} immagini aggiunte`,
      description: `Caricate con successo ${imageUrls.length} immagini nella galleria`,
    });
  };

  const handleSaveChanges = async () => {
    setIsUploading(true);
    try {
      await saveChanges();
      setHasChanges(false);
      toast({
        title: "Galleria salvata",
        description: "La tua galleria è stata aggiornata con successo",
      });
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile salvare le modifiche alla galleria. Riprova.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Custom implementation of onDrop that works with our hook
  const onDrop = (e: React.DragEvent<HTMLDivElement>, targetId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain');
    
    if (!sourceId || sourceId === targetId) return;
    
    // Find the indexes of the source and target images
    const sourceIndex = images.findIndex(img => img.id === sourceId);
    const targetIndex = images.findIndex(img => img.id === targetId);
    
    if (sourceIndex === -1 || targetIndex === -1) return;
    
    // Use our own implementation instead of calling the hook directly
    const newImages = [...images];
    const [movedImage] = newImages.splice(sourceIndex, 1);
    newImages.splice(targetIndex, 0, movedImage);
    
    // Update the image order
    updateImageOrder(newImages);
    setHasChanges(true);
    setDragOverId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Gallery Manager</h2>
        <div className="flex gap-2">
          <Button 
            onClick={() => setIsDialogOpen(true)} 
            variant="outline" 
            className="flex items-center gap-1"
          >
            <Plus size={16} />
            Aggiungi Immagine
          </Button>
          <Button
            onClick={handleSaveChanges}
            disabled={isUploading}
            className="flex items-center gap-2"
            variant={hasChanges ? "default" : "secondary"}
          >
            <Save size={16} />
            {hasChanges ? "Salva Modifiche" : "Salva Stato Corrente"}
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Immagini Galleria</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Multiple Image Upload Section */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Caricamento Immagini Multiple
            </h3>
            <MultipleImageUploader
              onImagesSelected={(imageUrls) => {
                // Handle simple image URLs (fallback)
                imageUrls.forEach((url, index) => {
                  const newImage: GalleryImage = {
                    id: `${Date.now()}-${index}`,
                    url: url,
                    title: `Immagine Galleria ${images.length + index + 1}`,
                    description: '',
                    order: images.length + index,
                    is_featured: false,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  };
                  addImage(newImage);
                });

                setHasChanges(true);
                toast({
                  title: `${imageUrls.length} immagini aggiunte`,
                  description: `Caricate con successo ${imageUrls.length} immagini nella galleria`,
                });
              }}
              onImagesWithLabelsSelected={(imagesWithLabels) => {
                imagesWithLabels.forEach((item, index) => {
                  const newImage: GalleryImage = {
                    id: `${Date.now()}-${index}`,
                    url: item.url,
                    title: item.label || `Gallery Image ${images.length + index + 1}`,
                    description: '',
                    order: images.length + index,
                    is_featured: false,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  };
                  addImage(newImage);
                });

                setHasChanges(true);
                toast({
                  title: `${imagesWithLabels.length} immagini aggiunte`,
                  description: `Caricate con successo ${imagesWithLabels.length} immagini con etichette nella galleria`,
                });
              }}
              buttonLabel="Carica Immagini Multiple con Etichette"
              bucketName="gallery"
              folderPath=""
              maxFiles={50}
              enableLabels={true}
              className="border-2 border-dashed border-gray-300 rounded-lg p-4"
            />
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 my-6">
            <p className="text-center text-sm text-gray-500 -mt-3 bg-white px-4 inline-block">
              Immagini Galleria Attuali
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-persian-gold"></div>
            </div>
          ) : images.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <p className="text-gray-500">Nessuna immagine nella galleria. Aggiungi alcune immagini per iniziare.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {images.map((image, index) => (
                <GalleryImageCard 
                  key={image.id}
                  image={image}
                  index={index} // Added index prop
                  onDelete={() => handleDelete(image.id)}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={onDrop}
                  isDragOver={dragOverId === image.id}
                  onToggleFeatured={() => {
                    toggleFeatured(image.id);
                    setHasChanges(true);
                  }}
                />
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter>
          <p className="text-sm text-gray-500">
            Trascina e rilascia le immagini per riordinarle. Le immagini in evidenza appariranno per prime nella galleria.
          </p>
        </CardFooter>
      </Card>

      <GalleryUploadDialog 
        isOpen={isDialogOpen} 
        onClose={() => setIsDialogOpen(false)}
        onUploadComplete={handleUpload}
      />
    </div>
  );
};

export default GalleryManager;
