"use client";

import { useState, useRef } from "react";
import { Image, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ImageShare({ onImageSend, onValidationError, disabled = false }) {
  const [selectedImages, setSelectedImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const fileInputRef = useRef(null);

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    const hasTooManyFiles = selectedImages.length + files.length > 5;
    const invalidTypeFile = files.find((file) => !file.type.startsWith("image/"));
    const invalidSizeFile = files.find((file) => file.size > 5 * 1024 * 1024);

    if (hasTooManyFiles) {
      onValidationError?.("imageLimitError");
    }

    if (invalidTypeFile) {
      onValidationError?.("imageTypeError");
    }

    if (invalidSizeFile) {
      onValidationError?.("imageSizeError");
    }
    
    // Filtrer uniquement les images
    const imageFiles = files.filter(file => file.type.startsWith('image/') && file.size <= 5 * 1024 * 1024);
    
    // Limiter à 5 images maximum
    const limitedFiles = imageFiles.slice(0, 5);
    
    // Créer les previews
    const newPreviews = limitedFiles.map(file => URL.createObjectURL(file));
    
    setSelectedImages(prev => [...prev, ...limitedFiles].slice(0, 5));
    setPreviews(prev => [...prev, ...newPreviews].slice(0, 5));
  };

  const removeImage = (index) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    
    // Libérer l'URL de l'image supprimée
    URL.revokeObjectURL(previews[index]);
    
    setSelectedImages(newImages);
    setPreviews(newPreviews);
  };

  const sendImages = async () => {
    if (selectedImages.length > 0 && onImageSend) {
      const didSend = await onImageSend(selectedImages);
      if (didSend !== false) {
        clearImages();
      }
    }
  };

  const clearImages = () => {
    previews.forEach(preview => URL.revokeObjectURL(preview));
    setSelectedImages([]);
    setPreviews([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (previews.length > 0) {
    return (
      <div className="border rounded-lg p-3 bg-slate-50">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 mb-3">
          {previews.map((preview, index) => (
            <div key={index} className="relative group">
              <div className="aspect-square rounded-lg overflow-hidden bg-slate-200">
                <img 
                  src={preview} 
                  alt={`Preview ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
              <Button
                size="sm"
                variant="destructive"
                className="absolute top-1 right-1 h-6 w-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeImage(index)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={sendImages}
            disabled={disabled}
            className="flex-1 rounded-xl bg-rose-500 hover:bg-rose-600"
          >
            <Send className="h-4 w-4 mr-2" />
            Envoyer les images
          </Button>
          <Button
            variant="outline"
            onClick={clearImages}
            className="rounded-xl"
          >
            Annuler
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleImageSelect}
        className="hidden"
      />
      
      <Button
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled}
        className="rounded-xl"
      >
        <Image className="h-4 w-4 mr-2" />
        Photos
      </Button>
    </div>
  );
}
