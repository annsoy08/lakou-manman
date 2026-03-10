"use client";

import { useState, useRef } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X, Upload, ImageIcon, Camera, Plus } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function ImageUpload({ images = [], onChange, maxImages = 5 }) {
  const { t } = useLanguage();
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  async function uploadFiles(files) {
    if (images.length + files.length > maxImages) {
      alert(t("maxImagesAlert", { maxImages }));
      return;
    }

    setUploading(true);
    const newImages = [];

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        alert(t("imageTypeAlert"));
        continue;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert(t("imageSizeAlert"));
        continue;
      }

      try {
        // Create unique filename
        const timestamp = Date.now();
        const filename = `${timestamp}-${file.name}`;
        const storageRef = ref(storage, `shop-items/${filename}`);

        // Upload file
        await uploadBytes(storageRef, file);
        
        // Get download URL
        const downloadURL = await getDownloadURL(storageRef);
        
        newImages.push({
          url: downloadURL,
          name: file.name,
          size: file.size,
        });
      } catch (error) {
        console.error("Error uploading image:", error);
        alert(t("uploadError"));
      }
    }

    onChange([...images, ...newImages]);
    setUploading(false);
  }

  function handleDrag(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFiles(Array.from(e.dataTransfer.files));
    }
  }

  function handleFileSelect(e) {
    if (e.target.files && e.target.files[0]) {
      uploadFiles(Array.from(e.target.files));
    }
  }

  function removeImage(index) {
    const newImages = images.filter((_, i) => i !== index);
    onChange(newImages);
  }

  return (
    <div className="space-y-4">
      {/* Upload area */}
      {images.length < maxImages && (
        <Card
          className={`border-2 border-dashed transition-colors ${
            dragActive
              ? "border-[#9B2335] bg-rose-50"
              : "border-slate-300 hover:border-slate-400"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <CardContent className="p-6 text-center">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {uploading ? (
              <div className="py-4">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#9B2335] border-t-transparent"></div>
                <p className="mt-2 text-sm text-slate-500">{t("uploadingImages")}</p>
              </div>
            ) : (
              <div className="py-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                  <Upload className="h-6 w-6 text-slate-400" />
                </div>
                <p className="mt-3 text-sm font-medium text-slate-700">
                  {t("dragDropImages")}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 rounded-xl"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="mr-2 h-4 w-4" />
                  {t("chooseFiles")}
                </Button>
                <p className="mt-2 text-xs text-slate-400">
                  {t("imageFormats")}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Image previews */}
      {images.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((image, index) => (
            <Card key={index} className="group relative overflow-hidden rounded-xl border-0 shadow-sm">
              <div className="relative aspect-square w-full overflow-hidden bg-slate-100">
                <img
                  src={image.url}
                  alt={image.name || `Image ${index + 1}`}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-md transition-all hover:bg-red-500 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {image.name && (
                <div className="p-2">
                  <p className="truncate text-xs text-slate-500">{image.name}</p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Add more button */}
      {images.length > 0 && images.length < maxImages && !uploading && (
        <div className="text-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl"
            onClick={() => fileInputRef.current?.click()}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t("addAnotherImage")}
          </Button>
        </div>
      )}
    </div>
  );
}
