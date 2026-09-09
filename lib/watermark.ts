// 배송완료 사진에 촬영(업로드) 시각 워터마크를 그려 넣는 유틸(클라이언트 전용)
export async function addTimestampWatermark(file: File): Promise<File> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = dataUrl;
  });

  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;

  ctx.drawImage(img, 0, 0);

  const text = new Date().toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const fontSize = Math.max(16, Math.round(img.width * 0.035));
  ctx.font = `${fontSize}px sans-serif`;
  const padding = Math.round(fontSize * 0.6);
  const textWidth = ctx.measureText(text).width;

  const boxX = img.width - textWidth - padding * 2 - 12;
  const boxY = img.height - fontSize - padding * 2 - 12;
  const boxWidth = textWidth + padding * 2;
  const boxHeight = fontSize + padding * 2;

  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "middle";
  ctx.fillText(text, boxX + padding, boxY + boxHeight / 2);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.9)
  );
  if (!blob) return file;

  return new File([blob], file.name, { type: "image/jpeg" });
}
