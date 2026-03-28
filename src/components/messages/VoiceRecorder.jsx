"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function VoiceRecorder({ onAudioReady, onError, disabled = false, clearAudio }) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState("");
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const recordingTimeRef = useRef(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Clear audio when clearAudio prop changes
  useEffect(() => {
    if (clearAudio) {
      deleteRecording();
    }
  }, [clearAudio]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);
        
        // Notify parent component that audio is ready
        if (onAudioReady) {
          onAudioReady({ blob: audioBlob, duration: recordingTimeRef.current });
        }
        
        // Arrêter tous les tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimeRef.current = 0;

      // Démarrer le timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const nextValue = prev + 1;
          recordingTimeRef.current = nextValue;
          return nextValue;
        });
      }, 1000);

    } catch (error) {
      console.error("Error accessing microphone:", error);
      onError?.();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Arrêter le timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const deleteRecording = () => {
    setAudioURL("");
    setRecordingTime(0);
    recordingTimeRef.current = 0;
    
    // Notify parent component that audio is deleted
    if (onAudioReady) {
      onAudioReady(null);
    }
    
    if (audioURL) {
      URL.revokeObjectURL(audioURL);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (audioURL) {
    return (
      <div className="flex items-center gap-2 p-2 bg-slate-100 rounded-lg">
        <audio 
          src={audioURL} 
          controls 
          className="flex-1 h-10"
        />
        <Button
          size="sm"
          variant="outline"
          onClick={deleteRecording}
          className="rounded-xl"
          title="Supprimer l'enregistrement"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Button
      onMouseDown={startRecording}
      onMouseUp={stopRecording}
      onTouchStart={startRecording}
      onTouchEnd={stopRecording}
      disabled={disabled}
      className={`rounded-xl transition-all ${
        isRecording 
          ? "bg-red-500 hover:bg-red-600 animate-pulse" 
          : "bg-slate-200 hover:bg-slate-300"
      }`}
    >
      {isRecording ? (
        <div className="flex items-center gap-2">
          <MicOff className="h-4 w-4" />
          <span className="text-xs">{formatTime(recordingTime)}</span>
        </div>
      ) : (
        <Mic className="h-4 w-4" />
      )}
    </Button>
  );
}
