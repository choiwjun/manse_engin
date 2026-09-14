// 3층 콘텐츠 DB 접근 — content/entries의 YAML이 빌드 타임에 JSON으로 번들된다.
// (build.mjs §2.5가 생성하며, 루트 소스에는 빈 {} 플레이스홀더가 커밋된다.
//  런타임 파일시스템은 전혀 쓰지 않는다 — 엔진의 순수성 유지.)
// 우선순위: DB body.short(한 줄) > 레지스트리 conclusion > defaultText.

import CONTENT_DB_RAW from './content-db.generated.json';

export interface ContentBody {
  short?: string;
  medium?: string;
  long?: string;
}

export interface ContentEntry {
  id?: string;
  title?: string;
  audience?: string;
  status?: string;
  body?: ContentBody;
  tags?: string[];
}

export type ContentDb = Record<string, ContentEntry>;

const CONTENT_DB = CONTENT_DB_RAW as unknown as ContentDb;

/** 키의 콘텐츠 엔트리. 없으면 null — 조립기는 레지스트리 fallback을 쓴다 */
export function getContentEntry(key: string): ContentEntry | null {
  const entry = CONTENT_DB[key];
  return entry && typeof entry === 'object' ? entry : null;
}

/** 현재 번들된 DB의 엔트리 수 (진행 지표용) */
export function contentEntryCount(): number {
  return Object.keys(CONTENT_DB).length;
}

/** 문구 결정: DB body.short가 유효하면 그것, 아니면 fallback(레지스트리 conclusion) */
export function conclusionFor(key: string, fallback: string): string {
  const short = getContentEntry(key)?.body?.short;
  return typeof short === 'string' && short.trim().length >= 5 ? short.trim() : fallback;
}
