// content 문구 DB 공용 유틸 — build.mjs(빌드 타임 번들링)와 validate-content.mjs(CI 검증)가 공유한다.
// YAML 파서는 이 스키마에서 쓰는 부분집합만 지원한다 (맵·리스트·스칼라, 주석). 외부 의존성 없음.

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export function parseScalar(s) {
  s = s.trim();
  if (s === '') return null;
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  if (s === 'true' || s === 'false') return s === 'true';
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) return s.slice(1, -1);
  return s;
}

export function parseYaml(text) {
  const rawLines = text.split(/\r?\n/);
  const lines = [];
  for (const raw of rawLines) {
    const t = raw.replace(/\t/g, '  ');
    const trimmed = t.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;
    lines.push({ indent: t.indexOf(trimmed), text: trimmed });
  }
  let i = 0;
  function parseBlock(indent) {
    const obj = {};
    while (i < lines.length) {
      const { indent: li, text } = lines[i];
      if (li < indent) break;
      if (text.startsWith('- ')) {
        throw new Error(`지원하지 않는 YAML 형식(블록 최상위 리스트): ${text}`);
      }
      const kv = text.match(/^([^:]+):\s*(.*)$/);
      if (!kv) throw new Error(`지원하지 않는 YAML 형식(키:값 아님): ${text}`);
      const key = kv[1].trim();
      const valueText = kv[2].trim();
      i += 1;
      if (valueText === '') {
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

export function listYamlFiles(dir) {
  const out = [];
  let names;
  try {
    names = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const name of names) {
    const p = join(dir, name.name);
    if (name.isDirectory()) out.push(...listYamlFiles(p));
    else if (name.name.endsWith('.yaml') || name.name.endsWith('.yml')) out.push(p);
  }
  return out;
}

/** 하나의 엔트리 파일을 파싱하고 스키마·경로 규약을 검사한다. 문제가 있으면 errors에 누적 */
export function collectEntry(file, entriesDir) {
  const rel = file.slice(entriesDir.length + 1).replace(/\\/g, '/');
  const keyFromPath = rel.replace(/\.(yaml|yml)$/, '');
  const doc = parseYaml(readFileSync(file, 'utf8'));
  const errors = [];
  if (doc.id !== keyFromPath) errors.push(`id(${doc.id})가 경로(${keyFromPath})와 불일치`);
  if (!['draft', 'linted', 'reviewed', 'published'].includes(doc.status)) {
    errors.push(`status(${doc.status})는 draft|linted|reviewed|published 중 하나`);
  }
  if (!['counselor', 'learner', 'public'].includes(doc.audience)) {
    errors.push(`audience(${doc.audience})는 counselor|learner|public 중 하나`);
  }
  if (!doc.body || typeof doc.body.short !== 'string' || doc.body.short.length < 5) {
    errors.push('body.short 누락 또는 너무 짧음');
  }
  const FORBIDDEN = ['반드시', '보장', '확실', '100%'];
  for (const field of ['short', 'medium', 'long']) {
    const text = doc.body?.[field];
    if (typeof text !== 'string') continue;
    for (const word of FORBIDDEN) {
      if (text.includes(word)) errors.push(`body.${field}: 금칙어 "${word}" — 단정적 표현 금지`);
    }
  }
  return { keyFromPath, doc, errors };
}
