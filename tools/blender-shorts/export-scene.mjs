#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) out[key] = true;
    else {
      out[key] = next;
      i += 1;
    }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const outFile = path.resolve(args.out ?? path.join(__dirname, 'example', 'first-money.json'));
const enginePath = path.resolve(__dirname, '../../packages/myeong-engine/dist/index.js');

if (!fs.existsSync(enginePath)) {
  console.error('myeong-engine dist가 없습니다. 먼저 npm --prefix packages/myeong-engine run build 를 실행하세요.');
  process.exit(1);
}

const engine = await import(pathToFileURL(enginePath).href);
const { buildSajuResult, assembleReport, runDetectors } = engine;

const birth = {
  isLunar: false,
  year: Number(args.year ?? 1985),
  month: Number(args.month ?? 1),
  day: Number(args.day ?? 10),
  hour: Number(args.hour ?? 16),
  minute: Number(args.minute ?? 45),
  gender: args.gender === 'female' ? 'female' : 'male',
  birthPlace: null,
};

const now = new Date(args.now ?? '2026-09-18T20:00:00+09:00');
const result = buildSajuResult(birth, { now });
const report = assembleReport(result, { gender: birth.gender, now });
const patterns = runDetectors(result);

const moneyFlow = patterns.find((p) => p.key === 'saju/flow/sangsaeng-saengjae');
if (!moneyFlow) {
  throw new Error('first-money 프리셋은 식상생재 패턴이 감지되는 명식이 필요합니다.');
}

const pillars = [
  `${result.palja.yearGan}${result.palja.yearJi}`,
  `${result.palja.monthGan}${result.palja.monthJi}`,
  `${result.palja.dayGan}${result.palja.dayJi}`,
  result.palja.hourGan && result.palja.hourJi
    ? `${result.palja.hourGan}${result.palja.hourJi}`
    : '時刻未詳',
];

const wealthPercent = report.meter.groupPercents.jaesung;
const selfPower = report.meter.dayMaster.score;

const payload = {
  schemaVersion: 1,
  meta: {
    preset: 'first-money',
    title: '사주에 돈이 많다고 돈복이 좋은 건 아닙니다',
    source: 'myeong-manseryeok-engine',
    engineAsOf: result.asOf,
    fictionalCase: true,
  },
  format: { width: 1080, height: 1920, fps: 30, durationSec: 42 },
  birth: {
    year: birth.year,
    month: birth.month,
    day: birth.day,
    hour: birth.hour,
    minute: birth.minute,
    gender: birth.gender,
  },
  facts: {
    pillars,
    paljaLabel: report.paljaLabel,
    wealthPercent,
    dayMasterScore: selfPower,
    dayMasterVerdict: report.meter.dayMaster.verdictLabel,
    primaryPattern: {
      key: moneyFlow.key,
      title: moneyFlow.title,
      strength: moneyFlow.strength,
      evidence: moneyFlow.evidence,
    },
    supportPatterns: patterns
      .filter((p) => ['saju/flow/gwanin-sangsaeng', 'saju/flow/jaesaeng-gwan'].includes(p.key))
      .map((p) => ({ key: p.key, title: p.title, strength: p.strength, evidence: p.evidence })),
  },
  scenes: [
    {
      id: 'hook', start: 0, end: 2.6, kind: 'hook',
      heading: '사주에 돈이 많다고', emphasis: '돈복이 좋은 건 아닙니다.',
      voice: '사주에 돈이 많다고, 돈복이 좋은 건 아닙니다.',
    },
    {
      id: 'palja', start: 2.6, end: 7.0, kind: 'palja',
      heading: '이 사주 한번 볼게요.', subheading: '실제 인물이 아닌 가상 명식',
      voice: '이 사주 한번 볼게요. 실제 사람이 아닌 가상 사례입니다.',
    },
    {
      id: 'wealth', start: 7.0, end: 13.5, kind: 'metric', metric: 'wealth',
      heading: '돈을 뜻하는 기운이 가장 강합니다.', value: wealthPercent,
      voice: `이 사람은 사주에서 돈을 뜻하는 기운이 ${wealthPercent}퍼센트로 가장 강하게 잡힙니다.`,
    },
    {
      id: 'flow', start: 13.5, end: 21.0, kind: 'flow',
      heading: '식상생재', subheading: '내 기술·능력 → 돈',
      voice: '그리고 자기 기술이나 능력이 돈으로 이어지는 식상생재 구조도 강합니다. 쉽게 말하면, 내가 잘하는 걸 돈으로 만드는 힘입니다.',
    },
    {
      id: 'turn', start: 21.0, end: 28.0, kind: 'reversal',
      heading: '그런데 문제가 하나 있습니다.', value: selfPower,
      subheading: `일간 힘 ${selfPower}% · ${report.meter.dayMaster.verdictLabel}`,
      voice: `그런데 문제가 하나 있습니다. 돈의 흐름은 강한데, 정작 그걸 감당하는 나 자신의 힘은 ${selfPower}퍼센트로 약하게 나옵니다.`,
    },
    {
      id: 'meaning', start: 28.0, end: 35.0, kind: 'meaning',
      heading: '돈을 못 버는 사주가 아닙니다.',
      subheading: '기회가 커질수록 감당할 기반도 중요합니다.',
      voice: '그래서 돈을 못 버는 사주가 아닙니다. 오히려 벌 기회는 있는데, 일이 커지고 돈이 커질수록 혼자 감당하면 부담도 함께 커지는 구조입니다.',
    },
    {
      id: 'conclusion', start: 35.0, end: 42.0, kind: 'conclusion',
      heading: '돈을 버는 능력보다', emphasis: '그 돈을 감당할 기반이 먼저인 사람',
      voice: '이 사주의 핵심은 딱 하나입니다. 돈을 버는 능력보다, 그 돈을 감당할 기반을 먼저 키워야 하는 사람입니다.',
    },
  ],
};

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(`Blender scene JSON 생성: ${outFile}`);
