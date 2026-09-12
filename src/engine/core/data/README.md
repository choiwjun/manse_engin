# 만세력 데이터 생성 기준 (2026-09-12)

`lunar-solar.generated.json`은 양력 1899-01-01~2101-12-31의 74,144일과
그 역변환을 저장한다. 두 방향은 항상 같은 한국 음력 기준을 사용한다.

| 구간 / 파일 | 근거 |
| --- | --- |
| 양력 1899-01-01~2050-12-31의 음양력 | `korean-lunar-calendar@0.4.0`의 KASI 기준표 |
| 양력 2051-01-01~2101-12-31의 음양력 | `astronomy-engine@2.1.19`의 삭 + 기존 중기 표, UTC+09:00 기준의 천문 계산 확장 |
| 절기 1899~2101 | 저장소에 있던 절기 표 유지 |
| 절기 2102 | `astronomy-engine@2.1.19`로 계산한 대운 탐색용 다음 해 버퍼 |

2051년 이후 음력은 KASI 공표값이 아닌 계산값이다. 미래 delta-T 예측이 달라지면
자정 근처의 삭·중기 날짜가 달라질 수 있으므로, 향후 공식 표가 발표되면 대조해야 한다.
이 구간은 한국 법정시 변경 이력과 별개로 UTC+09:00을 달력 기준으로 사용한다.
법정 시계 보정은 변환된 양력 생년월일시에 별도로 적용한다.

절기 JSON의 원본 시계 라벨은 UTC+08:00이다. `solar-terms.ts`가 이를
UTC+09:00으로 한 번 변환한다. `julianDay`도 원본 시계 라벨 기준이며 UTC JD가 아니다.

생성은 저장소 루트에서 다음과 같이 실행한다. 네트워크를 사용하지 않으며,
일반 빌드/테스트는 이미 커밋된 데이터를 읽는다.

```bash
npm ci --prefix packages/myeong-engine
npm --prefix packages/myeong-engine run generate:data
npm test
```

생성기는 동지가 들어 있는 달을 11월로 정한다. 두 동지 사이에 13개월이 있을 때는
중기가 없는 첫 달을 앞 달의 윤달로 정한다. 삭과 중기는 모두 한국 **날짜**로
귀속시키므로 같은 날짜의 중기는 새로 시작한 달에 속한다. 2012년 윤3월과
2033년 윤11월 등도 이 규칙으로 처리한다. 2050년까지의 결과는 역사적 달력 차이를
보존하기 위해 천문 계산값 대신 한국 기준표를 채택한다.

생성 전에 아래 검증을 통과해야 한다.

- 1912~2050년의 월 시작일 1,719개와 한국 기준표가 일치한다.
- 2050~2102년의 삭 655개가 NASA UT 표와 2분 이내이며, 한국 날짜가 일치한다.
- 달 길이는 29일/30일이고 동지 사이 달 수는 12개/13개다.
- 한국 기준표와 계산값이 만나는 2050-12-31의 음력 날짜가 일치한다.
- 전체 양력 날짜의 대응이 존재하고 음력 역변환 키가 중복되지 않는다.

회귀 테스트는 전체 날짜를 API로 왕복 변환하고, 2050년까지는 기준표와 전수
대조한다. NASA 자료는 `packages/myeong-engine/fixtures/`에 출처와 함께 보관한다.

출처:

- [한국천문연구원: 2012년 한국 윤3월과 중국 윤4월의 차이](https://www.kasi.re.kr/kor/publication/post/newsMaterial/2444)
- [한국 음력 기준표 라이브러리](https://github.com/usingsky/korean_lunar_calendar_js)
- [Astronomy Engine의 모델·정확도](https://github.com/cosinekitty/astronomy)
- [NASA 삭망표 2001~2100](https://eclipse.gsfc.nasa.gov/phase/phases2001.html), [2101~2200](https://eclipse.gsfc.nasa.gov/phase/phases2101.html)
- [한국 법정시 전환: IANA Asia/Seoul](https://data.iana.org/time-zones/tzdb/asia)

라이선스는 `packages/myeong-engine/THIRD_PARTY_NOTICES.md`에 수록한다.
