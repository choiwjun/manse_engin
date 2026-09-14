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

  // ---------- combo: 두 구조 조건의 교차 (전문가가 만세력에서 하나하나 조합하는 깊이) ----------
  'saju/combo/sangsaeng-saengjae--daymaster-weak': {
    category: 'combo',
    priority: 9,
    title: '생재×신약(生財身弱)',
    defaultText:
      '기술로 돈을 버는 흐름이 있으나 일간 축이 얇습니다. 혼자 다 하기보다 시스템·파트너와 함께 굴리는 확장이 안전합니다.',
    polarity: 'neutral',
    conclusion: '버는 라인은 분명하나 체력·기반이 따라가야 하니, 파트너·시스템을 붙인 확장이 안전합니다.',
  },
  'saju/combo/sangsaeng-saengjae--daymaster-strong': {
    category: 'combo',
    priority: 9,
    title: '생재×신강(生財身强)',
    defaultText:
      '만드는 힘과 벌리는 힘이 모두 갖춰진 구조입니다. 산출(식상)과 수입(재성)을 같이 키우는 것이 명식의 최적 동선입니다.',
    polarity: 'plus',
    conclusion: '만드는 힘과 벌리는 힘이 모두 갖춰져, 산출과 수입을 같이 키우는 것이 최적 동선입니다.',
  },
  'saju/combo/jaesung-nochul--bigeop-gwada': {
    category: 'combo',
    priority: 9,
    title: '재노출×비겁(財露比劫)',
    defaultText:
      '노출된 재성에 몰려든 비겁 — 보이는 수입에 경쟁자·나눠야 할 손이 많은 구조입니다. 서면화와 분배 규칙이 곧 방어입니다.',
    polarity: 'caution',
    conclusion: '보이는 수입에 나눠야 할 손이 많은 구조라, 서면화와 분배 규칙이 곧 방어입니다.',
  },
  'saju/combo/gwanin-sangsaeng--insung-gwada': {
    category: 'combo',
    priority: 9,
    title: '관인×인과다(官印印多)',
    defaultText:
      '성장 라인(관인상생) 위에 과다한 인성이 쌓여, 준비와 자격 취득이 길어지기 쉽습니다. 배움을 곧바로 산출로 전환하는 통로를 열어두세요.',
    polarity: 'caution',
    conclusion: '배움의 통로가 넓은 만큼 끝없이 준비하게 되기 쉬우니, 배운 것을 곧 산출로 전환하는 규칙이 필요합니다.',
  },
  'saju/combo/daymaster-weak--daeun-fit': {
    category: 'combo',
    priority: 9,
    title: '신약×용신운(身弱用神運)',
    defaultText:
      '얇은 일간 축이 용신 대운의 도움을 받는 구간입니다. 평소라면 무리인 확장도 이 시기에는 허용 범위가 넓어집니다.',
    polarity: 'plus',
    conclusion: '평소라면 무리인 확장도 이 구간에는 허용 범위가 넓어지니, 이 시기를 놓치지 않는 설계가 좋습니다.',
  },
  'saju/combo/daymaster-weak--daeun-tension': {
    category: 'combo',
    priority: 9,
    title: '신약×기신운(身弱忌神運)',
    defaultText:
      '얇은 일간 축이 기신 대운의 무게를 맞은 구간입니다. 소모 관리가 최우선이며, 무리한 단독 결행은 비용이 큽니다.',
    polarity: 'caution',
    conclusion: '소모 관리가 최우선인 구간으로, 무리한 단독 결행은 비용이 크니 협력과 복기를 선택하세요.',
  },
  'saju/combo/daymaster-strong--daeun-fit': {
    category: 'combo',
    priority: 9,
    title: '신강×용신운(身强用神運)',
    defaultText:
      '두터운 일간 축이 용신 대운과 힘을 합한 구간입니다. 기반이 판의 도움까지 얻어, 공격적 확장의 조건이 갖춰졌습니다.',
    polarity: 'plus',
    conclusion: '기반과 판의 도움이 겹친 구간으로, 준비된 확장이라면 조건이 가장 좋을 때입니다.',
  },
  'saju/combo/daymaster-strong--daeun-tension': {
    category: 'combo',
    priority: 9,
    title: '신강×기신운(身强忌神運)',
    defaultText:
      '두터운 일간 축이 기신 대운과 마주 선 구간입니다. 기반은 튼튼해 손실 자체는 견디지만, 확장 욕심이 판과 부딪히기 쉽습니다.',
    polarity: 'neutral',
    conclusion: '기반이 튼튼해 견디는 힘은 충분하나, 판과 부딪히는 확장은 손해가 크니 유지에 무게를 두세요.',
  },
  'saju/combo/gwansung-gwada--daymaster-weak': {
    category: 'combo',
    priority: 9,
    title: '관과다×신약(官多身弱)',
    defaultText:
      '과다한 관성(책임·압박)이 얇은 일간 축을 누르는 구조입니다. 번아웃 대비가 최우선이며, 책임을 나눌 통로를 만들어야 합니다.',
    polarity: 'caution',
    conclusion: '책임이 능력보다 빨리 커지는 구조로, 번아웃 대비와 책임 분담 통로가 최우선입니다.',
  },
  'saju/combo/insung-gwada--daymaster-strong': {
    category: 'combo',
    priority: 9,
    title: '인과다×신강(印多身强)',
    defaultText:
      '넓은 인성의 배움이 두터운 기반 위에 더 쌓이는 구조입니다. 축적은 이미 충분하니, 이론을 실행과 산출로 바꾸는 전환이 성과를 결정합니다.',
    polarity: 'neutral',
    conclusion: '축적은 이미 충분하니, 배움을 실행·산출로 바꾸는 전환 속도가 성과를 결정합니다.',
  },
  'saju/combo/jaesung-nochul--daymaster-weak': {
    category: 'combo',
    priority: 9,
    title: '재노출×신약(財露身弱)',
    defaultText:
      '노출된 재성이 얇은 기반 앞에 놓인 구조입니다. 기회는 많이 보이지만 감당하는 힘이 먼저 고갈되기 쉬워, 선택과 포기가 실력입니다.',
    polarity: 'caution',
    conclusion: '기회는 많이 보이지만 감당하는 힘이 먼저 고갈되기 쉬우니, 선택과 포기가 실력입니다.',
  },
  'saju/combo/gongmang-jaesung--daymaster-weak': {
    category: 'combo',
    priority: 9,
    title: '재공망×신약(財空身弱)',
    defaultText:
      '공망으로 빈 재성 자리에 얇은 기반이 겹친 구조입니다. 재물에 대한 집착이 낮은 건 오히려 이득이고, 현금흐름 설계가 자산 설계보다 먼저입니다.',
    polarity: 'neutral',
    conclusion: '재물 집착이 낮은 건 이득이지만, 현금흐름 설계를 먼저 잡아두는 게 필요합니다.',
  },
  'saju/combo/daymaster-weak--johu-pressure': {
    category: 'combo',
    priority: 9,
    title: '신약×계절압박(身弱季壓)',
    defaultText:
      '얇은 일간 축이 계절의 압박까지 겹친 구조입니다. 환경(직장·도시·관계) 선택이 곧 생존 전략이며, 불리한 환경에서 버티는 것보다 맞는 환경으로 옮기는 게 맞습니다.',
    polarity: 'caution',
    conclusion: '환경 선택이 곧 전략이 되는 구조로, 버티기보다 맞는 환경으로 옮기는 쪽이 맞습니다.',
  },
  'saju/combo/daymaster-strong--johu-support': {
    category: 'combo',
    priority: 9,
    title: '신강×계절후원(身强季扶)',
    defaultText:
      '두터운 일간 축에 계절의 후원까지 겹친 구조입니다. 기반·환경이 모두 도와주니 남는 자원을 어디로 내보낼지가 설계의 전부입니다.',
    polarity: 'plus',
    conclusion: '기반과 환경이 모두 도와주니, 남는 자원을 어디로 내보낼지가 설계의 전부입니다.',
  },
  'saju/combo/wonjin--jiji-chung': {
    category: 'combo',
    priority: 9,
    title: '원진×충(元辰沖)',
    defaultText:
      '원진과 충이 한 명식 안에 공존하는 구조입니다. 관계·영역의 마찰이 크고 작게 번갈아 옵니다. 큰 결단보다 주기적 점검과 거리 조절이 유지법입니다.',
    polarity: 'caution',
    conclusion: '마찰이 크고 작게 번갈아 오는 구조라, 큰 결단보다 주기적 점검과 거리 조절이 유지법입니다.',
  },
  'saju/combo/sangsaeng-saengjae--siksang-gwada': {
    category: 'combo',
    priority: 9,
    title: '생재×식과다(生財食多)',
    defaultText:
      '생재의 흐름이 살아 있지만 식상이 과다해 관심사가 산으로 흩어집니다. 흐름 자체는 좋으니, 어느 기술 하나를 골라 깊게 파는지가 수입 규모를 정합니다.',
    polarity: 'caution',
    conclusion: '흐름 자체는 좋으니, 어느 기술 하나를 골라 깊게 파는지가 수입 규모를 정합니다.',
  },

  // ---------- combo 3차: 흐름×강약 / 결핍×강약 / 관계×강약 ----------
  'saju/combo/jaesaeng-gwan--daymaster-weak': {
    category: 'combo',
    priority: 9,
    title: '재생관×신약(財生官身弱)',
    defaultText:
      '자원이 지위를 떠받치는 구조는 있으나 일간이 약해 그 흐름을 감당하기 어렵습니다. 지위를 먼저 키우기보다 기반을 먼저 다지는 것이 순서입니다.',
    polarity: 'caution',
    conclusion: '지위를 먼저 키우기보다 기반을 먼저 다지는 것이 순서입니다.',
  },
  'saju/combo/sangsaeng-jesal--daymaster-strong': {
    category: 'combo',
    priority: 9,
    title: '식상제살×신강(食傷制殺身强)',
    defaultText:
      '압박을 제압할 힘이 충분한 구조입니다. 식상의 제압력이 일간의 강함과 맞물려, 어려운 국면을 오히려 실력으로 돌파하는 힘이 있습니다.',
    polarity: 'plus',
    conclusion: '압박을 실력으로 돌파하는 힘이 있으니, 어려운 국면을 피하기보다 정면으로 나서는 것이 이 구조의 활용법입니다.',
  },
  'saju/combo/ohaeng-missing--daymaster-weak': {
    category: 'combo',
    priority: 9,
    title: '오행결핍×신약(五行缺身弱)',
    defaultText:
      '오행이 결핍된 데다 일간마저 약한 구조입니다. 균형도 없고 힘도 부족하니, 무리한 보충보다 결핍의 영역을 인정하고 최소 동작으로 버티는 것이 먼저입니다.',
    polarity: 'caution',
    conclusion: '무리한 보충보다 결핍을 인정하고 최소 동작으로 버티는 것이 먼저입니다.',
  },
  'saju/combo/jiji-chung--daymaster-weak': {
    category: 'combo',
    priority: 9,
    title: '충×신약(沖身弱)',
    defaultText:
      '충의 마찰이 있는데 일간이 약해 휘둘리기 쉬운 구조입니다. 충이 일어나는 자리의 관계·영역을 피하기보다, 충의 주기를 파악하고 미리 거리를 두는 것이 유지법입니다.',
    polarity: 'caution',
    conclusion: '충의 주기를 파악하고 미리 거리를 두는 것이 유지법입니다.',
  },
  'saju/combo/bigeop-gwada--daymaster-weak': {
    category: 'combo',
    priority: 9,
    title: '비겁과다×신약(比劫過多身弱)',
    defaultText:
      '자기 세력이 많은데도 일간이 약한 구조입니다. 경쟁만 치열하고 실속은 없는 상태이니, 세력을 늘리기보다 기존 세력 안에서 실질을 챙기는 것이 중요합니다.',
    polarity: 'caution',
    conclusion: '세력을 늘리기보다 기존 세력 안에서 실질을 챙기는 것이 중요합니다.',
  },
  'saju/combo/gwanin-sangsaeng--daymaster-strong': {
    category: 'combo',
    priority: 9,
    title: '관인상생×신강(官印相生生强)',
    defaultText:
      '권위와 학습의 흐름이 살아 있고 일간도 강한 구조입니다. 제도·조직·자격의 단계를 밟는 데 유리하니, 흐름을 타고 올라가는 것이 이 구조의 활용입니다.',
    polarity: 'plus',
    conclusion: '제도·조직·자격의 단계를 밟는 데 유리하니, 흐름을 타고 올라가는 것이 활용법입니다.',
  },
  'saju/combo/gongmang-gwansung--daymaster-weak': {
    category: 'combo',
    priority: 9,
    title: '관공망×신약(官空亡身弱)',
    defaultText:
      '지위·규범의 자리가 비어 있는데 일간마저 약한 구조입니다. 관성의 허상에 휘둘리지 않으려면, 실체 없는 규범보다 실질적인 역할을 먼저 잡는 것이 중요합니다.',
    polarity: 'caution',
    conclusion: '실체 없는 규범보다 실질적인 역할을 먼저 잡는 것이 중요합니다.',
  },
  'saju/combo/siksang-gwada--daymaster-weak': {
    category: 'combo',
    priority: 9,
    title: '식과다×신약(食過多身弱)',
    defaultText:
      '표현·생산이 과다한데 일간이 약한 구조입니다. 아이디어는 넘치나 감당할 힘이 부족하니, 만드는 양을 줄이고 완성도를 높이는 쪽이 이 구조의 균형입니다.',
    polarity: 'caution',
    conclusion: '만드는 양을 줄이고 완성도를 높이는 쪽이 균형입니다.',
  },

  // ---------- combo 4차: 흐름×대운 / 관계×대운 / 강약×세운 ----------
  'saju/combo/sangsaeng-saengjae--daeun-fit': {
    category: 'combo',
    priority: 9,
    title: '생재×용신운(生財用神運)',
    defaultText:
      '재물을 만드는 흐름이 살아 있는데 대운마저 용신 방향입니다. 흐름과 시기가 같은 방향을 가리키는 구간이라, 재물 쪽 결정은 이 구간에서 크게 가져가도 무리가 적습니다.',
    polarity: 'plus',
    conclusion: '흐름과 시기가 같은 방향을 가리키는 구간으로, 재물 쪽 결정은 크게 가져가도 무리가 적습니다.',
  },
  'saju/combo/sangsaeng-saengjae--daeun-tension': {
    category: 'combo',
    priority: 9,
    title: '생재×기신운(生財忌神運)',
    defaultText:
      '재물을 만드는 흐름은 있으나 대운이 기신 방향입니다. 흐름과 시기가 어긋나는 구간이라, 재물 쪽 확장은 보류하고 기존 흐름의 질을 다지는 것이 우선입니다.',
    polarity: 'caution',
    conclusion: '흐름과 시기가 어긋나는 구간으로, 재물 확장보다 기존 흐름의 질을 다지는 것이 우선입니다.',
  },
  'saju/combo/gwanin-sangsaeng--daeun-fit': {
    category: 'combo',
    priority: 9,
    title: '관인상생×용신운(官印相生用神運)',
    defaultText:
      '권위와 학습이 서로 돕는 흐름에 대운이 용신 방향입니다. 제도·조직·자격의 단계를 밟는 데 시기까지 맞물린 구간이라, 승진·자격·진학 같은 계단식 도전이 유리합니다.',
    polarity: 'plus',
    conclusion: '제도·조직·자격의 단계를 밟는 데 시기까지 맞물린 구간입니다.',
  },
  'saju/combo/gwanin-sangsaeng--daeun-tension': {
    category: 'combo',
    priority: 9,
    title: '관인상생×기신운(官印相生忌神運)',
    defaultText:
      '권위와 학습의 흐름은 있으나 대운이 기신 방향입니다. 제도·조직의 단계를 밟는 데 시기가 어긋나는 구간이라, 승진·자격 도전은 보류하고 실력 축적에 집중하는 것이 좋습니다.',
    polarity: 'caution',
    conclusion: '제도·조직의 단계를 밟는 데 시기가 어긋나는 구간으로, 실력 축적에 집중하는 것이 좋습니다.',
  },
  'saju/combo/jiji-chung--daeun-tension': {
    category: 'combo',
    priority: 9,
    title: '충×기신운(沖忌神運)',
    defaultText:
      '충의 마찰이 있는데 대운이 기신 방향입니다. 마찰이 무거운 시기에 겹치는 구간이라, 관계·영역의 충돌을 피하기보다 주기를 파악하고 미리 거리를 두는 것이 유지법입니다.',
    polarity: 'caution',
    conclusion: '마찰이 무거운 시기에 겹치는 구간으로, 주기를 파악하고 미리 거리를 두는 것이 유지법입니다.',
  },
  'saju/combo/wonjin--daeun-tension': {
    category: 'combo',
    priority: 9,
    title: '원진×기신운(怨嗔忌神運)',
    defaultText:
      '원진의 속마찰이 있는데 대운이 기신 방향입니다. 겉으로 드러나지 않는 마찰이 무거운 시기에 겹치는 구간이라, 관계의 큰 결단보다 정기적 점검과 거리 조절이 중요합니다.',
    polarity: 'caution',
    conclusion: '겉으로 드러나지 않는 마찰이 무거운 시기에 겹치는 구간입니다.',
  },
  'saju/combo/daymaster-weak--seun-fit': {
    category: 'combo',
    priority: 9,
    title: '신약×세운용신(身弱歲運用神)',
    defaultText:
      '일간이 약한데 세운이 용신 방향입니다. 약한 몸에 연운의 도움이 오는 구간이라, 올해의 결정은 평소보다 조금 크게 가져가도 버틸 만합니다.',
    polarity: 'plus',
    conclusion: '약한 몸에 연운의 도움이 오는 구간으로, 올해의 결정은 평소보다 조금 크게 가져가도 됩니다.',
  },
  'saju/combo/daymaster-strong--seun-tension': {
    category: 'combo',
    priority: 9,
    title: '신강×세운기신(身强歲運忌神)',
    defaultText:
      '일간이 강한데 세운이 기신 방향입니다. 강한 힘에 연운의 압박이 오는 구간이라, 올해는 확장보다 기존 것의 정리와 보존이 우선입니다.',
    polarity: 'caution',
    conclusion: '강한 힘에 연운의 압박이 오는 구간으로, 확장보다 정리와 보존이 우선입니다.',
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
