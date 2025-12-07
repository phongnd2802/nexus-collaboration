"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mic, MicOff, Video, VideoOff, User } from "lucide-react";

interface CustomPreJoinProps {
  defaults?: {
    username?: string;
    videoEnabled?: boolean;
    audioEnabled?: boolean;
  };
  onSubmit: (values: {
    username: string;
    videoEnabled: boolean;
    audioEnabled: boolean;
    videoDeviceId: string;
    audioDeviceId: string;
    e2ee?: boolean;
    sharedPassphrase?: string;
  }) => void;
  onError?: (error: Error) => void;
}

interface MediaDevice {
  deviceId: string;
  label: string;
}

export function CustomPreJoin({
  defaults,
  onSubmit,
  onError,
}: CustomPreJoinProps) {
  const [username, setUsername] = useState(defaults?.username || "");
  const [videoEnabled, setVideoEnabled] = useState(
    defaults?.videoEnabled ?? true
  );
  const [audioEnabled, setAudioEnabled] = useState(
    defaults?.audioEnabled ?? true
  );
  const [videoDevices, setVideoDevices] = useState<MediaDevice[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDevice[]>([]);
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>("");
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>("");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Get available devices
  useEffect(() => {
    async function getDevices() {
      try {
        // Request permissions first
        const tempStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        tempStream.getTracks().forEach((track) => track.stop());

        const devices = await navigator.mediaDevices.enumerateDevices();
        const videos = devices
          .filter((d) => d.kind === "videoinput")
          .map((d) => ({ deviceId: d.deviceId, label: d.label || "Camera" }));
        const audios = devices
          .filter((d) => d.kind === "audioinput")
          .map((d) => ({
            deviceId: d.deviceId,
            label: d.label || "Microphone",
          }));

        setVideoDevices(videos);
        setAudioDevices(audios);

        if (videos.length > 0) setSelectedVideoDevice(videos[0].deviceId);
        if (audios.length > 0) setSelectedAudioDevice(audios[0].deviceId);
      } catch (error) {
        onError?.(error as Error);
      }
    }
    getDevices();
  }, [onError]);

  // Start video preview
  useEffect(() => {
    async function startPreview() {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      if (!videoEnabled && !audioEnabled) {
        setStream(null);
        return;
      }

      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: videoEnabled
            ? { deviceId: selectedVideoDevice || undefined }
            : false,
          audio: audioEnabled
            ? { deviceId: selectedAudioDevice || undefined }
            : false,
        });
        setStream(newStream);
      } catch (error) {
        console.error("Failed to get media stream:", error);
      }
    }
    startPreview();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [videoEnabled, audioEnabled, selectedVideoDevice, selectedAudioDevice]);

  // Attach stream to video element
  useEffect(() => {
    if (videoRef.current && stream && videoEnabled) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, videoEnabled]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!username.trim()) return;

      // Stop preview stream before joining
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      onSubmit({
        username: username.trim(),
        videoEnabled,
        audioEnabled,
        videoDeviceId: selectedVideoDevice || "",
        audioDeviceId: selectedAudioDevice || "",
      });
    },
    [
      username,
      videoEnabled,
      audioEnabled,
      selectedVideoDevice,
      selectedAudioDevice,
      stream,
      onSubmit,
    ]
  );

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Video Preview */}
      <div className="relative w-full aspect-video bg-black rounded-base border-2 border-border overflow-hidden">
        {videoEnabled && stream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover scale-x-[-1]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-neutral-900">
            <div className="flex flex-col items-center gap-2">
              <User className="w-36 h-36 text-neutral-500" />
            </div>
          </div>
        )}
      </div>

      {/* Device Controls */}
      <div className="flex flex-row gap-3">
        {/* Microphone */}
        <div className="flex-1 flex gap-2">
          <Button
            type="button"
            variant={audioEnabled ? "default" : "neutral"}
            size="icon"
            onClick={() => setAudioEnabled(!audioEnabled)}
            className="shrink-0"
          >
            {audioEnabled ? (
              <Mic className="w-4 h-4" />
            ) : (
              <MicOff className="w-4 h-4" />
            )}
          </Button>
          <Select
            value={selectedAudioDevice}
            onValueChange={setSelectedAudioDevice}
          >
            <SelectTrigger className="flex-1 min-w-0">
              <SelectValue placeholder="Microphone" />
            </SelectTrigger>
            <SelectContent>
              {audioDevices.map((device) => (
                <SelectItem key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Camera */}
        <div className="flex-1 flex gap-2">
          <Button
            type="button"
            variant={videoEnabled ? "default" : "neutral"}
            size="icon"
            onClick={() => setVideoEnabled(!videoEnabled)}
            className="shrink-0"
          >
            {videoEnabled ? (
              <Video className="w-4 h-4" />
            ) : (
              <VideoOff className="w-4 h-4" />
            )}
          </Button>
          <Select
            value={selectedVideoDevice}
            onValueChange={setSelectedVideoDevice}
          >
            <SelectTrigger className="flex-1 min-w-0">
              <SelectValue placeholder="Camera" />
            </SelectTrigger>
            <SelectContent>
              {videoDevices.map((device) => (
                <SelectItem key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Username Input */}
      <Input
        type="text"
        placeholder="Enter your name"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        required
      />

      {/* Join Button */}
      <Button type="submit" disabled={!username.trim()} className="w-full">
        Join Room
      </Button>
    </form>
  );
}
