import crypto from "crypto";

// 환경변수 ENTRANCE_ENC_KEY(32바이트, base64) 필요 — 없으면 암호화 없이 원문 저장(개발 초기 임시)
const KEY = process.env.ENTRANCE_ENC_KEY
  ? Buffer.from(process.env.ENTRANCE_ENC_KEY, "base64")
  : null;

export function encryptSensitive(plain: string): string {
  if (!plain) return plain;
  if (!KEY) return plain; // TODO: 운영 배포 전 ENTRANCE_ENC_KEY 반드시 설정
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptSensitive(value: string | null): string {
  if (!value) return "";
  if (!value.startsWith("enc:") || !KEY) return value; // 평문 데이터와의 호환
  const [, ivB64, tagB64, dataB64] = value.split(":");
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const data = Buffer.from(dataB64, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
