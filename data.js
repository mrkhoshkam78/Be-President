// data.js - Difficulty, Playable Countries, NPC Countries, Events, Resources

const DIFFICULTY = {
  easy: {
    id: 'easy',
    name: 'Easy Mode',
    comfort: 10,
    description: 'منابع فراوان، اقتصاد پایدار، بحران‌های کمتر',
    multipliers: {
      startingResources: 1.8, startingBudget: 1.6, taxEfficiency: 1.3,
      inflationRate: 0.4, unemploymentBase: 0.6, satisfactionGain: 1.5,
      infrastructureCost: 0.6, infrastructureSpeed: 1.5, crisisChance: 0.3,
      sanctionImpact: 0.4, militaryCost: 0.7, techCost: 0.65,
      mistakePenalty: 0.4, growthPotential: 1.4, advisorRisk: 0.5,
      covertSuccessBonus: 0.15, aiAggressiveness: 0.6
    }
  },
  medium: {
    id: 'medium',
    name: 'Medium Mode',
    comfort: 5,
    description: 'تعادل بین سرگرمی و چالش',
    multipliers: {
      startingResources: 1.0, startingBudget: 1.0, taxEfficiency: 1.0,
      inflationRate: 1.0, unemploymentBase: 1.0, satisfactionGain: 1.0,
      infrastructureCost: 1.0, infrastructureSpeed: 1.0, crisisChance: 1.0,
      sanctionImpact: 1.0, militaryCost: 1.0, techCost: 1.0,
      mistakePenalty: 1.0, growthPotential: 1.0, advisorRisk: 1.0,
      covertSuccessBonus: 0.0, aiAggressiveness: 1.0
    }
  },
  realistic: {
    id: 'realistic',
    name: 'Realistic Mode',
    comfort: 1,
    description: 'شبیه‌سازی واقع‌گرایانه، چالش بالا، پیامدهای سنگین',
    multipliers: {
      startingResources: 0.7, startingBudget: 0.75, taxEfficiency: 0.85,
      inflationRate: 1.6, unemploymentBase: 1.3, satisfactionGain: 0.7,
      infrastructureCost: 1.4, infrastructureSpeed: 0.7, crisisChance: 1.8,
      sanctionImpact: 1.7, militaryCost: 1.3, techCost: 1.4,
      mistakePenalty: 1.8, growthPotential: 0.75, advisorRisk: 1.5,
      covertSuccessBonus: -0.1, aiAggressiveness: 1.4
    }
  }
};

// Playable countries – each has real different starting state
const PLAYABLE_COUNTRIES = [
  {
    id: 'azaria',
    name: 'آزاریا',
    flag: '🔵',
    color: '#3b82f6',
    region: 'مرکز',
    description: 'کشوری متعادل با اقتصاد متوسط و موقعیت استراتژیک.',
    population: 42000000,
    baseGDP: 480,
    baseBudget: 95,
    debt: 180,
    taxRate: 22,
    inflation: 3.2,
    unemployment: 7.5,
    satisfaction: 52,
    stability: 58,
    infrastructure: 48,
    industrialProduction: 55,
    naturalResources: 65,
    resources: { oil: 40, gas: 35, minerals: 50, agriculture: 60, rare_earth: 15 },
    military: { army: 45, airForce: 38, navy: 32, defenseSystems: 40, tech: 42, readiness: 55 },
    techLevel: 44,
    intelLevel: 40,
    strengths: ['موقعیت مرکزی', 'تنوع منابع', 'ثبات نسبی'],
    weaknesses: ['رقابت منطقه‌ای', 'وابستگی به تجارت'],
    startingRelations: { northalia: 48, eastoria: 32, westland: 55, southmere: 62, centara: 41 },
    economyPower: 55, militaryPower: 48
  },
  {
    id: 'nordheim',
    name: 'نوردهایم',
    flag: '❄️',
    color: '#38bdf8',
    region: 'شمال',
    description: 'قدرت صنعتی و فناوری بالا با منابع انرژی محدود.',
    population: 28000000,
    baseGDP: 620,
    baseBudget: 110,
    debt: 240,
    taxRate: 26,
    inflation: 2.4,
    unemployment: 5.8,
    satisfaction: 61,
    stability: 72,
    infrastructure: 68,
    industrialProduction: 78,
    naturalResources: 42,
    resources: { oil: 18, gas: 55, minerals: 35, agriculture: 40, rare_earth: 28 },
    military: { army: 38, airForce: 52, navy: 48, defenseSystems: 55, tech: 68, readiness: 62 },
    techLevel: 72,
    intelLevel: 58,
    strengths: ['فناوری پیشرفته', 'صنعت قوی', 'آموزش عالی'],
    weaknesses: ['منابع طبیعی محدود', 'هزینه بالای زندگی', 'وابستگی به واردات انرژی'],
    startingRelations: { northalia: 65, eastoria: 28, westland: 70, southmere: 45, centara: 50 },
    economyPower: 78, militaryPower: 58
  },
  {
    id: 'valoria',
    name: 'والوریا',
    flag: '🔴',
    color: '#ef4444',
    region: 'شرق',
    description: 'قدرت نظامی بزرگ با اقتصاد وابسته به منابع و چالش‌های اجتماعی.',
    population: 68000000,
    baseGDP: 410,
    baseBudget: 78,
    debt: 320,
    taxRate: 18,
    inflation: 5.8,
    unemployment: 11.2,
    satisfaction: 41,
    stability: 48,
    infrastructure: 38,
    industrialProduction: 48,
    naturalResources: 82,
    resources: { oil: 75, gas: 60, minerals: 70, agriculture: 55, rare_earth: 22 },
    military: { army: 72, airForce: 55, navy: 40, defenseSystems: 48, tech: 45, readiness: 58 },
    techLevel: 38,
    intelLevel: 52,
    strengths: ['منابع عظیم', 'قدرت نظامی', 'جمعیت بزرگ'],
    weaknesses: ['تورم و بیکاری بالا', 'زیرساخت ضعیف', 'نارضایتی اجتماعی'],
    startingRelations: { northalia: 30, eastoria: 55, westland: 25, southmere: 48, centara: 42 },
    economyPower: 48, militaryPower: 72
  },
  {
    id: 'solara',
    name: 'سولارا',
    flag: '🟡',
    color: '#eab308',
    region: 'جنوب',
    description: 'کشور در حال توسعه با منابع کشاورزی و انرژی خورشیدی بالقوه.',
    population: 55000000,
    baseGDP: 290,
    baseBudget: 55,
    debt: 140,
    taxRate: 16,
    inflation: 6.5,
    unemployment: 13.5,
    satisfaction: 45,
    stability: 50,
    infrastructure: 32,
    industrialProduction: 35,
    naturalResources: 58,
    resources: { oil: 25, gas: 20, minerals: 40, agriculture: 85, rare_earth: 8 },
    military: { army: 35, airForce: 22, navy: 18, defenseSystems: 25, tech: 28, readiness: 42 },
    techLevel: 30,
    intelLevel: 32,
    strengths: ['کشاورزی قوی', 'پتانسیل رشد', 'هزینه پایین نیروی کار'],
    weaknesses: ['فناوری پایین', 'زیرساخت ضعیف', 'وابستگی به کمک خارجی'],
    startingRelations: { northalia: 40, eastoria: 35, westland: 48, southmere: 70, centara: 55 },
    economyPower: 35, militaryPower: 28
  },
  {
    id: 'meridia',
    name: 'مریدیا',
    flag: '🟢',
    color: '#22c55e',
    region: 'غرب',
    description: 'قدرت مالی و تجاری با دیپلماسی قوی و ارتش حرفه‌ای کوچک.',
    population: 35000000,
    baseGDP: 710,
    baseBudget: 130,
    debt: 290,
    taxRate: 28,
    inflation: 2.1,
    unemployment: 4.8,
    satisfaction: 68,
    stability: 78,
    infrastructure: 75,
    industrialProduction: 70,
    naturalResources: 38,
    resources: { oil: 15, gas: 30, minerals: 25, agriculture: 45, rare_earth: 12 },
    military: { army: 32, airForce: 45, navy: 55, defenseSystems: 62, tech: 70, readiness: 70 },
    techLevel: 75,
    intelLevel: 65,
    strengths: ['اقتصاد قوی', 'دیپلماسی', 'فناوری و سرمایه'],
    weaknesses: ['منابع طبیعی کم', 'وابستگی به تجارت جهانی', 'هزینه دفاعی بالا'],
    startingRelations: { northalia: 60, eastoria: 35, westland: 75, southmere: 58, centara: 52 },
    economyPower: 85, militaryPower: 55
  }
];

// NPC countries (for diplomacy / map)
const COUNTRIES = [
  { id: 'northalia', name: 'نورثالیا', flag: '🟦', economyPower: 72, militaryPower: 65, techLevel: 70, stability: 68, interests: ['trade','energy','tech'], attitude: 45 },
  { id: 'eastoria', name: 'ایستوریا', flag: '🟥', economyPower: 58, militaryPower: 78, techLevel: 55, stability: 52, interests: ['military','resources'], attitude: 30 },
  { id: 'westland', name: 'وست‌لند', flag: '🟩', economyPower: 85, militaryPower: 60, techLevel: 82, stability: 75, interests: ['trade','tech','finance'], attitude: 55 },
  { id: 'southmere', name: 'ساوث‌میر', flag: '🟨', economyPower: 42, militaryPower: 35, techLevel: 38, stability: 48, interests: ['resources','agriculture'], attitude: 60 },
  { id: 'centara', name: 'سنتارا', flag: '🟪', economyPower: 63, militaryPower: 55, techLevel: 60, stability: 58, interests: ['energy','trade'], attitude: 40 }
];

const RESOURCE_TYPES = [
  { id: 'oil', name: 'نفت', basePrice: 75, volatility: 0.15 },
  { id: 'gas', name: 'گاز', basePrice: 45, volatility: 0.12 },
  { id: 'minerals', name: 'معادن', basePrice: 30, volatility: 0.08 },
  { id: 'agriculture', name: 'کشاورزی', basePrice: 20, volatility: 0.06 },
  { id: 'rare_earth', name: 'خاک‌های نادر', basePrice: 120, volatility: 0.2 }
];

// Events with player choices
const EVENT_TEMPLATES = [
  {
    id: 'economic_crisis',
    title: 'بحران اقتصادی',
    description: 'رکود باعث کاهش تولید و افزایش بیکاری شده است.',
    type: 'negative', icon: '📉',
    conditions: (s) => s.economy.gdpGrowth < 0.5 || s.economy.inflation > 8,
    probabilityBase: 0.08,
    choices: [
      { id: 'stimulus', label: 'بسته محرک اقتصادی', pros: 'رشد کوتاه‌مدت ↑', cons: 'بدهی و تورم ↑', effects: { budget: -25, gdpGrowth: 1.2, inflation: 1.5, satisfaction: 3 } },
      { id: 'austerity', label: 'ریاضت اقتصادی', pros: 'بدهی ↓', cons: 'رضایت و رشد ↓', effects: { budget: 10, gdpGrowth: -0.8, satisfaction: -5, unemployment: 1 } },
      { id: 'ignore', label: 'عدم مداخله', pros: 'بدون هزینه فوری', cons: 'بحران ممکن است عمیق‌تر شود', effects: { gdpGrowth: -1.2, unemployment: 1.5, satisfaction: -3 } }
    ]
  },
  {
    id: 'resource_discovery',
    title: 'کشف منابع جدید',
    description: 'منابع طبیعی جدیدی کشف شده است.',
    type: 'positive', icon: '⛏️',
    conditions: () => true,
    probabilityBase: 0.05,
    choices: [
      { id: 'exploit', label: 'بهره‌برداری سریع', pros: 'درآمد فوری', cons: 'آسیب محیطی احتمالی', effects: { resources: 15, budget: 12, satisfaction: 2 } },
      { id: 'sustainable', label: 'بهره‌برداری پایدار', pros: 'مزایای بلندمدت', cons: 'بازده کندتر', effects: { resources: 8, infrastructure: 3, satisfaction: 4 } },
      { id: 'reserve', label: 'ذخیره استراتژیک', pros: 'امنیت آینده', cons: 'بدون سود فوری', effects: { stability: 3 } }
    ]
  },
  {
    id: 'energy_crisis',
    title: 'بحران انرژی',
    description: 'قیمت انرژی افزایش یافته و کمبود احساس می‌شود.',
    type: 'negative', icon: '⚡',
    conditions: () => true,
    probabilityBase: 0.07,
    choices: [
      { id: 'domestic', label: 'افزایش تولید داخلی', pros: 'استقلال انرژی', cons: 'هزینه بالا', effects: { budget: -18, resources: 6, inflation: 0.8 } },
      { id: 'negotiate', label: 'مذاکره با متحدان', pros: 'تأمین سریع‌تر', cons: 'وابستگی', effects: { budget: -8, foreignInvestment: -3, relationsBoost: 5 } },
      { id: 'ration', label: 'سهمیه‌بندی', pros: 'کنترل مصرف', cons: 'نارضایتی شدید', effects: { satisfaction: -7, inflation: -0.5 } }
    ]
  },
  {
    id: 'protests',
    title: 'اعتراضات مردمی',
    description: 'مردم به دلیل شرایط اقتصادی یا سیاسی اعتراض می‌کنند.',
    type: 'negative', icon: '📢',
    conditions: (s) => s.population.satisfaction < 42 || s.economy.unemployment > 11,
    probabilityBase: 0.09,
    choices: [
      { id: 'dialogue', label: 'گفتگو و امتیاز', pros: 'آرامش نسبی', cons: 'هزینه بودجه', effects: { budget: -12, satisfaction: 6, stability: 4 } },
      { id: 'reform', label: 'اصلاحات ساختاری', pros: 'حل ریشه‌ای', cons: 'زمان‌بر و پرهزینه', effects: { budget: -20, taxRate: -2, satisfaction: 4, unemployment: -1 } },
      { id: 'suppress', label: 'سخت‌گیری امنیتی', pros: 'کنترل سریع', cons: 'رضایت و آزادی ↓', effects: { satisfaction: -8, stability: 5, military: { readiness: 3 } } }
    ]
  },
  {
    id: 'investment_opportunity',
    title: 'فرصت سرمایه‌گذاری خارجی',
    description: 'سرمایه‌گذاران خارجی علاقه نشان داده‌اند.',
    type: 'positive', icon: '💼',
    conditions: (s) => s.economy.stability > 50 && s.diplomacy.sanctions.length === 0,
    probabilityBase: 0.06,
    choices: [
      { id: 'accept', label: 'پذیرش کامل', pros: 'سرمایه و رشد', cons: 'نفوذ خارجی', effects: { foreignInvestment: 18, gdpGrowth: 0.7, satisfaction: 2 } },
      { id: 'conditional', label: 'پذیرش مشروط', pros: 'کنترل بیشتر', cons: 'سرمایه کمتر', effects: { foreignInvestment: 10, gdpGrowth: 0.4 } },
      { id: 'reject', label: 'رد پیشنهاد', pros: 'استقلال', cons: 'از دست دادن فرصت', effects: { satisfaction: 1 } }
    ]
  },
  {
    id: 'military_threat',
    title: 'تهدید نظامی',
    description: 'فعالیت‌های مشکوک در مرزها گزارش شده.',
    type: 'negative', icon: '🛡️',
    conditions: (s) => s.military.readiness < 50,
    probabilityBase: 0.05,
    choices: [
      { id: 'mobilize', label: 'بسیج نیرو', pros: 'آمادگی ↑', cons: 'هزینه و تنش', effects: { budget: -15, readiness: 12, satisfaction: -2 } },
      { id: 'diplomacy', label: 'دیپلماسی فوری', pros: 'کاهش تنش', cons: 'ممکن است ضعیف به نظر برسد', effects: { budget: -6, relationsBoost: 8 } },
      { id: 'ignore', label: 'نظارت فقط', pros: 'بدون هزینه', cons: 'ریسک غافلگیری', effects: { readiness: -3 } }
    ]
  },
  {
    id: 'tech_breakthrough',
    title: 'پیشرفت فناوری',
    description: 'دانشمندان به پیشرفت مهمی دست یافته‌اند.',
    type: 'positive', icon: '🔬',
    conditions: (s) => s.tech.researchPoints > 25,
    probabilityBase: 0.04,
    choices: [
      { id: 'military', label: 'تمرکز نظامی', pros: 'قدرت دفاعی', cons: 'کمتر برای اقتصاد', effects: { techLevel: 2, militaryTech: 5, readiness: 3 } },
      { id: 'economic', label: 'تمرکز اقتصادی', pros: 'تولید و رشد', cons: 'کمتر برای امنیت', effects: { techLevel: 3, production: 5, gdpGrowth: 0.5 } },
      { id: 'balanced', label: 'توزیع متعادل', pros: 'توسعه همه‌جانبه', cons: 'اثر کمتر در هر بخش', effects: { techLevel: 2, production: 2, militaryTech: 2 } }
    ]
  },
  {
    id: 'diplomatic_crisis',
    title: 'بحران دیپلماتیک',
    description: 'تنش با یکی از کشورها افزایش یافته.',
    type: 'negative', icon: '🌐',
    conditions: (s) => Object.values(s.diplomacy.relations).some(r => r < 35),
    probabilityBase: 0.06,
    choices: [
      { id: 'apologize', label: 'عذرخواهی و جبران', pros: 'بهبود روابط', cons: 'هزینه و وجهه', effects: { budget: -10, relationsBoost: 12, satisfaction: -1 } },
      { id: 'stand', label: 'ایستادگی', pros: 'حفظ غرور ملی', cons: 'تنش بیشتر', effects: { relationsPenalty: 8, satisfaction: 2 } },
      { id: 'mediate', label: 'درخواست میانجیگری', pros: 'کاهش تنش بدون هزینه زیاد', cons: 'نتیجه نامشخص', effects: { relationsBoost: 5, budget: -4 } }
    ]
  },
  {
    id: 'corruption_scandal',
    title: 'رسوایی فساد',
    description: 'یک رسوایی فساد در دولت افشا شده.',
    type: 'negative', icon: '⚖️',
    conditions: (s) => s.meta.difficulty === 'realistic' || Math.random() < 0.25,
    probabilityBase: 0.05,
    choices: [
      { id: 'investigate', label: 'تحقیق شفاف', pros: 'اعتماد بلندمدت', cons: 'آسیب کوتاه‌مدت', effects: { satisfaction: -3, stability: -2, budget: -8 } },
      { id: 'cover', label: 'سرپوش گذاشتن', pros: 'کنترل خبر', cons: 'ریسک افشای بیشتر', effects: { satisfaction: -6, stability: -5 } },
      { id: 'reform', label: 'اصلاحات ضدفساد', pros: 'بهبود ساختاری', cons: 'مقاومت داخلی', effects: { budget: -15, satisfaction: 4, stability: 3 } }
    ]
  },
  {
    id: 'global_crisis',
    title: 'بحران جهانی',
    description: 'بحران بین‌المللی تجارت و سرمایه‌گذاری را مختل کرده.',
    type: 'negative', icon: '🌍',
    conditions: () => true,
    probabilityBase: 0.04,
    choices: [
      { id: 'protect', label: 'حمایت از تولید داخل', pros: 'حفظ اشتغال', cons: 'تورم و انزوا', effects: { unemployment: -1, inflation: 1.2, exports: -4 } },
      { id: 'open', label: 'باز نگه داشتن بازار', pros: 'جذب سرمایه', cons: 'رقابت سخت', effects: { foreignInvestment: 5, unemployment: 1, gdpGrowth: 0.3 } },
      { id: 'aid', label: 'کمک به آسیب‌دیدگان', pros: 'رضایت و وجهه', cons: 'هزینه', effects: { budget: -14, satisfaction: 5 } }
    ]
  }
];
