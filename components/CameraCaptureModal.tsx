"use client";

// 웹페이지 안에서 바로 카메라를 켜서 미리보기 화면에 배송정보(동/호수, 상품)를
// 오버레이로 보여주고, 촬영 시 그 정보를 사진에도 함께 그려 넣는 컴포넌트
import { useEffect, useRef, useState } from "react";

export default function CameraCaptureModal({
  overlayLines,
  onCapture,
  onClose,
}: {
  overlayLines?: string[];
  onCapture: (file: File) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setReady(true);
      } catch {
        setError("카메라를 사용할 수 없어요. 브라우저의 카메라 권한을 확인해주세요");
      }
    })();
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function handleShutter() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    if (overlayLines && overlayLines.length > 0) {
      let size = Math.max(18, Math.round(canvas.width * 0.05));
      ctx.font = `bold ${size}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const maxAllowed = canvas.width * 0.88;
      let maxLineWidth = Math.max(...overlayLines.map((l) => ctx.measureText(l).width));
      while (maxLineWidth > maxAllowed && size > 10) {
        size -= 1;
        ctx.font = `bold ${size}px sans-serif`;
        maxLineWidth = Math.max(...overlayLines.map((l) => ctx.measureText(l).width));
      }

      const lineHeight = Math.round(size * 1.4);
      const padding = Math.round(size * 0.6);
      const boxWidth = maxLineWidth + padding * 2;
      const boxHeight = lineHeight * overlayLines.length + padding * 2;
      const boxX = (canvas.width - boxWidth) / 2;
      const boxY = (canvas.height - boxHeight) / 2;

      ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
      ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

      ctx.fillStyle = "#ffffff";
      overlayLines.forEach((line, i) => {
        const y = boxY + padding + lineHeight * i + lineHeight / 2;
        ctx.fillText(line, canvas.width / 2, y);
      });

      ctx.textAlign = "left";
    }

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `delivery-${Date.now()}.jpg`, { type: "image/jpeg" });
        onCapture(file);
      },
      "image/jpeg",
      0.9
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black">
      <div className="relative flex-1 overflow-hidden">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />

        {ready && overlayLines && overlayLines.length > 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="rounded-lg bg-black/45 px-4 py-3 text-center">
              {overlayLines.map((line, i) => (
                <p key={i} className="text-base font-bold text-white">
                  {line}
                </p>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 px-6 text-center text-sm text-white">
            {error}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between bg-black px-6 py-5">
        <button type="button" onClick={onClose} className="text-sm text-white">
          취소
        </button>
        <button
          type="button"
          disabled={!ready}
          onClick={handleShutter}
          className="h-16 w-16 rounded-full border-4 border-white bg-white/20 disabled:opacity-40"
          aria-label="촬영"
        />
        <div className="w-8" />
      </div>
    </div>
  );
}
