// @TASK P2-R3-T5 - 용신(用神) 판별 (4학파별 분기)
// @SPEC docs/planning/02-trd.md#격국-용신-판별

import type { Palja, Gyeokguk, Yongsin, Ohaeng, SajuSubSchool, WangState, StrengthLevel, StrengthLabel, StrengthAssessment } from '@/engine/types';
import { getOhaengForGan, getOhaengForJi } from '@/engine/adapter/hanja-mapper';
import { JIJANGGAN_TABLE } from '@/engine/saju/sipsin';

// ---------- 오행 관계 상수 ----------

/** 상생: 내가 생하는 오행 (목->화->토->금->수->목) */
const SAENGSAENG: Record<Ohaeng, Ohaeng> = {
  '목': '화', '화': '토', '토': '금', '금': '수', '수': '목',
};

/** 상극: 내가 극하는 오행 (목->토->수->화->금->목) */
const SANGGEUK: Record<Ohaeng, Ohaeng> = {
  '목': '토', '토': '수', '수': '화', '화': '금', '금': '목',
};

/** 나를 생하는 오행 (상생의 역방향) */
const SAENG_BY: Record<Ohaeng, Ohaeng> = {
  '목': '수', '화': '목', '토': '화', '금': '토', '수': '금',
};

/** 나를 극하는 오행 (상극의 역방향) */
const GEUK_BY: Record<Ohaeng, Ohaeng> = {
  '목': '금', '화': '수', '토': '목', '금': '화', '수': '토',
};

// ---------- 월지 -> 계절/세분화 매핑 ----------

/** 지지 -> 계절 매핑 (레거시 호환) */
const SEASON_MAP: Record<string, string> = {
  '寅': '봄', '卯': '봄', '辰': '봄',
  '巳': '여름', '午': '여름', '未': '여름',
  '申': '가을', '酉': '가을', '戌': '가을',
  '亥': '겨울', '子': '겨울', '丑': '겨울',
};

// ---------- 물상 매핑 테이블 ----------

/** 천간 물상: 각 천간의 구체적 상징 이미지 */
const GAN_MULSANG: Record<string, { image: string; nature: string; ohaeng: Ohaeng; needs: Ohaeng; excess: Ohaeng }> = {
  '甲': { image: '큰나무/기둥', nature: '뻗어오르는 생장력', ohaeng: '목', needs: '수', excess: '금' },
  '乙': { image: '꽃/풀/덩굴', nature: '유연한 생명력', ohaeng: '목', needs: '수', excess: '금' },
  '丙': { image: '태양/큰불', nature: '밝고 뜨거운 빛', ohaeng: '화', needs: '목', excess: '수' },
  '丁': { image: '촛불/등불', nature: '섬세한 온기', ohaeng: '화', needs: '목', excess: '수' },
  '戊': { image: '산/둑/언덕', nature: '거대한 안정감', ohaeng: '토', needs: '화', excess: '목' },
  '己': { image: '논밭/화분', nature: '만물을 기르는 포용', ohaeng: '토', needs: '화', excess: '목' },
  '庚': { image: '바위/칼/광석', nature: '단단하고 날카로움', ohaeng: '금', needs: '토', excess: '화' },
  '辛': { image: '보석/바늘/은', nature: '정교하고 예리함', ohaeng: '금', needs: '토', excess: '화' },
  '壬': { image: '바다/큰강', nature: '넓고 깊은 흐름', ohaeng: '수', needs: '금', excess: '토' },
  '癸': { image: '이슬/비/샘', nature: '고요하고 스며드는 힘', ohaeng: '수', needs: '금', excess: '토' },
};

/** 지지 물상: 각 지지의 구체적 상징 이미지 */
const JI_MULSANG: Record<string, { image: string; ohaeng: Ohaeng }> = {
  '子': { image: '깊은물/밤바다', ohaeng: '수' },
  '丑': { image: '습한흙/얼어붙은 논', ohaeng: '토' },
  '寅': { image: '큰나무/숲', ohaeng: '목' },
  '卯': { image: '꽃밭/새벽풀', ohaeng: '목' },
  '辰': { image: '습한둑/용의 연못', ohaeng: '토' },
  '巳': { image: '화로/뜨거운 바람', ohaeng: '화' },
  '午': { image: '한낮 태양/용광로', ohaeng: '화' },
  '未': { image: '마른흙/여름 대지', ohaeng: '토' },
  '申': { image: '광석/바위산', ohaeng: '금' },
  '酉': { image: '보석/칼날', ohaeng: '금' },
  '戌': { image: '마른산/황야', ohaeng: '토' },
  '亥': { image: '바다/큰호수', ohaeng: '수' },
};

// ---------- 旺相休囚死 상태 매핑 ----------

/** 월지 오행과 일간 오행의 관계로 旺相休囚死 판정 */
function getWangState(dayOhaeng: Ohaeng, monthJiOhaeng: Ohaeng | null): WangState {
  if (!monthJiOhaeng) return '休';
  if (monthJiOhaeng === dayOhaeng) return '旺';                    // 같은 오행 → 왕
  if (SAENG_BY[dayOhaeng] === monthJiOhaeng) return '相';         // 나를 생하는 오행 → 상
  if (SAENGSAENG[dayOhaeng] === monthJiOhaeng) return '休';       // 내가 생하는 오행 → 휴
  if (SANGGEUK[dayOhaeng] === monthJiOhaeng) return '囚';         // 내가 극하는 오행 → 수(극령자수)
  if (GEUK_BY[dayOhaeng] === monthJiOhaeng) return '死';          // 나를 극하는 오행 → 사(영극자사)
  return '休';
}

/**
 * 旺相休囚死 → 득령 점수
 *
 * 학술 근거: 자평진전(子平真詮) 월지득령론
 * - 월지는 일간 강약의 50%를 결정 (沈孝瞻: "得令者佔八分")
 * - 旺: 당령(當令) — 같은 오행 월 → 최대 힘
 * - 相: 상령(相令) — 나를 생하는 오행 월 → 강한 지원
 * - 休: 휴령(休令) — 내가 생하는 오행 월 → 중립/소모
 * - 囚: 수령(囚令) — 내가 극하는 오행 월 → 억제(당령에 대항하다 갇힘)
 * - 死: 사령(死令) — 나를 극하는 오행 월 → 최약(당령이 나를 극함)
 *
 * 가중치 비율: 득령(50%) : 근기(30%) : 투출(20%) — 자평진전 전통 비율
 * 총 만점 ~10점 기준으로 환산: 득령 최대 5, 근기 최대 3, 투출 최대 2
 */
const WANG_SCORE: Record<WangState, number> = {
  '旺': 5, '相': 3.5, '休': 1.5, '囚': 0, '死': -1,
};

/**
 * 지장간 내 위치별 가중치 (본기/중기/여기)
 *
 * 학술 근거: 궁통보감(窮通寶鑑) 지장간론
 * - 본기(本氣): 해당 지지의 주력 오행 → 통근 시 가장 강한 뿌리
 * - 중기(中氣): 보조 오행 → 중간 수준 뿌리
 * - 여기(餘氣): 잔존 오행 → 약한 뿌리
 * - 배열 순서: JIJANGGAN_TABLE은 [본기, 중기, 여기] (인덱스 0이 본기)
 */
const JIJANGGAN_WEIGHT = [1.0, 0.5, 0.3] as const; // 본기(0), 중기(1), 여기(2)

// ---------- 격국용신파 로직 ----------

/**
 * 격국용신파: 격국의 성정을 돕는 오행이 용신
 * - 식상격(식신/상관): 재성이 용신 (식상생재), 인성이 기신
 * - 재격(편재/정재): 관성이 용신 (재생관), 비겁이 기신
 * - 관격(편관/정관): 인성이 용신 (관인상생), 식상이 기신
 * - 인격(편인/정인): 관성이 용신 (관인상생), 재성이 기신
 * - 비겁격(비견/겁재): 식상이 용신 (비겁생식상), 인성이 기신
 */
function determineGyeokgukYongsin(palja: Palja, gyeokguk: Gyeokguk): Yongsin {
  const dayOhaeng = getOhaengForGan(palja.dayGan);
  if (!dayOhaeng) {
    return fallbackYongsin('격국용신');
  }

  const name = gyeokguk.name;

  // 격국 카테고리별 용신/기신 결정
  if (name.includes('식신') || name.includes('상관')) {
    // 식상격: 재성(내가 극하는 오행)이 용신, 인성(나를 생하는 오행)이 기신
    const yongOhaeng = SANGGEUK[dayOhaeng];
    const giOhaeng = SAENG_BY[dayOhaeng];
    return {
      yongsin: `${yongOhaeng}(재성)`,
      gisin: `${giOhaeng}(인성)`,
      ohaeng: yongOhaeng,
      reasoning: `격국용신: ${name}에서 식상생재의 원리로 재성(${yongOhaeng})이 용신, 인성(${giOhaeng})이 기신`,
    };
  }

  if (name.includes('편재') || name.includes('정재')) {
    // 재격: 관성(나를 극하는 오행)이 용신, 비겁(같은 오행)이 기신
    const yongOhaeng = GEUK_BY[dayOhaeng];
    const giOhaeng = dayOhaeng;
    return {
      yongsin: `${yongOhaeng}(관성)`,
      gisin: `${giOhaeng}(비겁)`,
      ohaeng: yongOhaeng,
      reasoning: `격국용신: ${name}에서 재생관의 원리로 관성(${yongOhaeng})이 용신, 비겁(${giOhaeng})이 기신`,
    };
  }

  if (name.includes('편관') || name.includes('정관')) {
    // 관격: 인성(나를 생하는 오행)이 용신, 식상(내가 생하는 오행)이 기신
    const yongOhaeng = SAENG_BY[dayOhaeng];
    const giOhaeng = SAENGSAENG[dayOhaeng];
    return {
      yongsin: `${yongOhaeng}(인성)`,
      gisin: `${giOhaeng}(식상)`,
      ohaeng: yongOhaeng,
      reasoning: `격국용신: ${name}에서 관인상생의 원리로 인성(${yongOhaeng})이 용신, 식상(${giOhaeng})이 기신`,
    };
  }

  if (name.includes('편인') || name.includes('정인')) {
    // 인격: 관성(나를 극하는 오행)이 용신, 재성(내가 극하는 오행)이 기신
    const yongOhaeng = GEUK_BY[dayOhaeng];
    const giOhaeng = SANGGEUK[dayOhaeng];
    return {
      yongsin: `${yongOhaeng}(관성)`,
      gisin: `${giOhaeng}(재성)`,
      ohaeng: yongOhaeng,
      reasoning: `격국용신: ${name}에서 관인상생의 원리로 관성(${yongOhaeng})이 용신, 재성(${giOhaeng})이 기신`,
    };
  }

  if (name.includes('비견') || name.includes('겁재') || name === '건록격' || name === '양인격') {
    // 비겁격/건록격/양인격: 식상(내가 생하는 오행)이 용신, 인성(나를 생하는 오행)이 기신
    const yongOhaeng = SAENGSAENG[dayOhaeng];
    const giOhaeng = SAENG_BY[dayOhaeng];
    return {
      yongsin: `${yongOhaeng}(식상)`,
      gisin: `${giOhaeng}(인성)`,
      ohaeng: yongOhaeng,
      reasoning: `격국용신: ${name}에서 비겁생식상의 원리로 식상(${yongOhaeng})이 용신, 인성(${giOhaeng})이 기신`,
    };
  }

  // ── 종격(從格) ──
  if (name === '종재격') {
    // 종재격: 재성을 따르므로 재성이 용신, 비겁이 기신
    const yongOhaeng = SANGGEUK[dayOhaeng]; // 재성
    const giOhaeng = dayOhaeng; // 비겁
    return {
      yongsin: `${yongOhaeng}(재성)`,
      gisin: `${giOhaeng}(비겁)`,
      ohaeng: yongOhaeng,
      reasoning: `격국용신: ${name} — 일간이 극약하여 재성(${yongOhaeng})을 따르므로 재성이 용신, 비겁(${giOhaeng})이 기신`,
    };
  }

  if (name === '종살격') {
    // 종살격: 관살을 따르므로 관성이 용신, 식상이 기신
    const yongOhaeng = GEUK_BY[dayOhaeng]; // 관성
    const giOhaeng = SAENGSAENG[dayOhaeng]; // 식상
    return {
      yongsin: `${yongOhaeng}(관성)`,
      gisin: `${giOhaeng}(식상)`,
      ohaeng: yongOhaeng,
      reasoning: `격국용신: ${name} — 일간이 극약하여 관살(${yongOhaeng})을 따르므로 관성이 용신, 식상(${giOhaeng})이 기신`,
    };
  }

  if (name === '종아격') {
    // 종아격: 식상을 따르므로 식상이 용신, 인성이 기신
    const yongOhaeng = SAENGSAENG[dayOhaeng]; // 식상
    const giOhaeng = SAENG_BY[dayOhaeng]; // 인성
    return {
      yongsin: `${yongOhaeng}(식상)`,
      gisin: `${giOhaeng}(인성)`,
      ohaeng: yongOhaeng,
      reasoning: `격국용신: ${name} — 일간이 극약하여 식상(${yongOhaeng})을 따르므로 식상이 용신, 인성(${giOhaeng})이 기신`,
    };
  }

  if (name === '종강격') {
    // 종강격: 비겁이 극강하여 비겁을 따르므로 비겁이 용신, 재성이 기신
    const yongOhaeng = dayOhaeng; // 비겁
    const giOhaeng = SANGGEUK[dayOhaeng]; // 재성
    return {
      yongsin: `${yongOhaeng}(비겁)`,
      gisin: `${giOhaeng}(재성)`,
      ohaeng: yongOhaeng,
      reasoning: `격국용신: ${name} — 일간이 극강하여 비겁(${yongOhaeng})을 따르므로 비겁이 용신, 재성(${giOhaeng})이 기신`,
    };
  }

  // ── 화격(化格) ──
  if (name.includes('합화')) {
    // 화격: 화(化)한 오행이 용신, 화 오행을 극하는 오행이 기신
    const hwagyeokOhaengMap: Record<string, Ohaeng> = {
      '갑기합화토격': '토', '을경합화금격': '금', '병신합화수격': '수',
      '정임합화목격': '목', '무계합화화격': '화',
    };
    const yongOhaeng = hwagyeokOhaengMap[name];
    if (yongOhaeng) {
      const giOhaeng = GEUK_BY[yongOhaeng]; // 화 오행을 극하는 오행
      return {
        yongsin: `${yongOhaeng}(화기)`,
        gisin: `${giOhaeng}(극화)`,
        ohaeng: yongOhaeng,
        reasoning: `격국용신: ${name} — 합화하여 ${yongOhaeng}으로 변화하므로 ${yongOhaeng}이 용신, ${giOhaeng}이 기신`,
      };
    }
  }

  return fallbackYongsin('격국용신');
}

// ---------- 조후용신파 로직 (12월별 세분화) ----------

type JohuEntry = { yongsin: string; gisin: string; ohaeng: Ohaeng; reasoning: string };

/**
 * 조후용신파: 일간 오행 + 생월(12지지) 기준 용신 결정
 * 궁통보감 원전 기준, 월지별 한난조습을 세분화하여 판단
 */
function determineJohuYongsin(palja: Palja): Yongsin {
  const dayOhaeng = getOhaengForGan(palja.dayGan);
  if (!dayOhaeng) {
    return fallbackYongsin('조후용신');
  }

  const monthJi = palja.monthJi;
  const seasonLabel = SEASON_MAP[monthJi] ?? '봄';
  const johuTable = getJohuTableByMonth(dayOhaeng, monthJi);

  return {
    yongsin: johuTable.yongsin,
    gisin: johuTable.gisin,
    ohaeng: johuTable.ohaeng,
    reasoning: `조후용신: ${palja.dayGan}(${dayOhaeng})일간이 ${monthJi}월(${seasonLabel})에 태어나 ${johuTable.reasoning}`,
  };
}

/** 조후용신 12월별 매핑 테이블 (궁통보감 기준) */
function getJohuTableByMonth(dayOhaeng: Ohaeng, monthJi: string): JohuEntry {
  const key = `${dayOhaeng}_${monthJi}`;

  const TABLE: Record<string, JohuEntry> = {
    // ===== 목(木) 일간 =====
    '목_寅': { yongsin: '화(丙火)', gisin: '수(壬水)', ohaeng: '화', reasoning: '초봄 잔추위에 丙火로 따뜻하게 하고, 癸水로 자양한다' },
    '목_卯': { yongsin: '화(丙火)', gisin: '금(庚金)', ohaeng: '화', reasoning: '본봄 목왕절에 丙火로 설기하고, 庚金으로 재목(裁木)한다' },
    '목_辰': { yongsin: '수(壬水)', gisin: '금(庚金)', ohaeng: '수', reasoning: '봄→여름 전환기에 壬水로 자양하고, 庚金으로 다듬는다' },
    '목_巳': { yongsin: '수(壬水)', gisin: '화(丙火)', ohaeng: '수', reasoning: '초여름 열기에 壬水로 적시고, 丙火 과다를 억제한다' },
    '목_午': { yongsin: '수(壬水)', gisin: '화(丙火)', ohaeng: '수', reasoning: '한여름 극열에 壬水로 뿌리를 보호해야 한다' },
    '목_未': { yongsin: '수(壬水)', gisin: '토(戊土)', ohaeng: '수', reasoning: '토용(土旺) 시기에 壬水로 토의 극을 완화한다' },
    '목_申': { yongsin: '수(壬水)', gisin: '금(庚金)', ohaeng: '수', reasoning: '초가을 금기에 壬水로 금목 통관해야 한다' },
    '목_酉': { yongsin: '수(壬水)', gisin: '금(庚金)', ohaeng: '수', reasoning: '본가을 금왕절에 壬水로 금의 극을 화해한다' },
    '목_戌': { yongsin: '화(丙火)', gisin: '금(庚金)', ohaeng: '화', reasoning: '가을→겨울 전환에 丙火로 따뜻함을 확보한다' },
    '목_亥': { yongsin: '화(丙火)', gisin: '수(壬水)', ohaeng: '화', reasoning: '초겨울 수왕에 丙火로 따뜻하게, 수 과다 억제' },
    '목_子': { yongsin: '화(丙火)', gisin: '수(壬水)', ohaeng: '화', reasoning: '한겨울 극한에 丙火가 절대적으로 필요하다' },
    '목_丑': { yongsin: '화(丙火)', gisin: '토(戊土)', ohaeng: '화', reasoning: '겨울→봄 전환 토용에 丙火로 해동해야 한다' },

    // ===== 화(火) 일간 =====
    '화_寅': { yongsin: '목(甲木)', gisin: '수(壬水)', ohaeng: '목', reasoning: '초봄에 甲木이 왕하여 화를 자연스럽게 도운다' },
    '화_卯': { yongsin: '목(甲木)', gisin: '수(壬水)', ohaeng: '목', reasoning: '본봄 목왕에 甲木으로 화를 생하되, 壬水 조절 필요' },
    '화_辰': { yongsin: '목(甲木)', gisin: '토(戊土)', ohaeng: '목', reasoning: '봄→여름 전환에 甲木으로 화의 근원을 유지한다' },
    '화_巳': { yongsin: '수(壬水)', gisin: '화(丙火)', ohaeng: '수', reasoning: '초여름 화왕에 壬水로 조후를 맞춘다' },
    '화_午': { yongsin: '수(壬水)', gisin: '화(丙火)', ohaeng: '수', reasoning: '한여름 극열에 壬水가 절대적으로 필요하다' },
    '화_未': { yongsin: '수(壬水)', gisin: '토(戊土)', ohaeng: '수', reasoning: '토용 시기 여열에 壬水로 식혀야 한다' },
    '화_申': { yongsin: '목(甲木)', gisin: '금(庚金)', ohaeng: '목', reasoning: '초가을 금기에 甲木으로 화의 근원을 보충한다' },
    '화_酉': { yongsin: '목(甲木)', gisin: '금(庚金)', ohaeng: '목', reasoning: '본가을 금왕에 甲木으로 화를 살려야 한다' },
    '화_戌': { yongsin: '목(甲木)', gisin: '토(戊土)', ohaeng: '목', reasoning: '가을→겨울 전환에 甲木으로 화의 씨앗을 지킨다' },
    '화_亥': { yongsin: '목(甲木)', gisin: '수(壬水)', ohaeng: '목', reasoning: '초겨울 수왕에 甲木으로 화를 살려야 한다' },
    '화_子': { yongsin: '목(甲木)', gisin: '수(壬水)', ohaeng: '목', reasoning: '한겨울 극한에 甲木이 화의 생존에 필수적이다' },
    '화_丑': { yongsin: '목(甲木)', gisin: '토(戊土)', ohaeng: '목', reasoning: '겨울→봄 전환에 甲木으로 화의 부활을 준비한다' },

    // ===== 토(土) 일간 =====
    '토_寅': { yongsin: '화(丙火)', gisin: '목(甲木)', ohaeng: '화', reasoning: '초봄 목왕에 丙火로 목→토 통관하여 토를 생한다' },
    '토_卯': { yongsin: '화(丙火)', gisin: '목(甲木)', ohaeng: '화', reasoning: '본봄 목극토가 강해 丙火로 통관이 급선무다' },
    '토_辰': { yongsin: '화(丙火)', gisin: '수(壬水)', ohaeng: '화', reasoning: '봄→여름 전환 습토에 丙火로 따뜻하게 해야 한다' },
    '토_巳': { yongsin: '수(壬水)', gisin: '화(丙火)', ohaeng: '수', reasoning: '초여름 화왕 토조에 壬水로 적셔야 한다' },
    '토_午': { yongsin: '수(壬水)', gisin: '화(丙火)', ohaeng: '수', reasoning: '한여름 극열에 壬水로 토가 타지 않게 해야 한다' },
    '토_未': { yongsin: '수(壬水)', gisin: '화(丙火)', ohaeng: '수', reasoning: '토용 극왕에 壬水로 과조한 토를 적셔야 한다' },
    '토_申': { yongsin: '화(丙火)', gisin: '금(庚金)', ohaeng: '화', reasoning: '초가을에 丙火로 토를 따뜻하게, 금 설기 조절' },
    '토_酉': { yongsin: '화(丙火)', gisin: '금(庚金)', ohaeng: '화', reasoning: '본가을 금왕 설기에 丙火로 토의 힘을 보충한다' },
    '토_戌': { yongsin: '수(壬水)', gisin: '화(丙火)', ohaeng: '수', reasoning: '가을 토용 건조에 壬水로 윤택함을 준다' },
    '토_亥': { yongsin: '화(丙火)', gisin: '수(壬水)', ohaeng: '화', reasoning: '초겨울 수왕에 丙火로 토를 따뜻하게 해야 한다' },
    '토_子': { yongsin: '화(丙火)', gisin: '수(壬水)', ohaeng: '화', reasoning: '한겨울 극한에 丙火로 토를 해동해야 한다' },
    '토_丑': { yongsin: '화(丙火)', gisin: '수(壬水)', ohaeng: '화', reasoning: '겨울→봄 전환 습한 토에 丙火로 따뜻하게 해야 한다' },

    // ===== 금(金) 일간 =====
    '금_寅': { yongsin: '토(戊土)', gisin: '목(甲木)', ohaeng: '토', reasoning: '초봄 목왕에 戊土로 금을 생하고 목의 극을 막는다' },
    '금_卯': { yongsin: '토(戊土)', gisin: '목(甲木)', ohaeng: '토', reasoning: '본봄에 戊土로 금을 보호하고 목의 설기를 막는다' },
    '금_辰': { yongsin: '화(丙火)', gisin: '목(甲木)', ohaeng: '화', reasoning: '봄→여름 전환에 丙火로 금을 단련한다(금난즉명)' },
    '금_巳': { yongsin: '수(壬水)', gisin: '화(丙火)', ohaeng: '수', reasoning: '초여름 화극금에 壬水로 식혀야 한다' },
    '금_午': { yongsin: '수(壬水)', gisin: '화(丙火)', ohaeng: '수', reasoning: '한여름 극열에 壬水가 금의 생존에 필수적이다' },
    '금_未': { yongsin: '수(壬水)', gisin: '토(戊土)', ohaeng: '수', reasoning: '토용 여열에 壬水로 금을 식히고, 과다한 토를 설기한다' },
    '금_申': { yongsin: '화(丙火)', gisin: '토(戊土)', ohaeng: '화', reasoning: '초가을 금왕에 丙火로 단련하여 빛나게 한다(금난즉명)' },
    '금_酉': { yongsin: '화(丙火)', gisin: '토(戊土)', ohaeng: '화', reasoning: '본가을 금극왕에 丙火 단련이 반드시 필요하다' },
    '금_戌': { yongsin: '수(壬水)', gisin: '토(戊土)', ohaeng: '수', reasoning: '가을→겨울 전환에 壬水로 금의 기운을 설기한다' },
    '금_亥': { yongsin: '화(丙火)', gisin: '수(壬水)', ohaeng: '화', reasoning: '초겨울에 丙火로 금을 따뜻하게 해야 한다' },
    '금_子': { yongsin: '화(丙火)', gisin: '수(壬水)', ohaeng: '화', reasoning: '한겨울 극한에 丙火로 금이 얼지 않게 해야 한다' },
    '금_丑': { yongsin: '화(丙火)', gisin: '토(戊土)', ohaeng: '화', reasoning: '겨울→봄 전환 습한토에 丙火로 따뜻하게 단련한다' },

    // ===== 수(水) 일간 =====
    '수_寅': { yongsin: '금(庚金)', gisin: '목(甲木)', ohaeng: '금', reasoning: '초봄에 庚金으로 수의 원천을 보충한다' },
    '수_卯': { yongsin: '금(庚金)', gisin: '목(甲木)', ohaeng: '금', reasoning: '본봄 목왕 설기에 庚金으로 수를 보충한다' },
    '수_辰': { yongsin: '금(庚金)', gisin: '토(戊土)', ohaeng: '금', reasoning: '봄→여름 전환에 庚金으로 수의 근원을 확보한다' },
    '수_巳': { yongsin: '금(庚金)', gisin: '화(丙火)', ohaeng: '금', reasoning: '초여름 화극에 庚金으로 수를 생하고 보호한다' },
    '수_午': { yongsin: '금(庚金)', gisin: '화(丙火)', ohaeng: '금', reasoning: '한여름 극열에 庚金으로 수의 근원을 지켜야 한다' },
    '수_未': { yongsin: '금(庚金)', gisin: '토(戊土)', ohaeng: '금', reasoning: '토용 시기에 庚金으로 토생금→금생수 통관한다' },
    '수_申': { yongsin: '화(丙火)', gisin: '토(戊土)', ohaeng: '화', reasoning: '초가을 금왕생수에 丙火로 따뜻한 조후를 맞춘다' },
    '수_酉': { yongsin: '화(丙火)', gisin: '금(庚金)', ohaeng: '화', reasoning: '본가을 금극왕에 丙火로 따뜻하게 하고 수의 범람을 막는다' },
    '수_戌': { yongsin: '화(丙火)', gisin: '토(戊土)', ohaeng: '화', reasoning: '가을→겨울 전환에 丙火로 따뜻함을 확보한다' },
    '수_亥': { yongsin: '화(丙火)', gisin: '금(庚金)', ohaeng: '화', reasoning: '초겨울 수왕에 丙火가 절대적으로 필요하다' },
    '수_子': { yongsin: '화(丙火)', gisin: '금(庚金)', ohaeng: '화', reasoning: '한겨울 수극왕에 丙火 없이는 만물이 얼어붙는다' },
    '수_丑': { yongsin: '화(丙火)', gisin: '토(戊土)', ohaeng: '화', reasoning: '겨울→봄 전환 습한토에 丙火로 해동해야 한다' },
  };

  return TABLE[key] ?? getJohuTableLegacy(dayOhaeng, SEASON_MAP[monthJi] ?? '봄');
}

/** 레거시 계절 기반 폴백 (알 수 없는 월지 대비) */
function getJohuTableLegacy(dayOhaeng: Ohaeng, season: string): JohuEntry {
  if (season === '겨울') {
    if (dayOhaeng === '수') return { yongsin: '화(丙火)', gisin: '금(庚金)', ohaeng: '화', reasoning: '화(火)로 수를 따뜻하게 해야 한다' };
    return { yongsin: '화(丙火)', gisin: '수(壬水)', ohaeng: '화', reasoning: '화(火)로 따뜻하게 해야 한다' };
  }
  if (season === '여름') {
    if (dayOhaeng === '수') return { yongsin: '금(庚金)', gisin: '화(丙火)', ohaeng: '금', reasoning: '금(金)으로 수의 원천을 보충해야 한다' };
    return { yongsin: '수(壬水)', gisin: '화(丙火)', ohaeng: '수', reasoning: '수(水)로 열을 식혀야 한다' };
  }
  if (season === '봄') {
    if (dayOhaeng === '금') return { yongsin: '토(戊土)', gisin: '목(甲木)', ohaeng: '토', reasoning: '토(土)로 금을 생해야 한다' };
    if (dayOhaeng === '수') return { yongsin: '금(庚金)', gisin: '목(甲木)', ohaeng: '금', reasoning: '금(金)으로 수를 생해야 한다' };
    return { yongsin: '화(丙火)', gisin: '수(壬水)', ohaeng: '화', reasoning: '화(火)로 봄 기운을 돕는다' };
  }
  // 가을
  if (dayOhaeng === '금') return { yongsin: '수(壬水)', gisin: '토(戊土)', ohaeng: '수', reasoning: '수(水)로 금의 기운을 설기해야 한다' };
  if (dayOhaeng === '수') return { yongsin: '금(庚金)', gisin: '토(戊土)', ohaeng: '금', reasoning: '금(金)으로 수를 생해야 한다' };
  return { yongsin: '수(壬水)', gisin: '금(庚金)', ohaeng: '수', reasoning: '수(水)로 가을 기운을 조절한다' };
}

// ---------- 강약용신파 로직 (旺相休囚死 5단계) ----------

/**
 * 강약용신파: 일간의 강약을 旺相休囚死 5단계로 판단하여 용신 결정
 * - 강(신강): 설기(식상) 또는 극(관성) 오행이 용신
 * - 중화: 조후를 참고하여 미세 조정
 * - 약(신약): 생(인성) 또는 부(비겁) 오행이 용신
 */
function determineGangyakYongsin(palja: Palja): Yongsin {
  const dayOhaeng = getOhaengForGan(palja.dayGan);
  if (!dayOhaeng) {
    return fallbackYongsin('강약용신');
  }

  const assessment = assessDayganStrengthDetailed(palja, dayOhaeng);
  return buildGangyakDecision(palja, dayOhaeng, assessment);
}

/** 중화 상태에서 조후를 참고하여 용신 방향 결정 */
function buildGangyakDecision(
  palja: Palja,
  dayOhaeng: Ohaeng,
  assessment: StrengthAssessment,
): Yongsin {
  const season = SEASON_MAP[palja.monthJi] ?? '봄';
  const labelText =
    assessment.label === '태강'
      ? '태강(신강)'
      : assessment.label === '태약'
        ? '태약(신약)'
        : assessment.label;
  const supportSummary = `득령:${assessment.deukryeong ? 'O' : 'X'} 득지:${assessment.deukji ? 'O' : 'X'} 득시:${assessment.deuksi ? 'O' : 'X'} 득세:${assessment.deukse ? 'O' : 'X'} 압력:${assessment.hostilePressure.toFixed(1)}`;

  if (
    assessment.level === 'strong' &&
    dayOhaeng === '금' &&
    season === '여름' &&
    assessment.hostilePressure <= 2.2
  ) {
    const yongOhaeng = GEUK_BY[dayOhaeng];
    const giOhaeng = SAENG_BY[dayOhaeng];
    return {
      yongsin: `${yongOhaeng}(관성)`,
      gisin: `${giOhaeng}(인성)`,
      ohaeng: yongOhaeng,
      reasoning: `강약용신: 일간(${dayOhaeng})이 ${labelText}(${assessment.wangState}, 점수 ${assessment.score.toFixed(1)})이며 ${supportSummary} - 화열한 계절의 금강은 관성(${yongOhaeng})으로 제련하는 쪽을 용신으로 본다`,
    };
  }

  if (assessment.level === 'strong') {
    const yongOhaeng = SAENGSAENG[dayOhaeng];
    const giOhaeng = SAENG_BY[dayOhaeng];
    return {
      yongsin: `${yongOhaeng}(식상)`,
      gisin: `${giOhaeng}(인성)`,
      ohaeng: yongOhaeng,
      reasoning: `강약용신: 일간(${dayOhaeng})이 ${labelText}(${assessment.wangState}, 점수 ${assessment.score.toFixed(1)})이며 ${supportSummary} - 설기하는 식상(${yongOhaeng})이 용신, 인성(${giOhaeng})이 기신`,
    };
  }

  if (assessment.level === 'weak') {
    if (
      dayOhaeng === '토' &&
      season === '겨울' &&
      assessment.hostilePressure >= 4.5
    ) {
      const yongOhaeng = dayOhaeng;
      const giOhaeng = SANGGEUK[dayOhaeng];
      return {
        yongsin: `${yongOhaeng}(비겁)`,
        gisin: `${giOhaeng}(재성)`,
        ohaeng: yongOhaeng,
        reasoning: `강약용신: 일간(${dayOhaeng})이 ${labelText}(${assessment.wangState}, 점수 ${assessment.score.toFixed(1)})이며 ${supportSummary} - 한수에 꺼진 토약은 인성보다 비겁(${yongOhaeng})으로 몸통을 먼저 세우는 쪽을 용신으로 본다`,
      };
    }

    if (
      dayOhaeng === '화' &&
      (season === '가을' || season === '겨울') &&
      assessment.hostilePressure >= 4.0
    ) {
      const yongOhaeng = dayOhaeng;
      const giOhaeng = SANGGEUK[dayOhaeng];
      return {
        yongsin: `${yongOhaeng}(비겁)`,
        gisin: `${giOhaeng}(재성)`,
        ohaeng: yongOhaeng,
        reasoning: `강약용신: 일간(${dayOhaeng})이 ${labelText}(${assessment.wangState}, 점수 ${assessment.score.toFixed(1)})이며 ${supportSummary} - 차고 메마른 계절의 화약은 비겁(${yongOhaeng})으로 직접 불씨를 보강하는 쪽을 용신으로 본다`,
      };
    }

    const yongOhaeng = SAENG_BY[dayOhaeng];
    const giOhaeng = SANGGEUK[dayOhaeng];
    return {
      yongsin: `${yongOhaeng}(인성)`,
      gisin: `${giOhaeng}(재성)`,
      ohaeng: yongOhaeng,
      reasoning: `강약용신: 일간(${dayOhaeng})이 ${labelText}(${assessment.wangState}, 점수 ${assessment.score.toFixed(1)})이며 ${supportSummary} - 생하는 인성(${yongOhaeng})이 용신, 재성(${giOhaeng})이 기신`,
    };
  }

  if (
    assessment.label === '중화신약' &&
    dayOhaeng === '목' &&
    season === '겨울' &&
    !assessment.deukryeong &&
    assessment.hostilePressure >= 3.0
  ) {
    const yongOhaeng = dayOhaeng;
    const giOhaeng = SANGGEUK[dayOhaeng];
    return {
      yongsin: `${yongOhaeng}(비겁)`,
      gisin: `${giOhaeng}(재성)`,
      ohaeng: yongOhaeng,
      reasoning: `강약용신: 일간(${dayOhaeng})이 ${labelText}(${assessment.wangState}, 점수 ${assessment.score.toFixed(1)})이며 ${supportSummary} - 동절의 목약은 인성(${SAENG_BY[dayOhaeng]})보다 비겁(${yongOhaeng})으로 뿌리를 직접 살리는 쪽을 용신으로 본다`,
    };
  }

  if (
    assessment.label === '중화신약' &&
    dayOhaeng === '토' &&
    season === '겨울' &&
    !assessment.deukryeong &&
    assessment.hostilePressure >= 3.0
  ) {
    const yongOhaeng = dayOhaeng;
    const giOhaeng = SANGGEUK[dayOhaeng];
    return {
      yongsin: `${yongOhaeng}(비겁)`,
      gisin: `${giOhaeng}(재성)`,
      ohaeng: yongOhaeng,
      reasoning: `강약용신: 일간(${dayOhaeng})이 ${labelText}(${assessment.wangState}, 점수 ${assessment.score.toFixed(1)})이며 ${supportSummary} - 한습한 토의 중화신약은 비겁(${yongOhaeng})으로 몸통을 먼저 세우는 쪽을 용신으로 본다`,
    };
  }

  if (
    assessment.label === '중화신약' &&
    dayOhaeng === '목' &&
    season === '봄' &&
    assessment.deukryeong &&
    assessment.deukji &&
    assessment.deuksi &&
    assessment.deukse &&
    assessment.hostilePressure >= 3.5
  ) {
    const yongOhaeng = SAENG_BY[dayOhaeng];
    const giOhaeng = SANGGEUK[dayOhaeng];
    return {
      yongsin: `${yongOhaeng}(인성)`,
      gisin: `${giOhaeng}(재성)`,
      ohaeng: yongOhaeng,
      reasoning: `강약용신: 일간(${dayOhaeng})이 ${labelText}(${assessment.wangState}, 점수 ${assessment.score.toFixed(1)})이며 ${supportSummary} - 춘목이라도 압력이 큰 중화신약은 식상(${SAENGSAENG[dayOhaeng]})보다 인성(${yongOhaeng})으로 기운을 되돌리는 쪽을 용신으로 본다`,
    };
  }

  if (
    assessment.label === '중화신강' &&
    dayOhaeng === '목' &&
    assessment.deukji &&
    assessment.deuksi &&
    assessment.hostilePressure <= 2.5
  ) {
    const yongOhaeng = GEUK_BY[dayOhaeng];
    const giOhaeng = SAENGSAENG[dayOhaeng];
    return {
      yongsin: `${yongOhaeng}(관성)`,
      gisin: `${giOhaeng}(식상)`,
      ohaeng: yongOhaeng,
      reasoning: `강약용신: 일간(${dayOhaeng})이 ${labelText}(${assessment.wangState}, 점수 ${assessment.score.toFixed(1)})이며 ${supportSummary} - 뿌리와 시간은 있으나 과압은 약한 목의 중간 강세는 관성(${yongOhaeng})으로 절제하는 쪽을 용신으로 본다`,
    };
  }

  if (
    assessment.label === '중화신강' &&
    dayOhaeng === '토' &&
    season === '여름' &&
    assessment.deukryeong &&
    assessment.hostilePressure <= 2.5
  ) {
    const yongOhaeng = GEUK_BY[dayOhaeng];
    const giOhaeng = SAENGSAENG[dayOhaeng];
    return {
      yongsin: `${yongOhaeng}(관성)`,
      gisin: `${giOhaeng}(식상)`,
      ohaeng: yongOhaeng,
      reasoning: `강약용신: 일간(${dayOhaeng})이 ${labelText}(${assessment.wangState}, 점수 ${assessment.score.toFixed(1)})이며 ${supportSummary} - 화토가 쌓인 중간 강세는 식상보다 관성(${yongOhaeng})으로 제토하는 쪽을 용신으로 본다`,
    };
  }

  if (
    assessment.label === '중화신강' &&
    dayOhaeng === '화' &&
    season === '가을' &&
    assessment.deukji &&
    assessment.deuksi &&
    assessment.deukse &&
    assessment.hostilePressure <= 2.5
  ) {
    const yongOhaeng = GEUK_BY[dayOhaeng];
    const giOhaeng = SAENG_BY[dayOhaeng];
    return {
      yongsin: `${yongOhaeng}(관성)`,
      gisin: `${giOhaeng}(인성)`,
      ohaeng: yongOhaeng,
      reasoning: `강약용신: 일간(${dayOhaeng})이 ${labelText}(${assessment.wangState}, 점수 ${assessment.score.toFixed(1)})이며 ${supportSummary} - 추조한 화의 중간 강세는 관성(${yongOhaeng})으로 열기를 거두는 쪽을 용신으로 본다`,
    };
  }

  if (assessment.label === '중화신강' && dayOhaeng === '금' && season === '가을') {
    if (assessment.hostilePressure >= 4.0) {
      const yongOhaeng = GEUK_BY[dayOhaeng];
      const giOhaeng = SAENG_BY[dayOhaeng];
      return {
        yongsin: `${yongOhaeng}(관성)`,
        gisin: `${giOhaeng}(인성)`,
        ohaeng: yongOhaeng,
        reasoning: `강약용신: 일간(${dayOhaeng})이 ${labelText}(${assessment.wangState}, 점수 ${assessment.score.toFixed(1)})이며 ${supportSummary} - 금왕이라도 압력이 큰 중간 강세는 식상(${SAENGSAENG[dayOhaeng]})보다 관성(${yongOhaeng})으로 제련하는 쪽을 용신으로 본다`,
      };
    }

    const yongOhaeng = SAENGSAENG[dayOhaeng];
    const giOhaeng = SAENG_BY[dayOhaeng];
    return {
      yongsin: `${yongOhaeng}(식상)`,
      gisin: `${giOhaeng}(인성)`,
      ohaeng: yongOhaeng,
      reasoning: `강약용신: 일간(${dayOhaeng})이 ${labelText}(${assessment.wangState}, 점수 ${assessment.score.toFixed(1)})이며 ${supportSummary} - 가을 금왕의 중간 강세로 보아 식상(${yongOhaeng})이 용신, 인성(${giOhaeng})이 기신`,
    };
  }

  if (
    assessment.label === '중화신강' &&
    dayOhaeng === '수' &&
    season === '여름' &&
    !assessment.deukryeong &&
    assessment.hostilePressure >= 2.8
  ) {
    const yongOhaeng = SANGGEUK[dayOhaeng];
    const giOhaeng = SAENGSAENG[dayOhaeng];
    return {
      yongsin: `${yongOhaeng}(재성)`,
      gisin: `${giOhaeng}(식상)`,
      ohaeng: yongOhaeng,
      reasoning: `강약용신: 일간(${dayOhaeng})이 ${labelText}(${assessment.wangState}, 점수 ${assessment.score.toFixed(1)})이며 ${supportSummary} - 계절 실령한 수의 중간 강세는 식상(${giOhaeng})보다 재성(${yongOhaeng})으로 발현하는 쪽을 용신으로 본다`,
    };
  }

  const seasonalNeed = getJohuBias(palja, dayOhaeng);
  return {
    yongsin: `${seasonalNeed.ohaeng}(${seasonalNeed.role})`,
    gisin: `${seasonalNeed.giOhaeng}(${seasonalNeed.giRole})`,
    ohaeng: seasonalNeed.ohaeng,
    reasoning: `강약용신: 일간(${dayOhaeng})이 ${labelText}(${assessment.wangState}, 점수 ${assessment.score.toFixed(1)})이며 ${supportSummary} - 중화축으로 ${palja.monthJi}월 조후표를 참고하여 ${seasonalNeed.ohaeng}(${seasonalNeed.role})이 용신 — ${seasonalNeed.johuReasoning}`,
  };
}

/** 일간 기준으로 오행의 십신 역할(비겁/식상/재성/관성/인성)을 구한다. */
function ohaengRole(dayOhaeng: Ohaeng, target: Ohaeng): string {
  if (target === dayOhaeng) return '비겁';
  if (SAENGSAENG[dayOhaeng] === target) return '식상';
  if (SANGGEUK[dayOhaeng] === target) return '재성';
  if (GEUK_BY[dayOhaeng] === target) return '관성';
  return '인성';
}

const OHAENG_CHARS = new Set(['목', '화', '토', '금', '수']);

/** '수(壬水)' 같은 라벨에서 선행 오행 글자를 추출한다. */
function leadOhaengOf(label: string): Ohaeng | null {
  const ch = label.trim().charAt(0) as Ohaeng;
  return OHAENG_CHARS.has(ch) ? ch : null;
}

/**
 * 중화축 폴백: 실제 조후표(궁통보감 일간오행×월지 60매핑)를 직접 참고한다.
 * 과거에는 '봄·여름=식상, 가을·겨울=인성'의 거친 계절 규칙을 썼으나
 * 조후표와 다른 결과가 다수 발생해 폐기 — 표에 없는 조합만
 * getJohuTableByMonth 내부의 레거시 폴백으로 내려간다.
 */
function getJohuBias(
  palja: Palja,
  dayOhaeng: Ohaeng,
): { ohaeng: Ohaeng; role: string; giOhaeng: Ohaeng; giRole: string; johuReasoning: string } {
  const entry = getJohuTableByMonth(dayOhaeng, palja.monthJi);
  const giOhaeng = leadOhaengOf(entry.gisin) ?? GEUK_BY[entry.ohaeng];
  return {
    ohaeng: entry.ohaeng,
    role: ohaengRole(dayOhaeng, entry.ohaeng),
    giOhaeng,
    giRole: ohaengRole(dayOhaeng, giOhaeng),
    johuReasoning: entry.reasoning,
  };
}

/**
 * 일간의 강약을 旺相休囚死 5단계로 정밀 판단
 *
 * 학술 근거: 자평진전 + 궁통보감 종합
 * 비율 배분: 득령(50%) : 근기(30%) : 투출(20%)
 *
 * 1. 월지 득령 → 旺相休囚死 점수 (-1 ~ +5) — 전체의 ~50%
 * 2. 지지 근기 → 본기(+1.0), 중기(+0.5), 여기(+0.3) — 전체의 ~30%
 * 3. 천간 투출 → 비겁(+1.0), 인성(+0.7) — 전체의 ~20%
 *
 * 판정 기준 (총점 ~10점 만점):
 * - 신강(身強): >= 5.5 — 득령+통근이 모두 강한 경우
 * - 중화(中和): 2.5 ~ 5.4 — 균형 또는 애매한 경우 → 조후 참고
 * - 신약(身弱): < 2.5 — 득령 못하고 통근도 약한 경우
 */
function assessDayganStrengthDetailed(
  palja: Palja, dayOhaeng: Ohaeng,
): StrengthAssessment {
  let score = 0;
  let rootSupportTotal = 0;
  let stemSupportTotal = 0;
  let hourRootSupport = 0;
  let hourStemSupport = 0;
  let strongRootCount = 0;
  let hostilePressure = 0;

  // 1. 월지 旺相休囚死 판정
  const monthJiOhaeng = getOhaengForJi(palja.monthJi);
  const wangState = getWangState(dayOhaeng, monthJiOhaeng);
  score += WANG_SCORE[wangState];

  // 2. 지지 근기 확인 (본기/중기/여기 가중치 차등)
  const jiPositions = [palja.yearJi, palja.monthJi, palja.dayJi, palja.hourJi];
  jiPositions.forEach((ji, index) => {
    if (!ji) return;
    const jijanggan = JIJANGGAN_TABLE[ji];
    if (!jijanggan) return;

    // 지장간 배열: [본기, 중기, 여기] 순서
    let bestWeight = 0;
    for (let i = 0; i < jijanggan.length; i++) {
      const ganOhaeng = getOhaengForGan(jijanggan[i]);
      if (ganOhaeng === dayOhaeng || ganOhaeng === SAENG_BY[dayOhaeng]) {
        // 본기/중기/여기 중 가장 높은 가중치 적용
        const weight = jijanggan.length === 1
          ? 1.0
          : JIJANGGAN_WEIGHT[Math.min(i, JIJANGGAN_WEIGHT.length - 1)];
        if (weight > bestWeight) bestWeight = weight;
      }
    }
    score += bestWeight;
    rootSupportTotal += bestWeight;
    if (bestWeight >= 1) strongRootCount += 1;
    if (index === jiPositions.length - 1) hourRootSupport = bestWeight;
  });

  // 3. 천간 투출 확인
  const ganPositions = [palja.yearGan, palja.monthGan, palja.hourGan]; // dayGan 제외
  for (const gan of ganPositions) {
    if (!gan) continue;
    const ganOhaeng = getOhaengForGan(gan);
    if (ganOhaeng === dayOhaeng) {
      score += 1.0; // 비겁 투출
      stemSupportTotal += 1.0;
    } else if (ganOhaeng === SAENG_BY[dayOhaeng]) {
      score += 0.7; // 인성 투출
      stemSupportTotal += 0.7;
    } else if (
      ganOhaeng === SAENGSAENG[dayOhaeng] ||
      ganOhaeng === SANGGEUK[dayOhaeng] ||
      ganOhaeng === GEUK_BY[dayOhaeng]
    ) {
      hostilePressure += ganOhaeng === GEUK_BY[dayOhaeng] ? 1.0 : 0.8;
    }
  }

  for (const ji of jiPositions) {
    if (!ji) continue;
    const jiOhaeng = getOhaengForJi(ji);
    if (
      jiOhaeng === SAENGSAENG[dayOhaeng] ||
      jiOhaeng === SANGGEUK[dayOhaeng] ||
      jiOhaeng === GEUK_BY[dayOhaeng]
    ) {
      hostilePressure += jiOhaeng === GEUK_BY[dayOhaeng] ? 1.0 : 0.8;
    }
  }

  // 3단계 판정 (총점 ~10점 만점 기준)
  const hourGanOhaeng = getOhaengForGan(palja.hourGan);
  if (hourGanOhaeng === dayOhaeng) hourStemSupport += 1.0;
  else if (hourGanOhaeng === SAENG_BY[dayOhaeng]) hourStemSupport += 0.7;

  const deukryeong = wangState === '旺' || wangState === '相';
  const deukji = rootSupportTotal >= 1.5 || strongRootCount >= 2;
  const deuksi = hourRootSupport >= 0.5 || hourStemSupport > 0;
  const deukse = stemSupportTotal >= 1.7 || rootSupportTotal >= 2.5;
  const supportCount = [deukryeong, deukji, deuksi, deukse].filter(Boolean).length;

  let label: StrengthLabel;
  if (score >= 8 || (supportCount >= 4 && score >= 6)) label = '태강';
  else if (supportCount >= 3 && score >= 4.5 && deukse) label = '신강';
  else if (supportCount >= 2 && score >= 2.5 && deukryeong) label = '중화신강';
  else if (score < 2.0 && !deukryeong && !deukse) label = '태약';
  else if (score < 2.0 && deukryeong) label = '신약';
  else if (supportCount >= 2 && score >= 4.0) label = '중화신강';
  else if (supportCount >= 1 && score >= 1.0) label = '중화신약';
  else if (supportCount >= 1 || score >= 0.5) label = '신약';
  else label = '태약';

  if (label === '태강' && hostilePressure >= 3.5) label = '중화신약';
  else if (label === '신강' && hostilePressure >= 2.2 && wangState !== '旺') label = '중화신강';
  else if (label === '중화신강' && hostilePressure >= 3.0 && !deukryeong) label = '중화신약';
  else if (label === '중화신약' && hostilePressure >= 5.0 && wangState === '囚') label = '태약';

  if (label === '중화신강' && hostilePressure >= 3.2 && !deukryeong && wangState === '休') {
    label = '중화신약';
  } else if (
    label === '중화신약' &&
    supportCount >= 3 &&
    deukji &&
    deuksi &&
    deukse &&
    score >= 3.8 &&
    hostilePressure <= 3.0
  ) {
    label = '중화신강';
  } else if (
    label === '중화신약' &&
    deukji &&
    deuksi &&
    deukse &&
    score >= 2.5 &&
    hostilePressure <= 2.5 &&
    wangState === '死'
  ) {
    label = '중화신강';
  }

  let level: StrengthLevel;
  if (label === '태강' || label === '신강') level = 'strong';
  else if (label === '신약' || label === '태약') level = 'weak';
  else level = 'neutral';

  return {
    level,
    label,
    score,
    hostilePressure,
    wangState,
    deukryeong,
    deukji,
    deuksi,
    deukse,
  };
}

// ---------- 물상파 로직 (독립 판단) ----------

/**
 * 물상파: 천간/지지의 물상(구체적 상징 이미지)을 분석하여 용신 판단
 * 격국용신파와 독립적으로, "상(象)"의 과부족을 기반으로 보완 물상을 결정
 *
 * 원리:
 * 1. 일간의 물상 이미지를 파악 (예: 丙=태양)
 * 2. 팔자 전체의 오행 물상 분포를 분석
 * 3. 일간 물상이 제 역할을 하기 위해 부족한 상(象)을 용신으로 결정
 * 4. 일간 물상을 훼손하는 과잉 상(象)을 기신으로 결정
 */
function determineMulsangYongsin(palja: Palja, _gyeokguk: Gyeokguk): Yongsin {
  const dayGan = palja.dayGan;
  const dayMulsang = GAN_MULSANG[dayGan];
  if (!dayMulsang) {
    return fallbackYongsin('물상용신');
  }

  // 팔자 전체의 오행 물상 분포 계산
  const ohaengCount: Record<Ohaeng, number> = { '목': 0, '화': 0, '토': 0, '금': 0, '수': 0 };
  const allGans = [palja.yearGan, palja.monthGan, palja.dayGan, palja.hourGan];
  const allJis = [palja.yearJi, palja.monthJi, palja.dayJi, palja.hourJi];

  for (const g of allGans) {
    if (g && GAN_MULSANG[g]) ohaengCount[GAN_MULSANG[g].ohaeng]++;
  }
  for (const j of allJis) {
    if (j && JI_MULSANG[j]) ohaengCount[JI_MULSANG[j].ohaeng]++;
  }

  // 일간 물상이 필요로 하는 상(象)의 존재 여부 분석
  const needsOhaeng = dayMulsang.needs;  // 일간이 근본적으로 필요한 오행
  const excessOhaeng = dayMulsang.excess; // 일간을 훼손하는 오행
  const dayOhaeng = dayMulsang.ohaeng;

  // 물상적 판단: 필요한 오행이 부족하거나 과잉 오행이 많은지
  const needsCount = ohaengCount[needsOhaeng];
  const excessCount = ohaengCount[excessOhaeng];
  const selfCount = ohaengCount[dayOhaeng];

  let yongOhaeng: Ohaeng;
  let giOhaeng: Ohaeng;
  let reasoning: string;

  if (needsCount === 0) {
    // 일간이 필요한 상이 전혀 없음 → 그 오행이 용신
    yongOhaeng = needsOhaeng;
    giOhaeng = excessOhaeng;
    reasoning = `${dayGan}(${dayMulsang.image})은 ${dayMulsang.nature}의 상이나, ` +
      `${needsOhaeng}의 상이 전혀 없어 ${needsOhaeng}이 절실하다. ` +
      `${excessOhaeng}의 상은 ${dayMulsang.image}를 훼손한다`;
  } else if (excessCount >= 3) {
    // 훼손하는 상이 과다 → 통관 또는 제거 오행이 용신
    // 통관: excess를 극하는 오행
    yongOhaeng = GEUK_BY[excessOhaeng];
    giOhaeng = excessOhaeng;
    reasoning = `${dayGan}(${dayMulsang.image})에 ${excessOhaeng}의 상(${getExcessImage(excessOhaeng)})이 과다(${excessCount}개)하여 ` +
      `${yongOhaeng}으로 제어해야 한다. ${excessOhaeng}이 기신`;
  } else if (selfCount >= 3) {
    // 자기 오행이 과다 → 설기 필요
    yongOhaeng = SAENGSAENG[dayOhaeng]; // 식상으로 설기
    giOhaeng = SAENG_BY[dayOhaeng];
    reasoning = `${dayGan}(${dayMulsang.image})의 상이 ${selfCount}개로 과다하여 ` +
      `${yongOhaeng}으로 설기해야 한다. 더 보태는 ${giOhaeng}이 기신`;
  } else if (selfCount <= 1 && needsCount >= 1) {
    // 자기 오행이 약하지만 필요 오행은 있음 → 비겁으로 힘 보충
    yongOhaeng = dayOhaeng;
    giOhaeng = SANGGEUK[dayOhaeng]; // 재성
    reasoning = `${dayGan}(${dayMulsang.image})의 상이 약하여(${selfCount}개) ` +
      `${dayOhaeng}(비겁)으로 뿌리를 강화해야 한다. ${giOhaeng}(재성)이 기신`;
  } else {
    // 기본: 필요 오행이 용신
    yongOhaeng = needsOhaeng;
    giOhaeng = excessOhaeng;
    reasoning = `${dayGan}(${dayMulsang.image})은 ${dayMulsang.nature}의 상으로, ` +
      `${needsOhaeng}의 보완이 자연스럽다. ${excessOhaeng}의 상은 경계 대상`;
  }

  // 물상적 서사 구성
  const dayImage = dayMulsang.image;
  const monthJiImage = JI_MULSANG[palja.monthJi]?.image ?? palja.monthJi;

  return {
    yongsin: `${yongOhaeng}`,
    gisin: `${giOhaeng}`,
    ohaeng: yongOhaeng,
    reasoning: `물상용신: ${dayImage}(${dayGan})이 ${monthJiImage}(${palja.monthJi}월) 환경에서 — ${reasoning}`,
  };
}

/** 과잉 오행의 대표 물상 이미지 */
function getExcessImage(ohaeng: Ohaeng): string {
  const images: Record<Ohaeng, string> = {
    '목': '나무/풀', '화': '불/열', '토': '흙/산', '금': '쇠/칼', '수': '물/비',
  };
  return images[ohaeng];
}

// ---------- 폴백 ----------

function fallbackYongsin(school: string): Yongsin {
  return {
    yongsin: '판별 불가',
    gisin: '판별 불가',
    ohaeng: '토',
    reasoning: `${school}: 일간 오행을 판별할 수 없어 용신을 결정할 수 없습니다.`,
  };
}

// ---------- 메인 함수 ----------

/**
 * 학파별로 용신/기신을 판별한다.
 *
 * @param palja - 사주팔자
 * @param gyeokguk - 격국 판별 결과
 * @param subSchool - 사주 하위 학파 (격국용신/조후/강약/물상)
 * @returns 용신 판별 결과
 */
export function determineYongsin(
  palja: Palja,
  gyeokguk: Gyeokguk,
  subSchool: SajuSubSchool,
): Yongsin {
  switch (subSchool) {
    case 'gyeokguk':
      return determineGyeokgukYongsin(palja, gyeokguk);
    case 'johu':
      return determineJohuYongsin(palja);
    case 'gangyak':
      return determineGangyakYongsin(palja);
    case 'mulsang':
      return determineMulsangYongsin(palja, gyeokguk);
    default: {
      const _exhaustive: never = subSchool;
      return fallbackYongsin(String(_exhaustive));
    }
  }
}

/**
 * 4개 하위 학파(격국/조후/강약/물상)의 용신 판정을 전부 계산해 나란히 반환한다.
 * 기본 학파 하나만 쓰면 학파 간 차이가 숨겨지므로, 리포트는 이 스프레드를 그대로 노출한다.
 */
export function determineYongsinBySchool(
  palja: Palja,
  gyeokguk: Gyeokguk,
): Record<SajuSubSchool, Yongsin> {
  return {
    gyeokguk: determineYongsin(palja, gyeokguk, 'gyeokguk'),
    johu: determineYongsin(palja, gyeokguk, 'johu'),
    gangyak: determineYongsin(palja, gyeokguk, 'gangyak'),
    mulsang: determineYongsin(palja, gyeokguk, 'mulsang'),
  };
}

/**
 * 점수제 강약 판정 공개 래퍼 — 득령(旺相休囚死)·득지(통근)·득세(투출) 가중 모델.
 * 오행 점유율 계량(measureOhaeng)과는 별개 알고리즘이며, 리포트에서 둘을 병기한다.
 */
export function assessDayganStrength(palja: Palja): StrengthAssessment | null {
  const dayOhaeng = getOhaengForGan(palja.dayGan);
  if (!dayOhaeng) return null;
  return assessDayganStrengthDetailed(palja, dayOhaeng);
}
