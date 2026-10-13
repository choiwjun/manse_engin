# MYEONG Blender Shorts Pipeline

`myeong-manseryeok-engine`의 계산/풀이 결과를 Blender 9:16 쇼츠 씬으로 넘기는 연동 파이프라인입니다.

핵심 원칙은 **Blender가 사주를 해석하지 않는 것**입니다. Node exporter가 엔진 결과를 JSON으로 고정하고, Blender는 그 JSON을 시각화합니다.

## Flow

```text
BirthInput
  -> buildSajuResult()
  -> assembleReport() / runDetectors()
  -> export-scene.mjs
  -> scene JSON
  -> Blender Python (bpy)
  -> .blend
  -> 1080x1920 MP4
```

## 1. Build engine

```bash
npm --prefix packages/myeong-engine run build
```

## 2. Export first short JSON

```bash
node tools/blender-shorts/export-scene.mjs \
  --year 1985 --month 1 --day 10 --hour 16 --minute 45 --gender male \
  --out output/blender-shorts/first-money.json
```

현재 `first-money` 프리셋은 식상생재 패턴이 감지되는 명식을 대상으로 합니다.

JSON에는 다음이 같이 저장됩니다.

- 팔자 4주
- 재성 비율
- 일간 강약 점수/라벨
- 핵심 패턴 key/title/strength/evidence
- 영상 장면별 문구와 나레이션 원문

그래서 영상 수치와 엔진 근거를 대조할 수 있습니다.

## 3. Build Blender scene

Blender 4.2+ / 4.5 LTS 계열을 권장합니다.

```bash
blender --background \
  --python tools/blender-shorts/blender/build_scene.py -- \
  --input output/blender-shorts/first-money.json \
  --output-blend output/blender-shorts/first-money.blend \
  --output-video output/blender-shorts/first-money.mp4 \
  --engine cycles
```

이 명령은 `.blend`를 생성합니다.

최종 렌더까지 한 번에 하려면 `--render`를 추가합니다.

```bash
blender --background \
  --python tools/blender-shorts/blender/build_scene.py -- \
  --input output/blender-shorts/first-money.json \
  --output-blend output/blender-shorts/first-money.blend \
  --output-video output/blender-shorts/first-money.mp4 \
  --engine cycles \
  --render
```

빠른 프리뷰는 `--engine eevee`, 최종본은 `--engine cycles`를 권장합니다.

## Windows font

기본으로 다음 경로를 탐색합니다.

- `C:\\Windows\\Fonts\\malgun.ttf`
- `C:\\Windows\\Fonts\\malgunbd.ttf`

다른 폰트를 쓰려면:

```powershell
$env:SAJU_FONT="C:\path\to\your-font.ttf"
```

또는 Blender 명령에 `--font`를 넘깁니다.

> 폰트 파일 자체는 저장소에 넣지 않습니다. 사용 폰트의 라이선스는 별도로 확인하세요.

## Narration audio

TTS 파일이 있으면 Blender VSE에 자동으로 삽입할 수 있습니다.

```bash
blender --background \
  --python tools/blender-shorts/blender/build_scene.py -- \
  --input output/blender-shorts/first-money.json \
  --audio output/blender-shorts/narration.wav \
  --output-blend output/blender-shorts/first-money.blend
```

## First short scene map

1. 0.0-2.6s — `사주에 돈이 많다고 / 돈복이 좋은 건 아닙니다.`
2. 2.6-7.0s — 엔진 명식 4주 표시
3. 7.0-13.5s — 재물 기운 퍼센트 게이지
4. 13.5-21.0s — 식상생재 `기술·표현 -> 돈`
5. 21.0-28.0s — 반전: 일간 힘 퍼센트
6. 28.0-35.0s — 의미 정리
7. 35.0-42.0s — 결론 카드

## Visual direction

- 1080x1920 / 30fps
- 먹색·암청색 배경
- 아이보리 + 금색 포인트
- 명식을 3D 텍스트로 표현
- 재물/강약 수치는 데이터 HUD처럼 표현
- 제한적인 FOG_GLOW
- `동양 명리 + 고급 데이터 시네마틱` 톤

## Next extensions

- 후보 명식 N개 생성 후 콘텐츠 가치 점수화
- love / career / relationship 프리셋
- TTS 자동 생성 및 `--audio` 연결
- Blender Asset Library 기반 고정 세계관
- 캐릭터/B-roll 씬
- 렌더 큐 및 업로드 자동화
