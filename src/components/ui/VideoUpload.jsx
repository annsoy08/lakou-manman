"use client";

import { useRef, useState } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFirebaseStorage } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Video, Plus, X, AlertCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function VideoUpload({ videos = [], onChange, maxVideos = 1, pathPrefix = "posts/videos" }) {
  const { t } = useLanguage();
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef(null);

  async function uploadFiles(files) {
    if (videos.length + files.length > maxVideos) {
      setUploadError(t("maxVideosAlert", { maxVideos }));
      return;
    }

    const storage = getFirebaseStorage();
    if (!storage) {
      setUploadError(t("videoUploadError"));
      return;
    }

    setUploading(true);
    setUploadError("");
    const newVideos = [];

    for (const file of files) {
      if (!file.type.startsWith("video/")) {
        setUploadError(t("videoTypeAlert"));
        continue;
      }

      if (file.size > 25 * 1024 * 1024) {
        setUploadError(t("videoSizeAlert"));
        continue;
      }

      try {
        const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`;
        const storageRef = ref(storage, `${pathPrefix}/${filename}`);

        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);

        newVideos.push({
          url: downloadURL,
          name: file.name,
          size: file.size,
          type: file.type,
        });
      } catch (error) {
        console.error("Error uploading video:", error);
        setUploadError(t("videoUploadError"));
      }
    }

    onChange([...videos, ...newVideos]);
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

  function removeVideo(index) {
    onChange(videos.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-4">
      {uploadError && (
        <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{uploadError}</p>
        </div>
      )}

      {videos.length < maxVideos && (
        <Card
          className={`border-2 border-dashed transition-colors ${
            dragActive ? "border-[#9B2335] bg-rose-50" : "border-slate-300 hover:border-slate-400"
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
              accept="video/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            {uploading ? (
              <div className="py-4">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#9B2335] border-t-transparent"></div>
                <p className="mt-2 text-sm text-slate-500">{t("uploadingVideos")}</p>
              </div>
            ) : (
              <div className="py-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                  <Upload className="h-6 w-6 text-slate-400" />
                </div>
                <p className="mt-3 text-sm font-medium text-slate-700">{t("dragDropVideos")}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 rounded-xl"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Video className="mr-2 h-4 w-4" />
                  {t("chooseFiles")}
                </Button>
                <p className="mt-2 text-xs text-slate-400">{t("videoFormats", { maxVideos })}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {videos.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
          {videos.map((video, index) => (
            <Card key={index} className="group relative overflow-hidden rounded-xl border-0 shadow-sm">
              <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
                <video src={video.url} controls playsInline preload="metadata" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeVideo(index)}
                  className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-md transition-all hover:bg-red-500 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {video.name && (
                <div className="p-2">
                  <p className="truncate text-xs text-slate-500">{video.name}</p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {videos.length > 0 && videos.length < maxVideos && !uploading && (
        <div className="text-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl"
            onClick={() => fileInputRef.current?.click()}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t("addAnotherVideo")}
          </Button>
        </div>
      )}
    </div>
  );
}
