// 한국어 조사 선택 — 앞말의 마지막 "읽히는" 글자의 받침으로 고른다.
// 천간·지지·오행 한자는 독음(甲→갑, 午→오, 水→수)으로, 숫자는 한자어 독음(3→삼)으로 읽는다.
// 끝에 붙은 괄호 설명은 읽지 않는다: '수(관성 축)' → '수', '갑오(甲午)' → '갑오'.

export type JosaPair = '이가' | '을를' | '은는' | '으로' | '와과';

const HANJA_READING: Record<string, string> = {
  甲: '갑', 乙: '을', 丙: '병', 丁: '정', 戊: '무', 己: '기', 庚: '경', 辛: '신', 壬: '임', 癸: '계',
  子: '자', 丑: '축', 寅: '인', 卯: '묘', 辰: '진', 巳: '사', 午: '오', 未: '미', 申: '신', 酉: '유', 戌: '술', 亥: '해',
  木: '목', 火: '화', 土: '토', 金: '금', 水: '수',
};

const DIGIT_READING = ['영', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];

/** 조사 판정에 쓰는 마지막 글자 — 끝 괄호 설명을 걷어내고 한자·숫자는 독음으로 바꾼다 */
function lastReadableChar(word: string): string {
  let w = word.trim();
  // 끝의 '(…)'를 반복해서 걷어낸다 (중첩 없는 괄호 기준)
  while (w.endsWith(')')) {
    const open = w.lastIndexOf('(');
    if (open <= 0) break;
    w = w.slice(0, open).trimEnd();
  }
  const last = w[w.length - 1] ?? '';
  if (HANJA_READING[last]) return HANJA_READING[last];
  if (last >= '0' && last <= '9') return DIGIT_READING[Number(last)];
  return last;
}

/** 받침 정보: 한글 음절이 아니면 받침 없음으로 본다 */
function batchimOf(word: string): { has: boolean; rieul: boolean } {
  const code = lastReadableChar(word).charCodeAt(0);
  if (!(code >= 0xac00 && code <= 0xd7a3)) return { has: false, rieul: false };
  const jong = (code - 0xac00) % 28;
  return { has: jong !== 0, rieul: jong === 8 };
}

/** 앞말에 맞는 조사 ('이가' → '이'|'가' 등). ㄹ 받침 뒤 '으로'는 '로'. */
export function josa(word: string, pair: JosaPair): string {
  const { has, rieul } = batchimOf(word);
  switch (pair) {
    case '이가':
      return has ? '이' : '가';
    case '을를':
      return has ? '을' : '를';
    case '은는':
      return has ? '은' : '는';
    case '으로':
      return has && !rieul ? '으로' : '로';
    case '와과':
      return has ? '과' : '와';
  }
}

/** 앞말 + 조사 ('수' + '이가' → '수가') */
export function withJosa(word: string, pair: JosaPair): string {
  return `${word}${josa(word, pair)}`;
}
