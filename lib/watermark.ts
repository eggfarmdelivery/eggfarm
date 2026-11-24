// 배송완료 사진에 시각 워터마크를 그려 넣는 유틸(클라이언트 전용)
// - 지금 촬영한 사진: 현재 시각
// - 앨범에서 고른 사진: 사진 파일의 촬영 시각(EXIF) → 없으면 파일 수정 시각 → 없으면 현재 시각

export type WatermarkOptions = {
  /** 앨범에서 고른 사진이면 true → 파일의 촬영 시각을 사용 */
  fromAlbum?: boolean;
  /** 사진 가운데에 그려 넣을 배송정보(앨범 사진용. 카메라 촬영본은 촬영 화면에서 이미 그려짐) */
  centerLines?: string[];
};

// 앨범 사진이 너무 크면(예: 4000px) 업로드가 느려지므로 긴 변 기준으로 줄임
const MAX_ALBUM_SIDE = 2400;

export async function addTimestampWatermark(
  file: File,
  options: WatermarkOptions = {}
): Promise<File> {
  const { fromAlbum = false, centerLines } = options;

  const takenAt = fromAlbum ? await getPhotoTakenAt(file) : new Date();

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

  let width = img.naturalWidth || img.width;
  let height = img.naturalHeight || img.height;
  if (fromAlbum) {
    const scale = Math.min(1, MAX_ALBUM_SIDE / Math.max(width, height));
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;

  ctx.drawImage(img, 0, 0, width, height);

  if (centerLines && centerLines.length > 0) {
    drawCenterLines(ctx, width, height, centerLines);
  }

  const timeText = takenAt.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const text = fromAlbum ? `${timeText} (앨범)` : timeText;

  const fontSize = Math.max(16, Math.round(width * 0.035));
  ctx.font = `${fontSize}px sans-serif`;
  ctx.textAlign = "left";
  const padding = Math.round(fontSize * 0.6);
  const textWidth = ctx.measureText(text).width;

  const boxX = width - textWidth - padding * 2 - 12;
  const boxY = height - fontSize - padding * 2 - 12;
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

  const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg" });
}

// 카메라 촬영 화면(CameraCaptureModal)과 같은 모양으로 가운데에 배송정보를 그림
function drawCenterLines(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  lines: string[]
) {
  let size = Math.max(18, Math.round(width * 0.05));
  ctx.font = `bold ${size}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const maxAllowed = width * 0.88;
  let maxLineWidth = Math.max(...lines.map((l) => ctx.measureText(l).width));
  while (maxLineWidth > maxAllowed && size > 10) {
    size -= 1;
    ctx.font = `bold ${size}px sans-serif`;
    maxLineWidth = Math.max(...lines.map((l) => ctx.measureText(l).width));
  }

  const lineHeight = Math.round(size * 1.4);
  const padding = Math.round(size * 0.6);
  const boxWidth = maxLineWidth + padding * 2;
  const boxHeight = lineHeight * lines.length + padding * 2;
  const boxX = (width - boxWidth) / 2;
  const boxY = (height - boxHeight) / 2;

  ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
  ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

  ctx.fillStyle = "#ffffff";
  lines.forEach((line, i) => {
    const y = boxY + padding + lineHeight * i + lineHeight / 2;
    ctx.fillText(line, width / 2, y);
  });

  ctx.textAlign = "left";
}

// 사진 파일의 촬영 시각: EXIF(DateTimeOriginal) → 파일 수정 시각 → 현재 시각
async function getPhotoTakenAt(file: File): Promise<Date> {
  try {
    const exifDate = await readExifDate(file);
    if (exifDate) return exifDate;
  } catch {
    // EXIF를 못 읽어도 아래 대체값 사용
  }
  if (file.lastModified) return new Date(file.lastModified);
  return new Date();
}

// JPEG의 EXIF에서 DateTimeOriginal(없으면 DateTime)을 읽음. 형식: "2026:11:24 14:30:05"
async function readExifDate(file: File): Promise<Date | null> {
  // EXIF는 파일 앞부분에 있으므로 앞 256KB만 읽음
  const buf = await file.slice(0, 256 * 1024).arrayBuffer();
  const view = new DataView(buf);
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return null; // JPEG 아님

  let offset = 2;
  while (offset + 4 <= view.byteLength) {
    if (view.getUint8(offset) !== 0xff) return null;
    const marker = view.getUint8(offset + 1);
    const segLen = view.getUint16(offset + 2);
    if (marker === 0xe1) {
      // APP1 - "Exif\0\0" 확인
      const start = offset + 4;
      if (start + 6 <= view.byteLength && view.getUint32(start) === 0x45786966) {
        return parseTiffDate(view, start + 6);
      }
    }
    if (marker === 0xda) return null; // 이미지 데이터 시작 → EXIF 없음
    offset += 2 + segLen;
  }
  return null;
}

function parseTiffDate(view: DataView, tiff: number): Date | null {
  if (tiff + 8 > view.byteLength) return null;
  const little = view.getUint16(tiff) === 0x4949;
  const u16 = (o: number) => view.getUint16(o, little);
  const u32 = (o: number) => view.getUint32(o, little);

  const readAscii = (entry: number): string | null => {
    const count = u32(entry + 4);
    const valOffset = count > 4 ? tiff + u32(entry + 8) : entry + 8;
    if (valOffset + count > view.byteLength) return null;
    let s = "";
    for (let i = 0; i < count; i++) {
      const c = view.getUint8(valOffset + i);
      if (c === 0) break;
      s += String.fromCharCode(c);
    }
    return s;
  };

  // IFD를 훑어서 원하는 태그 찾기
  const findTag = (ifd: number, tag: number): number | null => {
    if (ifd + 2 > view.byteLength) return null;
    const n = u16(ifd);
    for (let i = 0; i < n; i++) {
      const entry = ifd + 2 + i * 12;
      if (entry + 12 > view.byteLength) return null;
      if (u16(entry) === tag) return entry;
    }
    return null;
  };

  const ifd0 = tiff + u32(tiff + 4);
  let dateStr: string | null = null;

  const exifPtr = findTag(ifd0, 0x8769); // Exif 하위 IFD
  if (exifPtr !== null) {
    const exifIfd = tiff + u32(exifPtr + 8);
    const original = findTag(exifIfd, 0x9003); // DateTimeOriginal
    if (original !== null) dateStr = readAscii(original);
  }
  if (!dateStr) {
    const dt = findTag(ifd0, 0x0132); // DateTime
    if (dt !== null) dateStr = readAscii(dt);
  }
  if (!dateStr) return null;

  const m = dateStr.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
  if (!m) return null;
  // EXIF 시각은 시간대 정보가 없는 "찍은 폰의 현지 시각" → 현지 시각으로 해석
  const d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
  return isNaN(d.getTime()) ? null : d;
}
