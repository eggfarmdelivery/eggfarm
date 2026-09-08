// 개인정보 마스킹 유틸 (쿠팡 등에서 흔히 쓰는 형태 참고)
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return phone;
  const first3 = digits.slice(0, 3);
  const last4 = digits.slice(-4);
  return `${first3}-****-${last4}`;
}
