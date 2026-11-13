// content 문구 DB 검증기 — `node validate-content.mjs` (dist 빌드 후 실행).
// 전체 엔트리에 대해 ① 경로=조합키=레지스트리 등록 ② 스키마 필드 ③ sampleBirth 엔진 재실행 대조
// ④ 금칙어 린트를 검사한다. 하나라도 실패하면 비정상 종료 — CI 게이트.
// YAML 파서는 이 스키마에서 쓰는 부분집합만 지원한다 (맵·리스트·스칼라, 주석). 외부 의존성 없음.

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSajuResult, PATTERN_REGISTRY, isRegisteredPattern } from './dist/index.js';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const ENTRIES_DIR = join(ROOT, '..', '..', 'content', 'entries');

const STATUSES = ['draft', 'linted', 'reviewed', 'published'];
const AUDIENCES = ['counselor', 'learner', 'public'];
const FORBIDDEN = ['반드시', '보장', '확실', '100%'];

// ---------- 최소 YAML 부분집합 파서 ----------

function parseScalar(s) {
  s = s.trim();
  if (s === '') return null;
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  if (s === 'true' || s === 'false') return s === 'true';
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) return s.slice(1, -1);
  return s;
}

function parseYaml(text) {
  const rawLines = text.split(/\r?\n/);
  const lines = [];
  for (const raw of rawLines) {
    const t = raw.replace(/\t/g, '  ');
    const trimmed = t.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;
    const contentIdx = trimmed === '' ? -1 : t.indexOf(trimmed);
    lines.push({ indent: contentIdx, text: trimmed });
  }
  let i = 0;
  function parseBlock(indent) {
    const obj = {};
    while (i < lines.length) {
      const { indent: li, text } = lines[i];
      if (li < indent) break;
      const listMatch = text.match(/^- (.*)$/);
      if (listMatch) {
        throw new Error(`지원하지 않는 YAML 형식(최상위 리스트): ${text}`);
      }
      const kv = text.match(/^([^:]+):\s*(.*)$/);
      if (!kv) throw new Error(`지원하지 않는 YAML 형식(키:값 아님): ${text}`);
      const key = kv[1].trim();
      const valueText = kv[2].trim();
      i += 1;
      if (valueText === '') {
        // 중첩 맵 또는 리스트
        if (i < lines.length && lines[i].indent > li && lines[i].text.startsWith('- ')) {
          const listIndent = lines[i].indent;
          const items = [];
          while (i < lines.length && lines[i].indent === listIndent && lines[i].text.startsWith('- ')) {
            items.push(parseScalar(lines[i].text.slice(2)));
            i += 1;
          }
          obj[key] = items;
        } else if (i < lines.length && lines[i].indent > li) {
          obj[key] = parseBlock(lines[i].indent);
        } else {
          obj[key] = null;
        }
      } else if (valueText.startsWith('[') && valueText.endsWith(']')) {
        const inner = valueText.slice(1, -1).trim();
        obj[key] = inner === '' ? [] : inner.split(',').map((s) => parseScalar(s));
      } else {
        const v = parseScalar(valueText);
        if (v === null) throw new Error(`빈 값은 다음 줄 중첩으로 써야 합니다: ${key}`);
        obj[key] = v;
      }
    }
    return obj;
  }
  const result = parseBlock(0);
  if (i < lines.length) throw new Error(`파싱하지 못한 줄: ${lines[i].text}`);
  return result;
}

// ---------- 검증 ----------

function listYamlFiles(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory()) out.push(...listYamlFiles(p));
    else if (name.name.endsWith('.yaml') || name.name.endsWith('.yml')) out.push(p);
  }
  return out;
}

function deepGet(obj, path) {
  return path.split('.').reduce((acc, k) => (acc == null ? acc : acc[k]), obj);
}

const errors = [];
const files = listYamlFiles(ENTRIES_DIR);
let count = 0;

for (const file of files) {
  const rel = relative(ENTRIES_DIR, file).split(sep).join('/');
  const keyFromPath = rel.replace(/\.(yaml|yml)$/, '');
  let doc;
  try {
    doc = parseYaml(readFileSync(file, 'utf8'));
  } catch (e) {
    errors.push(`${rel}: YAML 파싱 실패 — ${e.message}`);
    continue;
  }

  // ① 경로=조합키. saju/* 키는 패턴 레지스트리 등록이 필요하고,
  //    naming/*·taekil/* 같은 비패턴 문구 키는 레지스트리 대상이 아니다.
  const isSajuKey = keyFromPath.startsWith('saju/');
  if (doc.id !== keyFromPath) errors.push(`${rel}: id(${doc.id})가 경로(${keyFromPath})와 불일치`);
  if (isSajuKey && !isRegisteredPattern(keyFromPath)) errors.push(`${rel}: 레지스트리에 없는 키 — ${keyFromPath}`);

  // ② 스키마 필드
  if (!STATUSES.includes(doc.status)) errors.push(`${rel}: status(${doc.status})는 ${STATUSES.join('|')} 중 하나`);
  if (!AUDIENCES.includes(doc.audience)) errors.push(`${rel}: audience(${doc.audience})는 ${AUDIENCES.join('|')} 중 하나`);
  if (!doc.body || typeof doc.body.short !== 'string' || doc.body.short.length < 5) {
    errors.push(`${rel}: body.short 누락 또는 너무 짧음`);
  }
  const birth = doc.sampleBirth;
  const birthOk =
    birth &&
    Number.isInteger(birth.year) &&
    Number.isInteger(birth.month) &&
    Number.isInteger(birth.day) &&
    (birth.gender === 'male' || birth.gender === 'female') &&
    (birth.isLunar === true || birth.isLunar === false);
  // sampleBirth/assert는 사주 명식 재실행 대조용 — saju/* 키에만 강제한다.
  if (isSajuKey && !birthOk) errors.push(`${rel}: sampleBirth 필수 필드(year/month/day/gender/isLunar) 불완전`);

  // ③ sampleBirth 엔진 재실행 대조 (saju/* 키만)
  if (isSajuKey && birthOk) {
    const hour = birth.hour == null ? null : birth.hour;
    const minute = birth.minute == null ? null : birth.minute;
    const result = buildSajuResult({
      isLunar: birth.isLunar,
      year: birth.year,
      month: birth.month,
      day: birth.day,
      hour,
      minute,
      gender: birth.gender,
      birthPlace: birth.birthPlace ?? null,
    });
    const actual = {
      palja: `${result.palja.yearGan}${result.palja.monthGan}${result.palja.dayGan}${result.palja.hourGan}`,
      gyeokguk: result.gyeokguk.name,
      yongsin: result.yongsin.ohaeng,
    };
    const assertMap = doc.assert ?? {};
    for (const [field, expected] of Object.entries(assertMap)) {
      if (!(field in actual)) {
        errors.push(`${rel}: assert.${field}은(는) 대조 가능한 필드가 아님 (${Object.keys(actual).join('|')})`);
      } else if (String(actual[field]) !== String(expected)) {
        errors.push(`${rel}: assert.${field} 불일치 — 문구가 주장하는 값(${expected}) vs 엔진 재실행(${actual[field]})`);
      }
    }
    if (Object.keys(assertMap).length === 0) {
      errors.push(`${rel}: assert가 비어 있음 — 최소 1개 필드(palja/gyeokguk/yongsin) 대조 필요`);
    }
  }

  // ④ 금칙어 린트
  const bodies = ['body.short', 'body.medium', 'body.long'].map((p) => deepGet(doc, p)).filter((s) => typeof s === 'string');
  for (const text of bodies) {
    for (const word of FORBIDDEN) {
      if (text.includes(word)) errors.push(`${rel}: 금칙어 "${word}" 발견 — 단정적 표현은 문구에서 금지`);
    }
  }

  count += 1;
}

if (files.length === 0) {
  errors.push('content/entries 아래에 엔트리가 없다 — 파이프라인이 비어 있음');
}

// 레지스트리 전 키 커버리지 표시(실패는 아님 — 채워가는 진행 지표). saju/* 키만 커버리지 대상.
const covered = new Set(files.map((f) => relative(ENTRIES_DIR, f).split(sep).join('/').replace(/\.(yaml|yml)$/, '')));
const total = Object.keys(PATTERN_REGISTRY).length;
const missing = Object.keys(PATTERN_REGISTRY).filter((k) => !covered.has(k)).length;

if (errors.length > 0) {
  console.error(`content:validate 실패 — ${errors.length}건`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}

console.log(`content:validate OK — 엔트리 ${count}건 통과 (레지스트리 ${total}키 중 미작성 ${missing}키)`);
