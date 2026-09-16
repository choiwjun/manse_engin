// myeong-platform 패키지 빌드
// 1) 루트 src/platform → src/platform 복사 (단일 소스 유지)
// 2) esbuild로 ESM/CJS 단일 번들 생성
// 3) tsc로 per-module .d.ts 생성
// 플랫폼 소스는 상대경로 import만 사용해 별칭 재작성 단계가 없다.
import { execFileSync } from 'node:child_process';
import { cpSync, rmSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..', '..');
const pkgSrc = path.join(__dirname, 'src');
const pkgPlatformSrc = path.join(pkgSrc, 'platform');
const distDir = path.join(__dirname, 'dist');

// devDependencies는 이 패키지를 우선 해결하고, 설치 전이면 myeong-engine의 것을 재사용한다.
const REQUIRE_BASES = [
  path.join(__dirname, 'package.json'),
  path.join(rootDir, 'packages', 'myeong-engine', 'package.json'),
];

function importDep(name) {
  for (const base of REQUIRE_BASES) {
    try {
      return createRequire(base)(name);
    } catch {
      // 다음 후보로
    }
  }
  throw new Error(`의존성을 찾을 수 없습니다: ${name} — npm ci를 먼저 실행하세요.`);
}

function resolveDep(name) {
  for (const base of REQUIRE_BASES) {
    try {
      return createRequire(base).resolve(name);
    } catch {
      // 다음 후보로
    }
  }
  throw new Error(`의존성을 찾을 수 없습니다: ${name} — npm ci를 먼저 실행하세요.`);
}

// ---------- 1. 소스 복사 ----------
rmSync(pkgPlatformSrc, { recursive: true, force: true });
rmSync(distDir, { recursive: true, force: true });
cpSync(path.join(rootDir, 'src', 'platform'), pkgPlatformSrc, { recursive: true });
console.log('copied src/platform → packages/myeong-platform/src/platform');

// ---------- 2. esbuild 번들 (ESM + CJS) ----------
const { build } = importDep('esbuild');
const common = {
  entryPoints: [path.join(pkgSrc, 'index.ts')],
  bundle: true,
  platform: 'neutral',
  target: 'es2020',
  sourcemap: false,
  logLevel: 'warning',
};
await build({ ...common, format: 'esm', outfile: path.join(distDir, 'index.js') });
await build({ ...common, format: 'cjs', outfile: path.join(distDir, 'index.cjs') });
console.log('bundled dist/index.js (esm) + dist/index.cjs (cjs)');

// ---------- 3. 타입 선언 생성 ----------
const tscBin = path.join(path.dirname(resolveDep('typescript/package.json')), 'bin', 'tsc');
execFileSync(process.execPath, [tscBin, '-p', path.join(__dirname, 'tsconfig.json')], {
  cwd: __dirname,
  stdio: 'inherit',
});
console.log('emitted dist/**/*.d.ts');
