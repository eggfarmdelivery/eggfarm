// 닉네임 바이트 계산: 한글(및 기타 비ASCII 문자) 1자=2바이트, 영문/숫자(ASCII) 1자=1바이트
// 입금자명(닉네임+전화번호 뒷4자리)이 은행 입금자명 8자리(16바이트) 제한에 맞도록,
// 전화번호 뒷4자리(4바이트) 고정분을 제외한 닉네임 최대 12바이트로 제한
export const NICKNAME_MAX_BYTES = 12;

export function byteLength(text: string): number {
  let bytes = 0;
  for (const ch of text) {
    bytes += ch.charCodeAt(0) > 0x7f ? 2 : 1;
  }
  return bytes;
}

// 입력 중 한도를 넘는 마지막 글자만 잘라내어 반환(타이핑 자체를 막기 위함)
export function truncateToByteLimit(text: string, maxBytes: number = NICKNAME_MAX_BYTES): string {
  let result = "";
  let bytes = 0;
  for (const ch of text) {
    const chBytes = ch.charCodeAt(0) > 0x7f ? 2 : 1;
    if (bytes + chBytes > maxBytes) break;
    result += ch;
    bytes += chBytes;
  }
  return result;
}
