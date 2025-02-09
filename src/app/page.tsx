"use client";

import { client } from "@/lib/client";
import { useEffect, useState, useRef } from "react";
import { useWebSocket } from "jstack/client";

const socket = client.chat.realTimeSession.$ws();

export default function Home() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(document.createElement("video"));
  const [screenshot, setScreenshot] = useState<string | null>(null);
  useWebSocket(socket, {
    response: (response) => {
      console.log(response);
    },
  });

  useEffect(() => {
    console.log(socket);
  }, []);

  const captureScreenshot = () => {
    if (videoRef.current) {
      console.log("capturing screenshot");
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const screenshot = canvas.toDataURL("image/jpeg", 0.5);
        setScreenshot(screenshot);
        socket.emit("image", {
          base64: screenshot,
        });
      }
    }
  };

  const startScreenShare = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      mediaStream.addEventListener("inactive", () => {
        console.log("stream inactive");
        setStream(null);
      });
      setStream(mediaStream);
      console.log(mediaStream);

      videoRef.current.srcObject = mediaStream;
    } catch (error) {
      console.error("Error accessing screen:", error);
    }
  };

  useEffect(() => {
    if (!stream) return;
    const intervalId = setInterval(captureScreenshot, 10000);
    return () => clearInterval(intervalId);
  }, [stream]);

  // Cleanup function to stop all tracks when component unmounts
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 gap-4">
      <button
        onClick={startScreenShare}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Start Screen Sharing
      </button>

      {videoRef.current && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full max-w-4xl border border-gray-300 rounded-lg"
        />
      )}

      {screenshot && (
        <img
          src={screenshot}
          alt="Screenshot"
          className="w-full max-w-4xl border border-gray-300 rounded-lg"
        />
      )}
    </main>
  );
}
