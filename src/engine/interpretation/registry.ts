// 패턴 레지스트리 — detector가 내보낼 수 있는 키의 유일한 사전.
// 조합키는 content DB(3층)와 동일한 ID 체계를 쓴다: saju/{category}/{pattern}.
// 레지스트리에 없는 키를 detector가 내보내면 runDetectors가 버린다 (품질 게이트).
// defaultText: 고정 fallback 문구. conclusion: 동적 문장의 결론형
// (renderPattern이 detector의 slots/figures로 만든 첫형 뒤에 붙인다).

import type { PatternMeta } from './types';

export const PATTERN_REGISTRY: Record<string, PatternMeta> = {
  // ---------- flow: 명식의 흐름 구조 ----------
  'saju/flow/sangsaeng-saengjae': {
    category: 'flow',
    priority: 20,
    title: '식상생재(食傷生財)',
    defaultText:
      '식상(기술·표현)이 재성(실물 재화)으로 흐르는 구조입니다. 전문성을 쌓을수록 수입으로 정산되는 형태의 일·사업이 명식의 방향에 맞습니다.',
    polarity: 'plus',
    conclusion: '기술·표현이 실물 수입으로 정산되는 구조로, 전문성을 쌓을수록 수입 규모가 같이 커지는 라인입니다.',
  },
  'saju/flow/gwanin-sangsaeng': {
    category: 'flow',
    priority: 21,
    title: '관인상생(官印相生)',
    defaultText:
      '관성(질서·책임)이 인성(학습·수용)으로 이어지는 구조입니다. 조직·자격·학문 쪽에서 체계적인 성장이 잘 붙습니다.',
    polarity: 'plus',
    conclusion: '조직·자격·학문에서 체계적으로 성장하는 라인으로, 안정 궤도의 성취가 잘 붙습니다.',
  },
  'saju/flow/jaesaeng-gwan': {
    category: 'flow',
    priority: 22,
    title: '재생관(財生官)',
    defaultText:
      '재성(자원)이 관성(지위)을 떠받치는 구조입니다. 자원 운용 능력이 지위와 명분으로 이어지는 경향입니다.',
    polarity: 'plus',
    conclusion: '자원 운용 능력이 지위와 명분으로 이어지는 구조로, 규모를 키울수록 책임도 같이 무거워집니다.',
  },
  'saju/flow/sangsaeng-jesal': {
    category: 'flow',
    priority: 23,
    title: '식상제살(食傷制殺)',
    defaultText:
      '식상이 편관(압박·규제)을 다스리는 구조입니다. 압박 상황을 기술과 표현으로 돌파하는 재주가 있습니다.',
    polarity: 'plus',
    conclusion: '압박 상황을 기술·표현으로 돌파하는 재주가 있어, 위기 구간일수록 가치가 올라갑니다.',
  },

  // ---------- imbalance: 과부족 경향 ----------
  'saju/imbalance/daymaster-strong': {
    category: 'imbalance',
    priority: 35,
    title: '신강(身强)',
    defaultText:
      '일간의 축(비겁+인성)이 두터운 신강입니다. 자기 기반이 튼튼한 대신, 식상·재성·관성으로 내보내는 활동(일·거래·성과)이 이 명식의 순환 원동력입니다.',
    polarity: 'neutral',
    conclusion: '자기 기반이 튼튼한 대신, 식상·재성·관성으로 내보내는 활동(일·거래·성과)이 순환의 원동력입니다.',
  },
  'saju/imbalance/daymaster-weak': {
    category: 'imbalance',
    priority: 35,
    title: '신약(身弱)',
    defaultText:
      '일간의 축(비겁+인성)이 얇은 신약입니다. 기반 보강(학습·수용·자기 축)이 상시 과제이며, 무리한 확장보다 인프라를 쌓는 방향이 맞습니다.',
    polarity: 'caution',
    conclusion: '기반 보강(학습·수용·자기 축)이 상시 과제이며, 무리한 확장보다 인프라를 쌓는 방향이 맞습니다.',
  },
  'saju/imbalance/ohaeng-skew': {
    category: 'imbalance',
    priority: 36,
    title: '오행 편중(五行偏重)',
    defaultText:
      '오행 분포의 격차가 큽니다. 굵은 오행이 인생의 주 테마를 만들고 얇은 오행 영역은 후천적 보완 주제가 됩니다.',
    polarity: 'caution',
    conclusion: '굵은 오행이 인생의 주 테마를 만들고, 얇은 오행 영역은 후천적 보완 주제가 됩니다.',
  },
  'saju/imbalance/ohaeng-missing': {
    category: 'imbalance',
    priority: 37,
    title: '결오행(缺五行)',
    defaultText:
      '명식에 없는 오행(결오행)이 있습니다. 해당 오행 영역(예: 금=정리·규율, 목=추진·확장)은 타고난 영역이 아니라 채워가는 주제로 읽습니다.',
    polarity: 'neutral',
    conclusion: '해당 오행 영역(예: 금=정리·규율, 목=추진·확장)은 타고난 영역이 아니라 채워가는 주제로 읽습니다.',
  },
  'saju/imbalance/insung-gwada': {
    category: 'imbalance',
    priority: 30,
    title: '인성 과다(印星過多)',
    defaultText:
      '인성이 과다합니다. 생각·학습·수용이 많아 실행보다 준비가 길어지기 쉽습니다. 산출물로 내보내는 비중을 의식적으로 키우는 게 좋습니다.',
    polarity: 'caution',
    conclusion: '실행보다 준비가 길어지기 쉬우니, 산출물로 내보내는 비중을 의식적으로 키우는 게 좋습니다.',
  },
  'saju/imbalance/bigeop-gwada': {
    category: 'imbalance',
    priority: 31,
    title: '비겁 편중(比劫偏重)',
    defaultText:
      '비겁(자아·경쟁)이 편중되어 있습니다. 독립심이 강한 대신 자원 분배와 협력에서 마찰이 생기기 쉽습니다.',
    polarity: 'caution',
    conclusion: '독립심이 강한 대신 자원 분배와 협력에서 마찰이 생기기 쉽습니다.',
  },
  'saju/imbalance/jaesung-nochul': {
    category: 'imbalance',
    priority: 32,
    title: '재성 노출(財星露出)',
    defaultText:
      '재성이 천간에 노출되어 있습니다. 재물 기회가 눈에 띄는 만큼 지키는 기술(분산·서면화)이 함께 필요합니다.',
    polarity: 'caution',
    conclusion: '재물 기회가 눈에 띄는 만큼 지키는 기술(분산·서면화)이 함께 필요합니다.',
  },
  'saju/imbalance/siksang-gwada': {
    category: 'imbalance',
    priority: 33,
    title: '식상 과다(食傷過多)',
    defaultText:
      '식상이 과다합니다. 표현·활동 폭이 넓지만 산으로 흩어지기 쉽습니다. 한 방향으로 모으는 절제가 성과를 좌우합니다.',
    polarity: 'caution',
    conclusion: '표현·활동 폭이 넓지만 산으로 흩어지기 쉬워, 한 방향으로 모으는 절제가 성과를 좌우합니다.',
  },
  'saju/imbalance/gwansung-gwada': {
    category: 'imbalance',
    priority: 34,
    title: '관성 과다(官星過多)',
    defaultText:
      '관성이 과다합니다. 책임과 압박을 짊어지는 구조로, 건강·스케줄 관리가 실질 과제입니다.',
    polarity: 'caution',
    conclusion: '책임과 압박을 짊어지는 구조로, 건강·스케줄 관리가 실질 과제입니다.',
  },

  // ---------- relation: 기둥 간 관계 ----------
  'saju/relation/gan-hap-gabgi': {
    category: 'relation',
    priority: 41,
    title: '갑기합(甲己合)',
    defaultText:
      '甲己의 천간합이 있습니다. 규범·조직과의 유대나 상대에 대한 끌림이 생겨 상황에 따라 결이 바뀌는 지점이 됩니다.',
    polarity: 'neutral',
    conclusion: '규범·조직과의 유대나 상대에 대한 끌림이 생겨, 상황에 따라 결이 바뀌는 지점이 됩니다.',
  },
  'saju/relation/gan-hap-eulgyeong': {
    category: 'relation',
    priority: 41,
    title: '을경합(乙庚合)',
    defaultText: '乙庚의 천간합이 있습니다. 서로 끌리는 속성을 만들어 상황에 따라 결을 바꾸는 지점이 됩니다.',
    polarity: 'neutral',
    conclusion: '서로 끌리는 속성을 만들어, 상황에 따라 결을 바꾸는 지점이 됩니다.',
  },
  'saju/relation/gan-hap-byeongsin': {
    category: 'relation',
    priority: 41,
    title: '병신합(丙辛合)',
    defaultText: '丙辛의 천간합이 있습니다. 서로 끌리는 속성을 만들어 상황에 따라 결을 바꾸는 지점이 됩니다.',
    polarity: 'neutral',
    conclusion: '서로 끌리는 속성을 만들어, 상황에 따라 결을 바꾸는 지점이 됩니다.',
  },
  'saju/relation/gan-hap-jeongim': {
    category: 'relation',
    priority: 41,
    title: '정임합(丁壬合)',
    defaultText: '丁壬의 천간합이 있습니다. 서로 끌리는 속성을 만들어 상황에 따라 결을 바꾸는 지점이 됩니다.',
    polarity: 'neutral',
    conclusion: '서로 끌리는 속성을 만들어, 상황에 따라 결을 바꾸는 지점이 됩니다.',
  },
  'saju/relation/gan-hap-mugye': {
    category: 'relation',
    priority: 41,
    title: '무계합(戊癸合)',
    defaultText: '戊癸의 천간합이 있습니다. 서로 끌리는 속성을 만들어 상황에 따라 결을 바꾸는 지점이 됩니다.',
    polarity: 'neutral',
    conclusion: '서로 끌리는 속성을 만들어, 상황에 따라 결을 바꾸는 지점이 됩니다.',
  },
  'saju/relation/jiji-hap': {
    category: 'relation',
    priority: 42,
    title: '지지 합(支合)',
    defaultText: '지지 합이 있습니다. 해당 자리의 속성이 결합되어 안정·결속의 기운이 형성됩니다.',
    polarity: 'plus',
    conclusion: '해당 자리의 속성이 결합되어 안정·결속의 기운이 형성됩니다.',
  },
  'saju/relation/jiji-chung': {
    category: 'relation',
    priority: 43,
    title: '지지 충(支沖)',
    defaultText:
      '지지 충이 있습니다. 해당 자리(생활 영역)의 변동·이동·정리가 주기적으로 일어나는 성향입니다.',
    polarity: 'caution',
    conclusion: '해당 자리(생활 영역)의 변동·이동·정리가 주기적으로 일어나는 성향입니다.',
  },
  'saju/relation/jiji-hyeong': {
    category: 'relation',
    priority: 44,
    title: '지지 형(支刑)',
    defaultText: '지지 형이 있습니다. 해당 자리에서 규칙과 약속을 어겼을 때 비용이 커지는 구조입니다.',
    polarity: 'caution',
    conclusion: '해당 자리에서 규칙과 약속을 어겼을 때 비용이 커지는 구조입니다.',
  },
  'saju/relation/jiji-hae': {
    category: 'relation',
    priority: 45,
    title: '지지 해(支害)',
    defaultText:
      '지지 해가 있습니다. 해당 자리 간의 미세한 마찰이 반복되기 쉬워 형식적 합의(서면·계약)로 정리하는 게 좋습니다.',
    polarity: 'caution',
    conclusion: '미세한 마찰이 반복되기 쉬워, 형식적 합의(서면·계약)로 정리하는 게 좋습니다.',
  },
  'saju/relation/wonjin': {
    category: 'relation',
    priority: 46,
    title: '원진(元辰)',
    defaultText:
      '원진이 있습니다. 끌리다가 다시 귀찮게 느껴지는 밀당 구조로, 큰 다툼보다 은근한 마찰을 오래 끌기 쉽습니다.',
    polarity: 'caution',
    conclusion: '큰 다툼보다 은근한 마찰을 오래 끌기 쉬우니, 대면·소통 방식을 미리 정해두는 게 좋습니다.',
  },
  'saju/relation/samhap': {
    category: 'relation',
    priority: 40,
    title: '삼합(三合)',
    defaultText:
      '세 지지가 생왕묘 삼합을 이룹니다. 한 오행으로 뭉치는 강한 결속이라 해당 오행 기운이 명식의 주축으로 크게 작동합니다.',
    polarity: 'plus',
    conclusion: '세 지지가 한 국(局)으로 뭉치는 강한 결속으로, 해당 오행 기운이 명식의 주축으로 크게 작동합니다.',
  },
  'saju/relation/banghap': {
    category: 'relation',
    priority: 40,
    title: '방합(方合)',
    defaultText:
      '세 지지가 같은 방향(계절)의 방합을 이룹니다. 해당 오행 기운이 한 방향으로 쏠려 계절의 힘이 원국 안에서 재현됩니다.',
    polarity: 'plus',
    conclusion: '해당 오행 기운이 한 방향으로 쏠려, 계절의 힘이 원국 안에서 재현되는 강한 구조입니다.',
  },

  // ---------- cross: 요소 교차 해석 (요소 단위로는 나올 수 없는 깊이) ----------
  'saju/cross/gongmang-bigeop': {
    category: 'cross',
    priority: 12,
    title: '비겁 공망(比劫空亡)',
    defaultText:
      '비겁 자리가 공망입니다. 경쟁 구도 자체에 큰 흥미가 없어 자기 페이스를 고수하는 편입니다.',
    polarity: 'neutral',
    conclusion: '경쟁 구도 자체에 큰 흥미가 없어 자기 페이스를 고수하는 편입니다.',
  },
  'saju/cross/gongmang-siksang': {
    category: 'cross',
    priority: 12,
    title: '식상 공망(食傷空亡)',
    defaultText:
      '식상 자리가 공망입니다. 표현의 욕구는 있으나 발표·공개에 대한 무게감이 섞여 늦게 나오기도 합니다.',
    polarity: 'neutral',
    conclusion: '표현의 욕구는 있으나 발표·공개에 대한 무게감이 섞여 늦게 나오기도 합니다.',
  },
  'saju/cross/gongmang-jaesung': {
    category: 'cross',
    priority: 12,
    title: '재성 공망(財星空亡)',
    defaultText:
      '재성 자리가 공망입니다. 재물의 눈은 있으나 소유·유지에 대한 집착이 낮아 흘러보내는 성향이 섞입니다.',
    polarity: 'neutral',
    conclusion: '재물의 눈은 있으나 소유·유지에 대한 집착이 낮아 흘러보내는 성향이 섞입니다.',
  },
  'saju/cross/gongmang-gwansung': {
    category: 'cross',
    priority: 12,
    title: '관성 공망(官星空亡)',
    defaultText:
      '관성 자리가 공망입니다. 조직 내 지위 자체보다 실질적 성과에 동기가 쉽게 기울고, 조직 구속 생활에서 공허함을 느끼기 쉽습니다.',
    polarity: 'neutral',
    conclusion: '지위 자체보다 실질 성과에 동기가 기울고, 조직 구속 생활에서 공허함을 느끼기 쉽습니다.',
  },
  'saju/cross/gongmang-insung': {
    category: 'cross',
    priority: 12,
    title: '인성 공망(印星空亡)',
    defaultText:
      '인성 자리가 공망입니다. 학문·자격의 동기가 실용으로 향하고, 형식적 학습에 큰 의미를 못 느낍니다.',
    polarity: 'neutral',
    conclusion: '학문·자격의 동기가 실용으로 향하고, 형식적 학습에 큰 의미를 못 느낍니다.',
  },
  'saju/cross/gyeokguk-yongsin-fit': {
    category: 'cross',
    priority: 11,
    title: '격국·용신 동심(格用同軸)',
    defaultText:
      '격국과 용신이 같은 축입니다. 명식의 뼈대와 활용점이 일치해 방향 설정이 단순해집니다.',
    polarity: 'plus',
    conclusion: '명식의 뼈대와 활용점이 일치해 방향 설정이 단순해집니다.',
  },
  'saju/cross/gyeokguk-yongsin-split': {
    category: 'cross',
    priority: 11,
    title: '격국·용신 이축(格用異軸)',
    defaultText:
      '격국과 용신이 다른 축입니다. 격(사회적 뼈대)과 용(개인적 활용점)을 모두 관리하는 이중 구조로, 어느 한쪽 몰빵보다 균형이 답입니다.',
    polarity: 'neutral',
    conclusion: '격(사회적 뼈대)과 용(개인적 활용점)을 모두 관리하는 이중 구조로, 어느 한쪽 몰빵보다 균형이 답입니다.',
  },
  'saju/cross/sinsal-장성-siksang': {
    category: 'cross',
    priority: 13,
    title: '장성+식상(將星食傷)',
    defaultText: '일지 장성에 식상입니다. 기술·전문 분야에서 머리로서 인정받는 조합입니다.',
    polarity: 'plus',
    conclusion: '기술·전문 분야에서 머리로서 인정받는 조합입니다.',
  },
  'saju/cross/sinsal-장성-gwansung': {
    category: 'cross',
    priority: 13,
    title: '장성+관성(將星官星)',
    defaultText: '장성에 관성입니다. 위계 질서 안에서 리더십이 떠받쳐지는 조합입니다.',
    polarity: 'plus',
    conclusion: '위계 질서 안에서 리더십이 떠받쳐지는 조합입니다.',
  },
  'saju/cross/sinsal-화개-insung': {
    category: 'cross',
    priority: 13,
    title: '화개+인성(華蓋印星)',
    defaultText: '화개에 인성입니다. 학문·연구·정신적 탐구에 깊은 재능의 표적입니다.',
    polarity: 'plus',
    conclusion: '학문·연구·정신적 탐구에 깊은 재능의 표적입니다.',
  },
  'saju/cross/sinsal-화개-siksang': {
    category: 'cross',
    priority: 13,
    title: '화개+식상(華蓋食傷)',
    defaultText: '화개에 식상입니다. 예술·콘텐츠·기술 창작 쪽 감각이 강합니다.',
    polarity: 'plus',
    conclusion: '예술·콘텐츠·기술 창작 쪽 감각이 강합니다.',
  },
  'saju/cross/sinsal-화개-bigeop': {
    category: 'cross',
    priority: 13,
    title: '화개+비겁(華蓋比劫)',
    defaultText: '화개에 비겁입니다. 혼자 파는 학문·기술의 독립 재능입니다.',
    polarity: 'neutral',
    conclusion: '혼자 파는 학문·기술의 독립 재능입니다.',
  },
  'saju/cross/sinsal-도화-jaesung': {
    category: 'cross',
    priority: 13,
    title: '도화+재성(桃花財星)',
    defaultText: '도화에 재성입니다. 매력·인기가 수입 경로가 되는 조합입니다.',
    polarity: 'plus',
    conclusion: '매력·인기가 수입 경로가 되는 조합입니다.',
  },
  'saju/cross/sinsal-역마-jaesung': {
    category: 'cross',
    priority: 13,
    title: '역마+재성(驛馬財星)',
    defaultText: '역마에 재성입니다. 이동·무역·교통과 결부된 재물 활동이 잘 붙습니다.',
    polarity: 'plus',
    conclusion: '이동·무역·교통과 결부된 재물 활동이 잘 붙습니다.',
  },
  'saju/cross/sinsal-역마-siksang': {
    category: 'cross',
    priority: 13,
    title: '역마+식상(驛馬食傷)',
    defaultText: '역마에 식상입니다. 움직이며 표현하는 활동(강의·홍보·현장)에 재능이 있습니다.',
    polarity: 'plus',
    conclusion: '움직이며 표현하는 활동(강의·홍보·현장)에 재능이 있습니다.',
  },

  // ---------- johu: 조후(調候) — 계절×일간 균형 ----------
  'saju/johu/season-support': {
    category: 'johu',
    priority: 14,
    title: '계절 후원(季節扶援)',
    defaultText:
      '계절의 왕 기운이 일간을 생합니다. 원국의 장단점이 계절의 도움으로 한층 부드러워지는 조후입니다.',
    polarity: 'plus',
    conclusion: '원국의 장단점이 계절의 도움으로 한층 부드러워지는 조후입니다.',
  },
  'saju/johu/season-command': {
    category: 'johu',
    priority: 14,
    title: '당령 일간(當令日干)',
    defaultText:
      '일간이 계절의 권(權)을 쥔 당령 구간입니다. 시기적으로 자기 주체성이 강해지는 조후입니다.',
    polarity: 'plus',
    conclusion: '시기적으로 자기 주체성이 강해지는 조후로, 주도권이 일간 쪽에 실립니다.',
  },
  'saju/johu/season-pressure': {
    category: 'johu',
    priority: 14,
    title: '계절 압박(季節壓迫)',
    defaultText:
      '계절의 왕 기운이 일간을 극합니다. 태생 기질보다 환경 적응이 먼저 과제로 떠오르는 조후입니다.',
    polarity: 'caution',
    conclusion: '태생 기질보다 환경 적응이 먼저 과제로 떠오르는 조후입니다.',
  },
  'saju/johu/season-control': {
    category: 'johu',
    priority: 14,
    title: '계절 제어(季節制御)',
    defaultText:
      '일간이 계절의 왕 기운을 극합니다. 환경을 통제·운용하는 쪽에 힘이 실리는 조후입니다.',
    polarity: 'neutral',
    conclusion: '환경을 통제·운용하는 쪽에 힘이 실리는 조후로, 큰 흐름을 다루는 일이 잘 맞습니다.',
  },
  'saju/johu/season-drain': {
    category: 'johu',
    priority: 14,
    title: '계절 배출(季節排出)',
    defaultText:
      '일간이 계절의 왕 기운을 생합니다. 열정·산출이 많지만 축전(貯電)이 필요한 조후입니다.',
    polarity: 'caution',
    conclusion: '열정·산출이 많지만 축전(貯電)이 필요한 조후로, 회복과 비축의 루틴이 함께 가야 합니다.',
  },

  // ---------- timing: 대운 시점 ----------
  'saju/timing/daeun-fit': {
    category: 'timing',
    priority: 50,
    title: '용신 대운(用神大運)',
    defaultText:
      '현재 대운이 용신 오행입니다. 명식의 활용점이 작동하는 구간으로, 이 시기의 세운 방향성이 크게 증폭됩니다.',
    polarity: 'plus',
    conclusion: '명식의 활용점이 작동하는 구간으로, 이 시기의 세운 방향성이 크게 증폭됩니다.',
  },
  'saju/timing/daeun-tension': {
    category: 'timing',
    priority: 50,
    title: '기신 대운(忌神大運)',
    defaultText:
      '현재 대운이 기신 방향입니다. 기본기 점검과 규모 축소 관리가 맞는 구간입니다.',
    polarity: 'caution',
    conclusion: '기본기 점검과 규모 축소 관리가 맞는 구간입니다.',
  },
  'saju/timing/daeun-neutral': {
    category: 'timing',
    priority: 50,
    title: '중립 대운(中立大運)',
    defaultText:
      '현재 대운이 용신·기신 어느 쪽도 아닌 중간 오행입니다. 판이 크게 열리거나 닫히기보다 유지·정비의 구간입니다.',
    polarity: 'neutral',
    conclusion: '판이 크게 열리거나 닫히기보다 유지·정비의 구간입니다.',
  },
  'saju/timing/daeun-seun-fit': {
    category: 'timing',
    priority: 49,
    title: '대운·세운 동향(大運歲運同向)',
    defaultText:
      '현재 대운과 세운이 모두 용신 방향입니다. 큰 판과 연 판이 같은 방향을 가리키는 구간입니다.',
    polarity: 'plus',
    conclusion: '큰 판과 연 판이 같은 방향을 가리키는 구간으로, 그 해의 결정이 대운 방향을 고정할 수 있습니다.',
  },
  'saju/timing/daeun-seun-tension': {
    category: 'timing',
    priority: 49,
    title: '대운·세운 동압(大運歲運同壓)',
    defaultText:
      '현재 대운과 세운이 모두 기신 방향입니다. 큰 판과 연 판이 함께 무거운 구간입니다.',
    polarity: 'caution',
    conclusion: '확장보다 리스크 정리와 체력 관리가 우선인 구간입니다.',
  },
};

export function isRegisteredPattern(key: string): boolean {
  return Object.prototype.hasOwnProperty.call(PATTERN_REGISTRY, key);
}
