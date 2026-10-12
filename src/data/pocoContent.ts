export interface SignatureDrink {
  id: string;
  number: string;
  name: string;
  price: number;
  priceFormatted: string;
  currency: string;
  colorClass: string;
  shape: 'circle' | 'semicircle' | 'rectangle';
}

export interface BrandPrinciple {
  number: string;
  enTitle: string;
  koDescription: string;
}

export interface OperatingInfo {
  brandName: string;
  subTitle: string;
  tagline: string;
  heroSubCopy: string;
  statusLabel: string;
  policyBadge: string;
  representative: {
    name: string;
    role: string;
  };
  address: {
    // 실제 공개 전 주소 교체 필요 (개발용 주석)
    road: string;
    detail: string;
    regionNotice: string;
    openPlan: string;
  };
  hours: {
    days: string;
    time: string;
    lastOrder: string;
    closed: string;
  };
  capacity: {
    totalSeats: string;
    maxGroupSize: string;
    walkInOnly: boolean;
    waitingNotice: string;
    parking: string;
  };
}

export const POCO_DATA = {
  brand: {
    name: 'POCO DRINKERY',
    shortName: 'POCO',
    category: 'DRINKERY',
    meaning: '음악 용어로 ‘조금씩’',
    tagline: '조금씩, 음식과 함께.',
    heroSubCopy: '지역과 계절의 재료로 만든 저도수 음료를 음식과 자연스럽게 페어링합니다.',
    statusLabel: 'SEOUL · SINSA · OPENING 2027',
    walkInNotice: 'WALK-INS ONLY',
    representative: {
      name: '손용민',
      role: '11년차 바텐더 / Beverage Director',
    },
  },

  story: {
    title: '조금씩이라는 태도',
    lead: 'POCO는 음악 용어로 ‘조금씩’을 뜻합니다. 한 잔의 도수를 낮추고, 지역과 계절의 재료를 살피고, 음식과 음료 사이의 균형을 맞춥니다. 바에서 쌓은 경험을 바탕으로 칵테일을 음식과 함께 더 편안하게 즐기는 방식을 제안합니다.',
    principles: [
      {
        number: '01',
        enTitle: 'LOCAL & SEASONAL',
        koDescription: '지역과 제철 재료를 우선합니다.',
      },
      {
        number: '02',
        enTitle: 'LESS ALCOHOL, MORE BALANCE',
        koDescription: '과한 도수와 장식을 줄이고 페어링의 균형에 집중합니다.',
      },
      {
        number: '03',
        enTitle: 'EASY, NOT CASUAL ABOUT QUALITY',
        koDescription: '편안하게 접근할 수 있지만 전문성은 놓치지 않습니다.',
      },
    ] as BrandPrinciple[],
  },

  pairing: {
    title: '와인처럼, 음식 곁에 놓이는 칵테일.',
    content: 'POCO는 한 잔만을 돋보이게 하기보다 음식과 음료가 서로의 맛을 이어주도록 설계합니다. 지역·제철·발효 재료, 낮은 도수, 편안하고 정확한 서비스를 통해 데이트와 혼술 모두에 어울리는 밤을 만듭니다.',
  },

  signatures: [
    {
      id: 'yeongdong-negroni',
      number: '01',
      name: '영동 네그로니',
      price: 25000,
      priceFormatted: '25,000',
      currency: 'KRW',
      colorClass: '#E43D30',
      shape: 'circle',
    },
    {
      id: 'dongchimi-highball',
      number: '02',
      name: '동치미 하이볼',
      price: 25000,
      priceFormatted: '25,000',
      currency: 'KRW',
      colorClass: '#F3C638',
      shape: 'semicircle',
    },
    {
      id: 'kombu-adzuki',
      number: '03',
      name: '콤부 팥차',
      price: 25000,
      priceFormatted: '25,000',
      currency: 'KRW',
      colorClass: '#2447C6',
      shape: 'rectangle',
    },
  ] as SignatureDrink[],

  foodNotice: {
    status: 'FOOD IN PROGRESS',
    description: '음식 메뉴는 셰프와 함께 계절에 맞춰 준비 중입니다.',
  },

  visit: {
    title: 'COME BY, TAKE IT SLOW.',
    // 실제 공개 전 주소 교체 필요 (개발용 상수)
    address: '서울 강남구 도산대로13길 00, 지상 1층',
    locationHint: '신사역·가로수길 인근',
    openSchedule: '2027년 상반기 오픈 예정',
    operatingDays: '화–일 18:00–02:00',
    lastOrder: 'LAST ORDER 01:30',
    holiday: '월요일 휴무',
    seating: '총 30석 · 단체 최대 4인',
    parking: '매장 전용 주차 가능',
    waiting: '피크타임에는 좌석 상황에 따라 현장 대기 명단을 운영합니다.',
    walkInOnly: 'WALK-INS ONLY',
  },

  media: {
    heroInterior: {
      src: '/images/hero_interior.svg',
      alt: 'POCO 드링커리의 미니멀한 바 카운터와 따뜻한 조명 인테리어',
      aspect: '16/10',
    },
    drinkMood: {
      src: '/images/drink_mood.svg',
      alt: '아이보리와 네이비 색면 위에 놓인 세 가지 시그니처 음료 정물',
      aspect: '3/4',
    },
    ingredientProcess: {
      src: '/images/ingredient_process.svg',
      alt: '지역 식재료와 발효를 준비하는 작업대와 바텐더의 손길',
      aspect: '16/10',
    },
  },
};
