// myeong-engine 패키지 빌드
// 1) 루트 src/engine → src/engine 복사 (단일 소스 유지)
// 2) '@/engine/*' 별칭 → 상대경로 재작성
// 3) esbuild로 ESM/CJS 단일 번들 생성 (JSON 데이터 인라인)
// 4) tsc로 per-module .d.ts 생성
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..', '..');
const pkgSrc = path.join(__dirname, 'src');
const pkgEngineSrc = path.join(pkgSrc, 'engine');
const distDir = path.join(__dirname, 'dist');
const require = createRequire(path.join(__dirname, 'package.json'));

// ---------- 1. 소스 복사 ----------
rmSync(pkgEngineSrc, { recursive: true, force: true });
rmSync(distDir, { recursive: true, force: true });
cpSync(path.join(rootDir, 'src', 'engine'), pkgEngineSrc, { recursive: true });
console.log('copied src/engine → packages/myeong-engine/src/engine');

// ---------- 2. '@/engine/*' → 상대경로 재작성 ----------
function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (entry.endsWith('.ts')) yield full;
  }
}

let rewritten = 0;
for (const file of walk(pkgEngineSrc)) {
  const source = readFileSync(file, 'utf8');
  const next = source.replace(
    /(['"])@\/engine\/([^'"]+)\1/g,
    (match, quote, spec) => {
      const target = path.join(pkgEngineSrc, spec);
      let rel = path.relative(path.dirname(file), target).replace(/\\/g, '/');
      if (!rel.startsWith('.')) rel = `./${rel}`;
      rewritten += 1;
      return `${quote}${rel}${quote}`;
    },
  );
  if (next !== source) writeFileSync(file, next);
}
console.log(`rewrote ${rewritten} '@/engine/*' import specifiers`);

// ---------- 3. esbuild 번들 (ESM + CJS, JSON 인라인) ----------
const { build } = require('esbuild');
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

// ---------- 4. 타입 선언 생성 ----------
const tscBin = path.join(path.dirname(require.resolve('typescript/package.json')), 'bin', 'tsc');
execFileSync(process.execPath, [tscBin, '-p', path.join(__dirname, 'tsconfig.json')], {
  cwd: __dirname,
  stdio: 'inherit',
});
console.log('emitted dist/**/*.d.ts');
