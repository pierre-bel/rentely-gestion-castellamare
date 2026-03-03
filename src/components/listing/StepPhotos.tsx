import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ListingFormData } from "@/pages/host/CreateListing";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";

interface StepPhotosProps {
  formData: ListingFormData;
  updateFormData: (data: Partial<ListingFormData>) => void;
}

const StepPhotos = ({ formData, updateFormData }: StepPhotosProps) => {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      const uploadedUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split(".").pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError, data } = await supabase.storage
          .from("listing-images")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("listing-images")
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      }

      if (uploadedUrls.length > 0) {
        if (!formData.cover_image) {
          updateFormData({
            cover_image: uploadedUrls[0],
            images: [...formData.images, ...uploadedUrls.slice(1)],
          });
        } else {
          updateFormData({
            images: [...formData.images, ...uploadedUrls],
          });
        }

        toast({
          title: "Succès",
          description: `${uploadedUrls.length} photo(s) téléchargée(s) avec succès`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Échec du téléchargement",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number, isCover: boolean) => {
    if (isCover) {
      const newCover = formData.images[0] || "";
      const newImages = formData.images.slice(1);
      updateFormData({ cover_image: newCover, images: newImages });
    } else {
      const newImages = formData.images.filter((_, i) => i !== index);
      updateFormData({ images: newImages });
    }
  };

  const setCoverImage = (index: number) => {
    if (index === 0) return;
    
    const newCoverUrl = allImages[index];
    const oldCoverUrl = allImages[0];
    
    const newImages = [
      oldCoverUrl,
      ...formData.images.filter((_, i) => i !== index - 1)
    ];
    
    updateFormData({ 
      cover_image: newCoverUrl, 
      images: newImages 
    });
  };

  const allImages = [
    ...(formData.cover_image ? [formData.cover_image] : []),
    ...formData.images,
  ];

  return (
    <div className="space-y-4">
      <div>
        <Label>Photos du bien</Label>
        <p className="text-sm text-muted-foreground mb-4">
          Téléchargez les photos de votre bien. La première photo sera utilisée comme image de couverture.
        </p>

        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
            id="photo-upload"
          />
          <label htmlFor="photo-upload" className="cursor-pointer">
            {uploading ? (
              <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
            ) : (
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            )}
            <p className="text-sm font-medium mb-1">
              {uploading ? "Téléchargement en cours..." : "Cliquez pour ajouter des photos"}
            </p>
            <p className="text-xs text-muted-foreground">
              PNG, JPG, WEBP jusqu'à 10 Mo
            </p>
          </label>
        </div>
      </div>

      {allImages.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {allImages.map((url, index) => (
            <div 
              key={url} 
              className={`relative group ${index !== 0 ? 'cursor-pointer' : ''}`}
              onClick={() => setCoverImage(index)}
            >
              <img
                src={url}
                alt={`Photo ${index + 1}`}
                className="w-full h-40 object-cover rounded-lg"
              />
              {index === 0 && (
                <div className="absolute top-2 left-2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-medium">
                  Couverture
                </div>
              )}
              {index !== 0 && (
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Définir comme couverture
                  </span>
                </div>
              )}
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  removeImage(index === 0 ? 0 : index - 1, index === 0);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {allImages.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Aucune photo téléchargée</p>
        </div>
      )}
    </div>
  );
};

export default StepPhotos;
