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
      '식상(기술·표현)이 재성(실물 재화)으로 흐르는 구조로 읽습니다. 전문성과 수입의 연결 가능성을 살피되, 실제 일·사업의 선택은 시장·역할·조건을 함께 확인합니다.',
    polarity: 'plus',
    conclusion: '기술·표현과 실물 수입의 연결을 살펴볼 수 있는 구조로, 실제 결과는 시장·역할·조건을 함께 확인합니다.',
  },
  'saju/flow/gwanin-sangsaeng': {
    category: 'flow',
    priority: 21,
    title: '관인상생(官印相生)',
    defaultText:
      '관성(질서·책임)이 인성(학습·수용)으로 이어지는 구조입니다. 조직·자격·학문 쪽의 체계적 성장 흐름을 살펴볼 수 있습니다.',
    polarity: 'plus',
    conclusion: '조직·자격·학문에서 체계적으로 성장하는 흐름으로 읽을 수 있으나, 실제 성취는 요건·준비도·환경을 함께 확인합니다.',
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
  'saju/flow/insung-saeng-bigeop': {
    category: 'flow',
    priority: 24,
    title: '인성생비겁(印星生比劫)',
    defaultText: '인성의 학습·수용이 비겁의 자기 축으로 이어지는 흐름으로 참고합니다. 배운 것을 자기 기준과 실행 기반으로 정리하는 과정을 살펴봅니다.',
    polarity: 'plus',
    conclusion: '학습·수용이 자기 기준으로 이어지는 흐름을 살펴보며, 실제 성장은 실행과 피드백을 함께 확인합니다.',
  },
  'saju/flow/bigeop-saeng-siksang': {
    category: 'flow',
    priority: 25,
    title: '비겁생식상(比劫生食傷)',
    defaultText: '비겁의 자기 축과 추진력이 식상의 표현·생산으로 이어지는 흐름으로 참고합니다. 역량을 산출물로 전환하는 조건을 함께 살펴봅니다.',
    polarity: 'plus',
    conclusion: '추진력이 표현·생산으로 이어지는 흐름을 살펴보며, 결과는 목표·자원·시장 조건을 함께 확인합니다.',
  },

  // ---------- imbalance: 과부족 경향 ----------
  'saju/imbalance/daymaster-strong': {
    category: 'imbalance',
    priority: 35,
    title: '신강(身强)',
    defaultText:
      '일간의 축(비겁+인성)이 두터운 신강으로 분류됩니다. 자기 기반과 식상·재성·관성으로 이어지는 활동의 관계를 전통적 해석으로 살펴보되, 실제 일·거래·성과는 조건을 함께 확인합니다.',
    polarity: 'neutral',
    conclusion: '자기 기반과 식상·재성·관성으로 이어지는 활동의 관계를 살펴보는 구조로, 실제 선택과 성과는 현실 조건을 함께 확인합니다.'
  },
  'saju/imbalance/daymaster-weak': {
    category: 'imbalance',
    priority: 35,
    title: '신약(身弱)',
    defaultText:
      '일간의 축(비겁+인성)이 얇은 신약으로 분류됩니다. 기반 보강(학습·수용·자기 축)과 확장 가능성을 전통적 해석으로 살펴보되, 실제 범위는 자원·위험·대안을 함께 확인합니다.',
    polarity: 'caution',
    conclusion: '기반 보강(학습·수용·자기 축)을 살펴볼 수 있는 구조로, 확장 여부는 자원·위험·대안을 함께 확인합니다.'
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
      '재성이 천간에 노출되어 있습니다. 재물 기회와 관리 위험의 관계를 참고하며, 분산·서면화의 필요성은 실제 조건을 함께 확인합니다.',
    polarity: 'caution',
    conclusion: '재물 기회와 관리 위험의 관계를 살펴보며, 분산·서면화는 실제 조건에 맞춰 검토합니다.',
  },
  'saju/imbalance/siksang-gwada': {
    category: 'imbalance',
    priority: 33,
    title: '식상 과다(食傷過多)',
    defaultText:
      '식상이 과다하다고 분류됩니다. 표현·활동 폭과 집중 방식의 관계를 전통적 해석으로 살펴보며, 실제 결과는 목표·자원·환경을 함께 확인합니다.',
    polarity: 'caution',
    conclusion: '표현·활동 폭과 집중 방식의 관계를 살펴볼 수 있는 구조로, 실제 성과는 목표·자원·환경을 함께 확인합니다.',
  },
  'saju/imbalance/gwansung-gwada': {
    category: 'imbalance',
    priority: 34,
    title: '관성 과다(官星過多)',
    defaultText:
      '관성이 과다합니다. 책임과 압박의 축이 크게 읽히는 구조로, 건강·스케줄은 생활 점검 항목으로 살펴봅니다. 건강 우려는 의료 전문가의 판단을 우선합니다.',
    polarity: 'caution',
    conclusion: '책임과 압박의 축을 생활 일정과 함께 살펴볼 수 있는 구조입니다. 건강 우려는 의료 전문가의 판단을 우선합니다.',
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
      '관성 자리가 공망으로 분류됩니다. 조직 내 지위와 실질 역할의 관계를 전통적 해석으로 살펴보되, 직업 선택은 역할·환경·본인의 경험을 함께 확인합니다.',
    polarity: 'neutral',
    conclusion: '지위와 실질 역할의 관계를 살펴볼 수 있는 구조로, 직업 선택은 역할·환경·본인의 경험을 함께 확인합니다.',
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
  'saju/cross/sinsal-장성-bigeop': {
    category: 'cross',
    priority: 13,
    title: '장성+비겁(將星比劫)',
    defaultText: '장성에 비겁이 겹친 구조로 참고합니다. 독립적 추진력과 경쟁의 양상을 살피되, 협업의 역할·자원·규칙을 함께 확인합니다.',
    polarity: 'neutral',
    conclusion: '독립적 추진력과 경쟁의 양상을 살펴보되, 협업은 역할·자원·규칙을 함께 확인합니다.',
  },
  'saju/cross/sinsal-장성-jaesung': {
    category: 'cross',
    priority: 13,
    title: '장성+재성(將星財星)',
    defaultText: '장성에 재성이 겹친 구조로 참고합니다. 책임 있는 추진력과 자원 운용의 관계를 살피며, 재정·권한·성과 조건을 함께 확인합니다.',
    polarity: 'plus',
    conclusion: '추진력과 자원 운용의 관계를 살펴보되, 재정·권한·성과 조건을 함께 확인합니다.',
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
  'saju/cross/sinsal-화개-jaesung': {
    category: 'cross',
    priority: 13,
    title: '화개+재성(華蓋財星)',
    defaultText: '화개에 재성이 겹친 구조로 참고합니다. 깊이 있는 전문성과 자원화의 관계를 살피며, 상품·시장·지속 조건을 함께 확인합니다.',
    polarity: 'plus',
    conclusion: '전문성과 자원화의 관계를 살펴보되, 상품·시장·지속 조건을 함께 확인합니다.',
  },
  'saju/cross/sinsal-화개-bigeop': {
    category: 'cross',
    priority: 13,
    title: '화개+비겁(華蓋比劫)',
    defaultText: '화개에 비겁입니다. 혼자 파는 학문·기술의 독립 재능입니다.',
    polarity: 'neutral',
    conclusion: '혼자 파는 학문·기술의 독립 재능입니다.',
  },
  'saju/cross/sinsal-연살-jaesung': {
    category: 'cross',
    priority: 13,
    title: '도화+재성(桃花財星)',
    defaultText: '도화에 재성입니다. 매력·인기와 수입 경로의 관계를 살펴볼 수 있는 조합으로, 실제 결과는 상품·시장·조건을 함께 확인합니다.',
    polarity: 'plus',
    conclusion: '매력·인기와 수입 경로의 관계를 살펴볼 수 있는 조합으로, 실제 결과는 상품·시장·조건을 함께 확인합니다.',
  },
  'saju/cross/sinsal-역마-jaesung': {
    category: 'cross',
    priority: 13,
    title: '역마+재성(驛馬財星)',
    defaultText: '역마에 재성입니다. 이동·무역·교통과 결부된 재물 활동의 가능성을 살펴보되, 실제 결과는 시장·역량·조건을 함께 확인합니다.',
    polarity: 'plus',
    conclusion: '이동·무역·교통과 결부된 재물 활동의 가능성을 살펴볼 수 있으나, 실제 결과는 시장·역량·조건을 함께 확인합니다.',
  },
  'saju/cross/sinsal-역마-siksang': {
    category: 'cross',
    priority: 13,
    title: '역마+식상(驛馬食傷)',
    defaultText: '역마에 식상입니다. 움직이며 표현하는 활동(강의·홍보·현장)에 재능이 있습니다.',
    polarity: 'plus',
    conclusion: '움직이며 표현하는 활동(강의·홍보·현장)에 재능이 있습니다.',
  },
  'saju/cross/sinsal-역마-gwansung': {
    category: 'cross',
    priority: 13,
    title: '역마+관성(驛馬官星)',
    defaultText: '역마에 관성이 겹친 구조로 참고합니다. 이동과 책임·규범의 관계를 살피며, 근무지·출장·역할 조건을 함께 확인합니다.',
    polarity: 'neutral',
    conclusion: '이동과 책임의 관계를 살펴보되, 근무지·출장·역할 조건을 함께 확인합니다.',
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
    conclusion: '환경을 통제·운용하는 경향을 전통적 해석으로 참고하되, 역할 선택은 역량·환경·본인의 선호를 함께 확인합니다.'
  },
  'saju/johu/season-drain': {
    category: 'johu',
    priority: 14,
    title: '계절 배출(季節排出)',
    defaultText:
      '일간이 계절의 왕 기운을 생합니다. 열정·산출이 많다고 읽히는 조후로, 휴식·비축과 생활 리듬을 점검합니다.',
    polarity: 'caution',
    conclusion: '열정·산출이 많다고 읽히는 조후로, 휴식·비축과 생활 리듬을 점검합니다. 실제 피로와 건강 우려는 의료 전문가의 판단을 우선합니다.',
  },

  // ---------- combo: 두 구조 조건의 교차 (전문가가 만세력에서 하나하나 조합하는 깊이) ----------
  'saju/combo/sangsaeng-saengjae--daymaster-weak': {
    category: 'combo',
    priority: 9,
    title: '생재×신약(生財身弱)',
    defaultText:
      '기술과 수입의 연결을 읽을 수 있으나 일간 축이 얇다고 봅니다. 확장 여부는 혼자 감당할 수 있는지 단정하지 않고 시스템·파트너·자원을 함께 확인합니다.',
    polarity: 'neutral',
    conclusion: '기술과 수입의 연결을 살펴보되, 확장 여부는 체력으로 단정하지 않고 파트너·시스템·자원을 함께 확인합니다.',
  },
  'saju/combo/sangsaeng-saengjae--daymaster-strong': {
    category: 'combo',
    priority: 9,
    title: '생재×신강(生財身强)',
    defaultText:
      '만드는 힘과 수입의 연결이 함께 드러나는 구조로 읽습니다. 산출과 수입의 계획은 자원·품질·위험을 함께 확인합니다.',
    polarity: 'plus',
    conclusion: '만드는 힘과 수입의 연결을 살펴볼 수 있는 구조로, 계획은 자원·품질·위험을 함께 확인합니다.',
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
      '성장 라인(관인상생) 위에 과다한 인성이 쌓인 구조로 읽습니다. 준비·자격과 산출의 균형을 살피되, 실제 순서는 목표·기한·현실 조건을 함께 확인합니다.',
    polarity: 'caution',
    conclusion: '배움·준비와 산출의 균형을 살펴보는 구조로, 실제 순서는 목표·기한·현실 조건을 함께 확인합니다.',
  },
  'saju/combo/daymaster-weak--daeun-fit': {
    category: 'combo',
    priority: 9,
    title: '신약×용신운(身弱用神運)',
    defaultText:
      '얇은 일간 축이 용신 대운의 도움을 받는 구간으로 읽습니다. 확장 가능성을 참고하되, 실행 범위는 자원·위험·준비도를 함께 확인합니다.',
    polarity: 'plus',
    conclusion: '용신운과 일간 축의 관계를 살펴보는 구간으로, 확장 여부는 자원·위험·준비도를 함께 확인합니다.',
  },
  'saju/combo/daymaster-weak--daeun-tension': {
    category: 'combo',
    priority: 9,
    title: '신약×기신운(身弱忌神運)',
    defaultText:
      '얇은 일간 축이 기신 대운의 무게를 맞은 구간으로 읽습니다. 소모·부담과 연운의 관계를 참고하되, 무리 여부는 자원·위험·대안을 함께 확인합니다.',
    polarity: 'caution',
    conclusion: '소모와 연운의 관계를 살펴보는 구간으로, 단독 결행 여부는 현실 조건과 대안을 함께 확인합니다.',
  },
  'saju/combo/daymaster-strong--daeun-fit': {
    category: 'combo',
    priority: 9,
    title: '신강×용신운(身强用神運)',
    defaultText:
      '두터운 일간 축이 용신 대운과 힘을 합한 구간으로 읽습니다. 기반과 시기의 관계를 참고하되, 확장 여부는 자원·위험·준비도를 함께 확인합니다.',
    polarity: 'plus',
    conclusion: '기반과 시기의 관계를 살펴보는 구간으로, 확장 여부는 자원·위험·준비도를 함께 확인합니다.',
  },
  'saju/combo/daymaster-strong--daeun-tension': {
    category: 'combo',
    priority: 9,
    title: '신강×기신운(身强忌神運)',
    defaultText:
      '두터운 일간 축이 기신 대운과 마주 선 구간으로 읽습니다. 기반과 시기의 관계를 참고하되, 확장·유지 여부는 자원·위험·대안을 함께 확인합니다.',
    polarity: 'neutral',
    conclusion: '기반과 시기의 관계를 살펴보는 구간으로, 확장·유지 여부는 자원·위험·대안을 함께 확인합니다.',
  },
  'saju/combo/gwansung-gwada--daymaster-weak': {
    category: 'combo',
    priority: 9,
    title: '관과다×신약(官多身弱)',
    defaultText:
      '과다한 관성(책임·압박)이 얇은 일간 축을 누르는 구조로 읽힙니다. 역할과 부담을 나눌 통로를 살펴봅니다.',
    polarity: 'caution',
    conclusion: '책임이 커질 수 있다고 읽는 구조로, 역할 분담과 생활 부담을 현실 조건에 맞춰 점검합니다.',
  },
  'saju/combo/insung-gwada--daymaster-strong': {
    category: 'combo',
    priority: 9,
    title: '인과다×신강(印多身强)',
    defaultText:
      '넓은 인성의 배움이 두터운 기반 위에 쌓이는 구조로 읽습니다. 축적과 실행·산출의 균형을 전통적 해석으로 살펴보되, 실제 결과는 준비도와 환경을 함께 확인합니다.',
    polarity: 'neutral',
    conclusion: '배움과 실행·산출의 균형을 살펴볼 수 있는 구조로, 실제 결과는 준비도와 환경을 함께 확인합니다.',
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
      '공망으로 빈 재성 자리에 얇은 기반이 겹친 구조로 읽습니다. 재물에 대한 태도와 현금흐름·자산의 관계를 참고하되, 재정 계획은 조건과 회수 가능성을 함께 확인합니다.',
    polarity: 'neutral',
    conclusion: '재물에 대한 태도와 현금흐름·자산의 관계를 살펴보는 구조로, 재정 계획은 조건과 회수 가능성을 함께 확인합니다.'
  },
  'saju/combo/daymaster-weak--johu-pressure': {
    category: 'combo',
    priority: 9,
    title: '신약×계절압박(身弱季壓)',
    defaultText:
      '얇은 일간 축과 계절의 압박이 함께 읽히는 구조입니다. 환경(직장·도시·관계)과 부담의 관계를 살펴보되, 이동·변경 여부는 자원·안전·당사자의 의사를 함께 확인합니다.',
    polarity: 'caution',
    conclusion: '환경과 부담의 관계를 살펴볼 수 있는 구조로, 이동·변경 여부는 자원·안전·당사자의 의사를 함께 확인합니다.',
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
      '원진과 충이 한 명식 안에 공존하는 구조입니다. 관계·영역의 마찰이 크고 작게 번갈아 나타나는 양상으로 참고할 수 있습니다. 큰 결단 여부는 안전·현실 조건·당사자의 의사를 확인하고, 주기적 점검과 거리 조절 가능성을 살펴봅니다.',
    polarity: 'caution',
    conclusion: '마찰이 크고 작게 나타나는 양상으로 참고할 수 있으며, 관계 판단은 안전·현실 조건·당사자의 의사를 우선하고 점검과 거리 조절 가능성을 살펴봅니다.',
  },
  'saju/combo/sangsaeng-saengjae--siksang-gwada': {
    category: 'combo',
    priority: 9,
    title: '생재×식과다(生財食多)',
    defaultText:
      '생재의 흐름이 있으나 식상이 과다해 관심사가 흩어질 수 있는 구조로 참고합니다. 어느 기술에 집중할지는 목표·자원·시장 조건을 함께 확인하며, 수입 결과는 현실 지표로 따로 살펴봅니다.',
    polarity: 'caution',
    conclusion: '기술·관심사의 집중 가능성을 살펴볼 수 있으나, 선택과 수입 결과는 목표·자원·시장 조건을 함께 확인합니다.',
  },

  // ---------- combo 3차: 흐름×강약 / 결핍×강약 / 관계×강약 ----------
  'saju/combo/jaesaeng-gwan--daymaster-weak': {
    category: 'combo',
    priority: 9,
    title: '재생관×신약(財生官身弱)',
    defaultText:
      '자원이 지위를 떠받치는 구조는 있으나 일간이 약해 그 흐름을 감당하기 어려울 수 있습니다. 지위와 기반의 관계를 참고하며, 자격·역할·재정·생활 자원의 준비도를 함께 살펴봅니다.',
    polarity: 'caution',
    conclusion: '지위·역할과 이를 받치는 기반의 관계를 살펴보며, 선택은 준비도·자원·현실 조건을 함께 확인합니다.'
  },
  'saju/combo/jaesaeng-gwan--daymaster-strong': {
    category: 'combo',
    priority: 9,
    title: '재생관×신강(財生官身强)',
    defaultText:
      '재성과 관성이 천간에 드러난 흐름에 일간의 기반도 갖춘 구조로 참고합니다. 자원과 지위의 연결은 기회로 읽을 수 있지만, 역할·재정·요건을 함께 확인하며 규모를 조절합니다.',
    polarity: 'plus',
    conclusion: '자원과 지위의 연결 가능성을 살펴볼 수 있으나, 실제 선택은 역할·재정·요건을 함께 확인합니다.'
  },
  'saju/combo/sangsaeng-jesal--daymaster-strong': {
    category: 'combo',
    priority: 9,
    title: '식상제살×신강(食傷制殺身强)',
    defaultText:
      '압박을 제압할 힘이 충분한 구조입니다. 식상의 제압력이 일간의 강함과 맞물려, 어려운 국면을 오히려 실력으로 돌파하는 힘이 있습니다.',
    polarity: 'plus',
    conclusion: '압박을 실력으로 다룰 가능성을 참고할 수 있으나, 어려운 국면의 대응은 안전·자원·현실 조건과 선택지를 함께 확인합니다.'
  },
  'saju/combo/sangsaeng-jesal--daymaster-weak': {
    category: 'combo',
    priority: 9,
    title: '식상제살×신약(食傷制殺身弱)',
    defaultText:
      '식상이 편관의 압박을 제어하는 흐름이 있으나 일간이 약한 구조로 참고합니다. 표현·대응과 감당 가능한 자원의 관계를 살피며, 경쟁·심사 상황은 준비도와 안전 조건을 함께 확인합니다.',
    polarity: 'caution',
    conclusion: '대응력과 감당 가능한 자원의 관계를 살펴보며, 경쟁·심사 상황은 준비도와 안전 조건을 함께 확인합니다.'
  },
  'saju/combo/ohaeng-missing--daymaster-weak': {
    category: 'combo',
    priority: 9,
    title: '오행결핍×신약(五行缺身弱)',
    defaultText:
      '오행 결핍과 일간 강약이 함께 읽히는 구조로 참고합니다. 부족한 영역을 어떻게 보완할지는 생활 자원·목표·환경을 함께 살피며, 무리한 보충의 영향도 점검합니다.',
    polarity: 'caution',
    conclusion: '결핍과 보완의 관계를 살펴볼 수 있으나, 생활 방식과 보완 여부는 목표·자원·환경을 함께 확인합니다.'
  },
  'saju/combo/jiji-chung--daymaster-weak': {
    category: 'combo',
    priority: 9,
    title: '충×신약(沖身弱)',
    defaultText:
      '충의 마찰과 일간 강약의 관계를 살펴볼 수 있는 구조입니다. 관계·영역의 변화 양상은 참고 신호로만 보고, 거리 조절 여부는 안전·현실 조건·당사자의 의사를 함께 확인합니다.',
    polarity: 'caution',
    conclusion: '충의 주기와 관계·영역의 변화 양상을 살펴보되, 거리 조절 여부는 안전·현실 조건·당사자의 의사를 함께 확인합니다.'
  },
  'saju/combo/jiji-chung--daymaster-strong': {
    category: 'combo',
    priority: 9,
    title: '충×신강(沖身强)',
    defaultText:
      '지지 충이 있으나 일간의 기반도 함께 읽히는 구조로 참고합니다. 변화·마찰의 신호를 행동의 결론으로 단정하지 않고, 관계·주거·직업 조건과 대응 자원을 함께 확인합니다.',
    polarity: 'neutral',
    conclusion: '변화·마찰의 신호를 살펴볼 수 있으나, 대응은 관계·현실 조건과 자원을 함께 확인합니다.'
  },
  'saju/combo/bigeop-gwada--daymaster-weak': {
    category: 'combo',
    priority: 9,
    title: '비겁과다×신약(比劫過多身弱)',
    defaultText:
      '비겁과 일간 강약의 관계가 두드러지는 구조로 참고합니다. 경쟁·협력의 양상과 자원 배분은 실제 역할·관계·문서 조건을 함께 살펴봅니다.',
    polarity: 'caution',
    conclusion: '경쟁·협력과 자원 배분의 관계를 살펴볼 수 있으며, 실제 선택은 역할·관계·문서 조건을 함께 확인합니다.'
  },
  'saju/combo/gwanin-sangsaeng--daymaster-strong': {
    category: 'combo',
    priority: 9,
    title: '관인상생×신강(官印相生生强)',
    defaultText:
      '권위와 학습의 흐름이 살아 있고 일간도 강한 구조로 읽습니다. 제도·조직·자격과의 연결 가능성을 참고하되, 실제 선택은 요건·준비도·환경을 함께 확인합니다.',
    polarity: 'plus',
    conclusion: '제도·조직·자격과의 연결 가능성을 살펴볼 수 있는 구조로, 실제 선택은 요건·준비도·환경을 함께 확인합니다.',
  },
  'saju/combo/gwanin-sangsaeng--daymaster-weak': {
    category: 'combo',
    priority: 9,
    title: '관인상생×신약(官印相生身弱)',
    defaultText:
      '관성과 인성이 이어지는 흐름이 있으나 일간이 약한 구조로 참고합니다. 제도·학습의 부담과 도움을 함께 살피며, 자격·역할·생활 자원의 준비도를 확인합니다.',
    polarity: 'caution',
    conclusion: '제도·학습의 흐름을 살펴보되, 역할 선택은 준비도·자원·현실 조건을 함께 확인합니다.',
  },
  'saju/combo/gongmang-gwansung--daymaster-weak': {
    category: 'combo',
    priority: 9,
    title: '관공망×신약(官空亡身弱)',
    defaultText:
      '지위·규범의 자리와 일간 강약의 관계를 살펴볼 수 있는 구조입니다. 겉으로 보이는 지위와 실질적인 역할·책임의 차이는 현실 조건과 함께 확인합니다.',
    polarity: 'caution',
    conclusion: '지위와 실질적인 역할·책임의 관계를 살펴보며, 선택은 요건·준비도·현실 조건을 함께 확인합니다.'
  },
  'saju/combo/siksang-gwada--daymaster-weak': {
    category: 'combo',
    priority: 9,
    title: '식과다×신약(食過多身弱)',
    defaultText:
      '표현·생산이 과다한데 일간이 약한 구조로 읽습니다. 아이디어·산출과 감당 가능한 자원의 관계를 참고하며, 양·완성도·우선순위는 목표와 현실 조건에 맞춰 조정합니다.',
    polarity: 'caution',
    conclusion: '표현·산출과 감당 가능한 자원의 관계를 살펴보며, 양·완성도·우선순위는 목표와 현실 조건에 맞춰 조정합니다.'
  },

  // ---------- combo 4차: 흐름×대운 / 관계×대운 / 강약×세운 ----------
  'saju/combo/sangsaeng-saengjae--daeun-fit': {
    category: 'combo',
    priority: 9,
    title: '생재×용신운(生財用神運)',
    defaultText:
      '재물을 만드는 흐름과 대운의 용신 방향이 함께 읽히는 구간으로 참고할 수 있습니다. 재물 계획은 자원·조건·위험·회수 가능성을 점검하고 실행 범위를 검토합니다.',
    polarity: 'plus',
    conclusion: '흐름과 시기가 같은 방향으로 참고되지만, 재물 쪽 결정은 자원·조건·위험을 확인하며 판단합니다.',
  },
  'saju/combo/sangsaeng-saengjae--daeun-tension': {
    category: 'combo',
    priority: 9,
    title: '생재×기신운(生財忌神運)',
    defaultText:
      '재물을 만드는 흐름은 있으나 대운이 기신 방향입니다. 흐름과 시기가 어긋나는 구간으로 읽을 수 있어, 재물 계획은 자원·위험·회수 가능성을 함께 점검합니다.',
    polarity: 'caution',
    conclusion: '흐름과 시기가 어긋나는 구간으로 참고하되, 재물 결정은 자원·조건·위험을 함께 확인합니다.',
  },
  'saju/combo/gwanin-sangsaeng--daeun-fit': {
    category: 'combo',
    priority: 9,
    title: '관인상생×용신운(官印相生用神運)',
    defaultText:
      '권위와 학습이 서로 돕는 흐름에 대운이 용신 방향입니다. 제도·조직·자격의 단계를 밟는 흐름과 시기의 관계를 살펴보되, 승진·자격·진학은 요건·준비도·일정을 함께 확인합니다.',
    polarity: 'plus',
    conclusion: '제도·조직·자격의 흐름이 시기와 맞물린다고 읽을 수 있으나, 실제 선택은 요건·준비도·환경을 함께 확인합니다.',
  },
  'saju/combo/gwanin-sangsaeng--daeun-tension': {
    category: 'combo',
    priority: 9,
    title: '관인상생×기신운(官印相生忌神運)',
    defaultText:
      '권위와 학습의 흐름은 있으나 대운이 기신 방향입니다. 제도·조직의 단계를 밟는 흐름과 시기가 어긋난다고 읽을 수 있어, 승진·자격 도전은 요건·준비도·대안을 함께 확인합니다.',
    polarity: 'caution',
    conclusion: '제도·조직의 흐름과 시기가 어긋난다고 참고할 수 있으나, 선택은 실력·요건·환경을 함께 확인합니다.',
  },
  'saju/combo/jiji-chung--daeun-tension': {
    category: 'combo',
    priority: 9,
    title: '충×기신운(沖忌神運)',
    defaultText:
      '충의 마찰이 있는데 대운이 기신 방향입니다. 마찰이 무거운 시기에 겹친다고 읽을 수 있어, 관계·영역의 변화 가능성을 현실 조건과 당사자의 의사를 함께 확인합니다.',
    polarity: 'caution',
    conclusion: '마찰과 시기의 관계를 살펴볼 수 있는 구간으로, 관계·영역의 판단은 현실 조건과 당사자의 의사를 우선합니다.',
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
      '일간 강약 지표와 세운의 용신 방향이 함께 읽히는 구간으로 참고할 수 있습니다. 올해의 계획은 자원·조건·위험·대안을 점검하고 실행 범위를 검토합니다.',
    polarity: 'plus',
    conclusion: '연운의 도움이 보태지는 구간으로 참고하되, 올해의 결정은 강약 지표가 아니라 현실 조건과 준비도를 함께 확인해 판단합니다.',
  },
  'saju/combo/daymaster-strong--seun-tension': {
    category: 'combo',
    priority: 9,
    title: '신강×세운기신(身强歲運忌神)',
    defaultText:
      '일간이 강한데 세운이 기신 방향입니다. 강한 힘과 연운의 압박 관계를 살펴보는 구간으로, 확장 여부는 자원·위험·대안을 함께 확인합니다.',
    polarity: 'caution',
    conclusion: '강한 힘과 연운의 압박을 참고할 수 있는 구간으로, 확장 여부는 현실 조건과 대안을 함께 확인합니다.',
  },

  // ---------- combo 5차: 흐름×세운 / 관계×세운 / 흐름×대운 잔여 ----------
  'saju/combo/sangsaeng-saengjae--seun-fit': {
    category: 'combo',
    priority: 9,
    title: '생재×세운용신(生財歲運用神)',
    defaultText:
      '재물을 만드는 흐름이 있는데 세운이 용신 방향입니다. 올해는 재물 쪽 흐름이 연운의 도움을 받는 구간으로 참고할 수 있으나, 수입·투자·계약은 조건·위험·회수 가능성을 확인해 판단합니다.',
    polarity: 'plus',
    conclusion: '재물 흐름이 연운의 도움을 받는 해로 참고하되, 수입·투자·계약의 결정은 현실 조건을 함께 확인합니다.',
  },
  'saju/combo/sangsaeng-saengjae--seun-tension': {
    category: 'combo',
    priority: 9,
    title: '생재×세운기신(生財歲運忌神)',
    defaultText:
      '재물을 만드는 흐름은 있으나 세운이 기신 방향입니다. 재물 흐름과 연운의 관계를 참고하되, 투자·확장·정리 여부는 자원·위험·회수 가능성을 함께 확인합니다.',
    polarity: 'caution',
    conclusion: '재물 흐름과 연운의 관계를 살펴보는 해로, 투자·확장·정리 여부는 자원·위험·회수 가능성을 함께 확인합니다.',
  },
  'saju/combo/gwanin-sangsaeng--seun-fit': {
    category: 'combo',
    priority: 9,
    title: '관인상생×세운용신(官印相生歲運用神)',
    defaultText:
      '권위와 학습이 서로 돕는 흐름에 세운이 용신 방향입니다. 올해는 승진·자격·진학 같은 계단식 도전을 연운의 참고 신호와 함께 살펴보되, 서류·시험·심사는 요건·준비도·일정을 확인해 판단합니다.',
    polarity: 'plus',
    conclusion: '계단식 도전을 연운의 참고 신호와 함께 살펴보되, 서류·시험·심사의 결정은 현실 조건을 확인합니다.',
  },
  'saju/combo/gwanin-sangsaeng--seun-tension': {
    category: 'combo',
    priority: 9,
    title: '관인상생×세운기신(官印相生歲運忌神)',
    defaultText:
      '권위와 학습의 흐름은 있으나 세운이 기신 방향입니다. 올해는 제도·조직의 단계를 밟는 데 연운이 어긋나는 구간으로 참고할 수 있어, 승진·자격 도전은 요건과 준비도를 확인하며 실력 축적을 병행하는 것이 좋습니다.',
    polarity: 'caution',
    conclusion: '제도·조직의 단계를 밟는 데 연운이 어긋나는 해로 참고하되, 실력 축적과 현실 조건 점검을 병행합니다.',
  },
  'saju/combo/jiji-chung--seun-tension': {
    category: 'combo',
    priority: 9,
    title: '충×세운기신(沖歲運忌神)',
    defaultText:
      '충의 마찰이 있는데 세운이 기신 방향입니다. 마찰과 연운의 관계를 참고하되, 관계·영역의 변화는 현실 조건과 당사자의 의사를 함께 확인합니다.',
    polarity: 'caution',
    conclusion: '마찰과 연운의 관계를 살펴보는 해로, 관계·영역의 변화는 현실 조건과 당사자의 의사를 함께 확인합니다.',
  },
  'saju/combo/wonjin--seun-tension': {
    category: 'combo',
    priority: 9,
    title: '원진×세운기신(怨嗔歲運忌神)',
    defaultText:
      '원진의 속마찰이 있는데 세운이 기신 방향입니다. 감정과 연운의 관계를 참고하되, 관계의 불만과 정리는 대화·상황·당사자의 의사를 함께 확인합니다.',
    polarity: 'caution',
    conclusion: '감정과 연운의 관계를 살펴보는 해로, 관계의 정리 여부는 대화·상황·당사자의 의사를 함께 확인합니다.',
  },
  'saju/combo/jaesaeng-gwan--daeun-fit': {
    category: 'combo',
    priority: 9,
    title: '재생관×용신운(財生官用神運)',
    defaultText:
      '재성과 관성이 천간에 드러난 흐름에 대운이 용신 방향입니다. 재물이 지위로 이어지는 길이 시기와 맞물린 구간으로 읽을 수 있으나, 사업 확장·직위 상승·공식 지위 취득은 요건과 자원을 확인해 판단합니다.',
    polarity: 'plus',
    conclusion: '재물이 지위로 이어지는 길이 시기와 맞물린 구간으로 참고하되, 지위 취득 여부는 현실 조건을 확인합니다.',
  },
  'saju/combo/sangsaeng-jesal--daeun-fit': {
    category: 'combo',
    priority: 9,
    title: '식상제살×용신운(食傷制殺用神運)',
    defaultText:
      '편관을 식상이 제어하는 구조에 대운이 용신 방향입니다. 압박과 실력의 관계를 참고하되, 경쟁·심사·도전 여부는 요건·준비도·환경을 함께 확인합니다.',
    polarity: 'plus',
    conclusion: '압박과 실력의 관계를 살펴보는 구간으로, 경쟁·심사 여부는 요건·준비도·환경을 함께 확인합니다.',
  },

  // ---------- combo 6차: 과다×기신운 / 결핍×용신운 / 노출×세운 / 관계×세운용신 ----------
  'saju/combo/bigeop-gwada--daeun-tension': {
    category: 'combo',
    priority: 9,
    title: '비겁과다×기신운(比劫過多忌神運)',
    defaultText:
      '비겁이 과다한데 대운이 기신 방향입니다. 경쟁 구조와 시기의 관계를 참고하되, 동업·공동투자·보증은 조건·문서·회수 가능성을 함께 확인합니다.',
    polarity: 'caution',
    conclusion: '경쟁 구조와 시기의 관계를 살펴보는 구간으로, 남과 묶이는 결정은 조건·문서·회수 가능성을 함께 확인합니다.',
  },
  'saju/combo/insung-gwada--daeun-tension': {
    category: 'combo',
    priority: 9,
    title: '인과다×기신운(印過多忌神運)',
    defaultText:
      '인성이 과다한데 대운이 기신 방향입니다. 생각·수용과 시기의 관계를 참고하되, 배움·준비·실행의 순서는 목표·기한·현실 조건을 함께 검토합니다.',
    polarity: 'caution',
    conclusion: '생각과 실행의 균형을 살펴보는 구간으로, 목표·기한·현실 조건을 함께 검토합니다.',
  },
  'saju/combo/siksang-gwada--daeun-tension': {
    category: 'combo',
    priority: 9,
    title: '식과다×기신운(食過多忌神運)',
    defaultText:
      '식상이 과다한데 대운이 기신 방향입니다. 표현·생산과 시기의 관계를 참고하며, 산출물의 양·검증·공개 범위는 목표·품질·리스크를 함께 확인합니다.',
    polarity: 'caution',
    conclusion: '표현·생산과 시기의 관계를 살펴보는 구간으로, 산출물의 양·검증·공개 범위는 목표·품질·리스크를 함께 확인합니다.',
  },
  'saju/combo/jaesung-nochul--seun-tension': {
    category: 'combo',
    priority: 9,
    title: '재노출×세운기신(財露出歲運忌神)',
    defaultText:
      '재성이 천간에 드러난 명식에 세운이 기신 방향입니다. 재물이 밖으로 보이는 구조에 연운이 어긋나는 해이므로, 투자·대출·큰 지출은 조건·문서·회수 가능성을 평소보다 꼼꼼히 확인합니다.',
    polarity: 'caution',
    conclusion: '재물이 밖으로 보이는 구조에 연운이 어긋나는 해로 참고하되, 큰 지출은 조건과 자산 방어 계획을 함께 확인합니다.',
  },
  'saju/combo/ohaeng-missing--daeun-fit': {
    category: 'combo',
    priority: 9,
    title: '오행결핍×용신운(五行缺乏用神運)',
    defaultText:
      '오행 분포에 결핍이 있는데 대운이 용신 방향입니다. 비어 있는 축을 용신운이 메워주는 구간으로 읽을 수 있어, 평소 약했던 영역의 조건과 가능성을 점검해 볼 시기로 참고합니다.',
    polarity: 'plus',
    conclusion: '비어 있는 축을 용신운이 메워주는 구간으로 참고하되, 약했던 영역의 기회는 현실 조건을 함께 확인합니다.',
  },
  'saju/combo/ohaeng-missing--seun-fit': {
    category: 'combo',
    priority: 9,
    title: '오행결핍×세운용신(五行缺乏歲運用神)',
    defaultText:
      '오행 분포에 결핍이 있는데 세운이 용신 방향입니다. 결핍과 연운의 관계를 참고하되, 평소 약했던 영역의 선택은 자원·위험·준비도를 함께 확인합니다.',
    polarity: 'plus',
    conclusion: '결핍과 연운의 관계를 살펴보는 해로, 약했던 영역의 선택은 자원·위험·준비도를 함께 확인합니다.',
  },
  'saju/combo/jiji-chung--seun-fit': {
    category: 'combo',
    priority: 9,
    title: '충×세운용신(沖歲運用神)',
    defaultText:
      '충의 마찰이 있는데 세운이 용신 방향입니다. 마찰과 연운의 관계를 참고하되, 관계·영역의 정리·전환은 현실 조건과 당사자의 의사를 함께 확인합니다.',
    polarity: 'plus',
    conclusion: '마찰과 연운의 관계를 살펴보는 해로, 관계·영역의 정리·전환은 현실 조건과 당사자의 의사를 함께 확인합니다.',
  },
  'saju/combo/wonjin--seun-fit': {
    category: 'combo',
    priority: 9,
    title: '원진×세운용신(怨嗔歲運用神)',
    defaultText:
      '원진의 속마찰이 있는데 세운이 용신 방향입니다. 감정과 연운의 관계를 참고하되, 오래된 관계의 정리·화해는 대화·상황·당사자의 의사를 함께 확인합니다.',
    polarity: 'plus',
    conclusion: '감정과 연운의 관계를 살펴보는 해로, 관계의 정리·화해는 대화·상황·당사자의 의사를 함께 확인합니다.',
  },

  // ---------- combo 7차: 공망×운 / 합·형·해×운 / 강약×조후 잔여 ----------
  'saju/combo/gongmang-jaesung--daeun-tension': {
    category: 'combo',
    priority: 9,
    title: '재공망×기신운(財空亡忌神運)',
    defaultText:
      '재성 자리가 공망인데 대운이 기신 방향입니다. 재물의 실체와 시기의 관계를 참고하며, 재물 계획은 장부·현금흐름·회수 가능성을 함께 확인합니다.',
    polarity: 'caution',
    conclusion: '재물의 실체와 시기의 관계를 살펴보는 구간으로, 장부·현금흐름·회수 가능성을 함께 확인합니다.',
  },
  'saju/combo/gongmang-gwansung--daeun-tension': {
    category: 'combo',
    priority: 9,
    title: '관공망×기신운(官空亡忌神運)',
    defaultText:
      '관성 자리가 공망인데 대운이 기신 방향입니다. 지위·규범의 자리가 비어 있는 구조에 시기까지 어긋나는 구간이라, 명분보다 실질 역할을 먼저 확인하고 조직의 약속은 문서로 받아두는 것이 좋습니다.',
    polarity: 'caution',
    conclusion: '지위의 자리가 비어 있는 구조에 시기까지 어긋나는 구간으로, 실질 역할과 문서 확인이 우선입니다.',
  },
  'saju/combo/jiji-hap--daeun-fit': {
    category: 'combo',
    priority: 9,
    title: '합×용신운(合用神運)',
    defaultText:
      '지지 합이 있는데 대운이 용신 방향입니다. 묶인 결속과 시기의 관계를 살펴보는 구간으로, 협업·계약·결합은 상대의 의사와 조건을 함께 확인합니다.',
    polarity: 'plus',
    conclusion: '묶인 결속이 시기의 도움을 받는 구간으로, 협업·계약·결합은 문서·위험·이탈 조건을 함께 확인합니다.',
  },
  'saju/combo/jiji-hap--daeun-tension': {
    category: 'combo',
    priority: 9,
    title: '합×기신운(合忌神運)',
    defaultText:
      '지지 합이 있는데 대운이 기신 방향입니다. 묶인 결속이 시기와 어긋나는 구간이라, 합으로 잡힌 관계·자리가 오히려 발목을 잡기 쉬우니 묶인 것을 푸는 결정도 선택지입니다.',
    polarity: 'caution',
    conclusion: '묶인 결속이 시기와 어긋나는 구간으로, 묶인 것을 푸는 결정도 선택지입니다.',
  },
  'saju/combo/jiji-hyeong--daeun-tension': {
    category: 'combo',
    priority: 9,
    title: '형×기신운(刑忌神運)',
    defaultText:
      '지지 형이 있는데 대운이 기신 방향입니다. 규칙·약속의 마찰이 시기의 무게와 겹치는 구간이라, 계약·약속·절차의 작은 어긋남이 크게 번지기 쉬우니 문서·절차를 꼼꼼히 확인하는 것이 좋습니다.',
    polarity: 'caution',
    conclusion: '규칙·약속의 마찰이 시기의 무게와 겹치는 구간으로, 문서·절차 확인이 중요합니다.',
  },
  'saju/combo/jiji-hae--daeun-tension': {
    category: 'combo',
    priority: 9,
    title: '해×기신운(害忌神運)',
    defaultText:
      '지지 해가 있는데 대운이 기신 방향입니다. 미세한 마찰이 시기의 무게와 겹치는 구간이라, 겉으로 드러나지 않는 손상·누수가 생기기 쉬우니 관계·건강·자산의 작은 이상을 조기에 점검하는 것이 좋습니다.',
    polarity: 'caution',
    conclusion: '미세한 마찀이 시기의 무게와 겹치는 구간으로, 작은 이상을 조기에 점검하는 것이 좋습니다.',
  },
  'saju/combo/daymaster-weak--johu-support': {
    category: 'combo',
    priority: 9,
    title: '신약×계절후원(身弱季節後援)',
    defaultText:
      '일간이 약한데 계절이 일간을 생합니다. 얇은 축에 계절의 도움이 붙는 구조라, 태어난 계절이 주는 자원(환경·타이밍·지원)을 활용하면 약함을 상쇄할 수 있습니다.',
    polarity: 'plus',
    conclusion: '얇은 축에 계절의 도움이 붙는 구조로, 환경·타이밍·지원을 활용하면 약함을 상쇄할 수 있습니다.',
  },
  'saju/combo/daymaster-strong--johu-pressure': {
    category: 'combo',
    priority: 9,
    title: '신강×계절압박(身强季節壓迫)',
    defaultText:
      '일간이 강하지만 계절이 일간을 극하는 구조로 읽습니다. 강약과 환경의 관계를 참고하되, 확장 범위는 자원·위험·현실 조건을 함께 확인합니다.',
    polarity: 'caution',
    conclusion: '강약과 환경의 관계를 살펴볼 수 있는 구조로, 확장 범위는 자원·위험·현실 조건을 함께 확인합니다.',
  },

  // ---------- combo 8차: 십신 쌍×강약 / 삼합·파×운 / 공망×세운 / 결핍×기신운 ----------
  'saju/combo/siksang-gwansung--daymaster-strong': {
    category: 'combo',
    priority: 9,
    title: '식상제관×신강(食傷制官身强)',
    defaultText:
      '식상이 관성을 제어하는 구조인데 일간이 강합니다. 규범·권위와 자기 표현의 관계를 전통적 해석으로 살펴볼 수 있으나, 조직 안의 결과와 선택은 역할·요건·환경을 함께 확인합니다. 관성과 식상의 균형은 실제 피드백으로 점검합니다.',
    polarity: 'plus',
    conclusion: '규범을 실력으로 다루는 힘이 있는 구조로, 관성을 너무 누르지 않는 적정선이 중요합니다.',
  },
  'saju/combo/jaesung-insung--daymaster-weak': {
    category: 'combo',
    priority: 9,
    title: '재인상극×신약(財印相剋身弱)',
    defaultText:
      '재성과 인성이 공존하는데 일간이 약합니다. 재물을 좇으면 배움이 흔들리고, 배움에 머물면 재물이 멀어지는 구조라, 둘을 동시에 잡으려 하기보다 시기를 나눠 번갈아 가는 것이 현실적입니다.',
    polarity: 'caution',
    conclusion: '재물과 배움이 서로를 극하는 구조로, 동시에 잡기보다 시기를 나누는 것이 현실적입니다.',
  },
  'saju/combo/samhap--daeun-fit': {
    category: 'combo',
    priority: 9,
    title: '삼합×용신운(三合用神運)',
    defaultText:
      '삼합의 결속이 있는데 대운이 용신 방향입니다. 결속과 시기의 관계를 전통적 해석으로 참고하되, 팀·조직·연합의 결정은 역할·조건·문서·당사자의 의사를 함께 확인합니다.',
    polarity: 'plus',
    conclusion: '결속과 시기의 관계를 살펴보는 구간으로, 팀·조직·연합의 결과는 역할·조건·문서·당사자의 의사를 함께 확인합니다.'
  },
  'saju/combo/samhap--daeun-tension': {
    category: 'combo',
    priority: 9,
    title: '삼합×기신운(三合忌神運)',
    defaultText:
      '삼합의 결속이 있는데 대운이 기신 방향입니다. 세 자리가 한 방향으로 묶인 힘이 시기와 어긋나는 구간이라, 팀·조직·연합의 결속이 오히려 기신 쪽으로 기울기 쉬우니 묶인 판의 방향을 점검하는 것이 좋습니다.',
    polarity: 'caution',
    conclusion: '세 자리의 결속이 시기와 어긋나는 구간으로, 묶인 판의 방향을 점검하는 것이 좋습니다.',
  },
  'saju/combo/jiji-pa--daeun-tension': {
    category: 'combo',
    priority: 9,
    title: '파×기신운(破忌神運)',
    defaultText:
      '지지 파가 있는데 대운이 기신 방향입니다. 깨짐·파열의 마찰이 시기와 겹친다고 읽을 수 있어, 관계·자리·약속은 현실 조건과 문서를 함께 확인합니다.',
    polarity: 'caution',
    conclusion: '깨짐의 마찰과 시기의 관계를 살펴보는 구간으로, 중요한 결합은 이탈·보완 조건을 함께 확인합니다.',
  },
  'saju/combo/gongmang-jaesung--seun-tension': {
    category: 'combo',
    priority: 9,
    title: '재공망×세운기신(財空亡歲運忌神)',
    defaultText:
      '재성 자리가 공망인데 세운이 기신 방향입니다. 재물의 실체가 비어 있다고 읽는 구조에 연운이 어긋난다는 해석을 참고하며, 보이는 수치보다 실제 회수 가능성과 현금흐름을 확인합니다.',
    polarity: 'caution',
    conclusion: '재물과 시기의 관계를 살펴보는 구간으로, 현금흐름·회수 가능성·계약 조건을 함께 확인합니다.',
  },
  'saju/combo/gongmang-gwansung--seun-tension': {
    category: 'combo',
    priority: 9,
    title: '관공망×세운기신(官空亡歲運忌神)',
    defaultText:
      '관성 자리가 공망인데 세운이 기신 방향입니다. 지위·규범과 연운의 관계를 참고하며, 명분·직책·조직의 약속은 문서·역할·당사자의 의사를 함께 확인합니다.',
    polarity: 'caution',
    conclusion: '지위·규범과 연운의 관계를 살펴보는 해로, 문서·역할·당사자의 의사를 함께 확인합니다.',
  },
  'saju/combo/ohaeng-missing--daeun-tension': {
    category: 'combo',
    priority: 9,
    title: '오행결핍×기신운(五行缺乏忌神運)',
    defaultText:
      '오행 분포에 결핍이 있는데 대운이 기신 방향입니다. 비어 있는 축을 기신운이 더 비우는 구간이라, 결핍 오행에 해당하는 영역(관계·재물·지위·배움)에서 공백이 커지기 쉬우니 그 축을 의식적으로 보완하는 것이 좋습니다.',
    polarity: 'caution',
    conclusion: '비어 있는 축을 기신운이 더 비우는 구간으로, 결핍 영역을 의식적으로 보완하는 것이 좋습니다.',
  },

  // ---------- 9차: 삼합·방합·합·형·해 × 세운 / 방합 × 대운 ----------
  'saju/combo/samhap--seun-fit': {
    category: 'combo',
    priority: 9,
    title: '삼합×세운용신(三合歲運用神)',
    defaultText:
      '삼합 국을 이루는 명식에 세운이 용신 방향으로 들어옵니다. 결속력과 연운의 관계를 전통적 해석으로 참고하되, 협력·연합·소속의 결과는 역할·조건·당사자의 의사를 함께 확인합니다.',
    polarity: 'plus',
    conclusion: '결속력과 연운의 관계를 살펴볼 수 있는 해로, 협력·연합의 결과는 역할·조건·당사자의 의사를 함께 확인합니다.',
  },
  'saju/combo/samhap--seun-tension': {
    category: 'combo',
    priority: 9,
    title: '삼합×세운기신(三合歲運忌神)',
    defaultText:
      '삼합 국을 이루는 명식에 세운이 기신 방향으로 들어옵니다. 묶인 결속력이 어긋난 연운과 만나, 소속·연합 내부의 마찰이나 방향 충돌이 표면화되기 쉬운 해입니다.',
    polarity: 'caution',
    conclusion: '묶인 결속력이 어긋난 연운과 만나, 소속·연합 내부의 마찰이 표면화되기 쉬운 해입니다.',
  },
  'saju/combo/banghap--daeun-fit': {
    category: 'combo',
    priority: 9,
    title: '방합×용신운(方合用神運)',
    defaultText:
      '계절 방합을 이루는 명식에 대운이 용신 방향입니다. 한 계절의 기운이 방향을 이룬 구조에 용신운이 더해져, 환경·소속·지역의 축이 일관된 힘으로 작동하는 구간입니다.',
    polarity: 'plus',
    conclusion: '방향을 이룬 구조에 용신운이 더해져, 환경·소속의 축이 일관된 힘으로 작동합니다.',
  },
  'saju/combo/banghap--daeun-tension': {
    category: 'combo',
    priority: 9,
    title: '방합×기신운(方合忌神運)',
    defaultText:
      '계절 방합을 이루는 명식에 대운이 기신 방향입니다. 한 방향으로 쏠린 기운이 기신운과 겹쳐, 환경·소속·지역의 축이 한쪽으로 과도하게 기울어 균형이 깨지기 쉬운 구간입니다.',
    polarity: 'caution',
    conclusion: '한 방향으로 쏠린 기운이 기신운과 겹쳐, 환경·소속의 축이 균형을 잃기 쉬운 구간입니다.',
  },
  'saju/combo/jiji-hap--seun-fit': {
    category: 'combo',
    priority: 9,
    title: '합×세운용신(合歲運用神)',
    defaultText:
      '지지에 합이 있는 명식에 세운이 용신 방향입니다. 엮인 관계가 연운의 도움을 받는다는 해석을 참고하되, 결합·계약·인연은 조건과 당사자의 의사를 함께 확인합니다.',
    polarity: 'plus',
    conclusion: '엮인 관계와 연운의 관계를 살펴볼 수 있는 해로, 결합·인연은 조건과 당사자의 의사를 함께 확인합니다.'
  },
  'saju/combo/jiji-hap--seun-tension': {
    category: 'combo',
    priority: 9,
    title: '합×세운기신(合歲運忌神)',
    defaultText:
      '지지에 합이 있는 명식에 세운이 기신 방향입니다. 엮인 관계가 어긋난 연운과 만나, 결합·계약·인연이 묶인 채로 소모가 커지는 해입니다.',
    polarity: 'caution',
    conclusion: '엮인 관계가 어긋난 연운과 만나, 결합·인연이 묶인 채 소모가 커지는 해입니다.',
  },
  'saju/combo/jiji-hyeong--seun-tension': {
    category: 'combo',
    priority: 9,
    title: '형×세운기신(刑歲運忌神)',
    defaultText:
      '지지에 형이 있는 명식에 세운이 기신 방향입니다. 형의 살기가 어긋난 연운과 겹쳐, 법·규정·관계의 충돌이 표면화되기 쉬운 해입니다.',
    polarity: 'caution',
    conclusion: '형의 살기가 어긋난 연운과 겹쳐, 법·규정·관계의 충돌이 표면화되기 쉬운 해입니다.',
  },
  'saju/combo/jiji-hae--seun-tension': {
    category: 'combo',
    priority: 9,
    title: '해×세운기신(害歲運忌神)',
    defaultText:
      '지지에 해가 있는 명식에 세운이 기신 방향입니다. 해의 잡음이 어긋난 연운과 겹쳐, 관계·건강·일상의 방해 요소가 잔잔하게 누적되는 해입니다.',
    polarity: 'caution',
    conclusion: '해의 잡음이 어긋난 연운과 겹쳐, 관계·건강의 방해 요소가 누적되기 쉬운 해입니다.',
  },

  // ---------- 10차: 조후 잔여 축 × 강약 ----------
  'saju/combo/season-command--daymaster-strong': {
    category: 'combo',
    priority: 9,
    title: '득령×신강(得令身强)',
    defaultText:
      '왕오행이 일간과 같은데 일간이 강합니다. 계절과 기반이 모두 같은 방향으로 힘이 실린 구조로 읽습니다. 강한 축이 과잉으로 기울지 않도록, 나가는 방향(식상·재성)의 출구를 함께 확인합니다.',
    polarity: 'plus',
    conclusion: '계절과 기반이 같은 방향으로 힘이 실린 구조로, 과잉으로 기울지 않게 나가는 출구를 확인합니다.',
  },
  'saju/combo/season-command--daymaster-weak': {
    category: 'combo',
    priority: 9,
    title: '득령×신약(得令身弱)',
    defaultText:
      '왕오행이 일간과 같은데 일간이 약합니다. 계절은 맞으나 명식 안의 구조(분산·설기)가 축을 약하게 만든 형태로 읽습니다. 계절의 기운을 받아들이는 기반(인성·비겁)의 충실도를 함께 확인합니다.',
    polarity: 'neutral',
    conclusion: '계절은 맞으나 구조가 축을 약하게 만든 형태로, 기반의 충실도를 함께 확인합니다.',
  },
  'saju/combo/season-drain--daymaster-weak': {
    category: 'combo',
    priority: 9,
    title: '설기×신약(泄氣身弱)',
    defaultText:
      '일간이 계절을 생하는데 일간이 약합니다. 기운이 밖으로 흘러나가는 형태에 얇은 축이 겹쳐, 지출·소모·남을 위한 수고가 부담으로 읽힐 수 있습니다. 회수·보존·기반 보강의 균형을 함께 확인합니다.',
    polarity: 'caution',
    conclusion: '기운이 밖으로 흘러나가는데 축이 얇은 구조로, 회수·보존·기반 보강의 균형을 확인합니다.',
  },
  'saju/combo/season-control--daymaster-weak': {
    category: 'combo',
    priority: 9,
    title: '제절×신약(制節身弱)',
    defaultText:
      '일간이 계절을 극하는데 일간이 약합니다. 극하는 힘이 부족한 상태에서 환경을 누르려는 형태로 읽습니다. 억지로 누르기보다 방향을 돌리거나 기반을 먼저 채우는 쪽이 현실적입니다.',
    polarity: 'caution',
    conclusion: '극하는 힘이 부족한 상태로, 억지로 누르기보다 방향 전환이나 기반 보강이 현실적입니다.',
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
