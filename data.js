// data.js - Difficulty, 20 Real Countries, Resources, Events, Relations Matrix
// Version 2.1 — Real countries + multi-dim relations (Realistic only)

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

/**
 * 20 Real Countries — scaled game values (not 1:1 real GDP).
 * Each has distinct starting experience: economy, military, resources, challenges.
 * Structure is extensible for future countries.
 */
const PLAYABLE_COUNTRIES = [
  {
    id: 'usa',
    name: 'ایالات متحده',
    flag: '🇺🇸',
    color: '#3b82f6',
    region: 'آمریکای شمالی',
    description: 'ابرقدرت اقتصادی و نظامی با فناوری پیشرفته و بدهی بالا.',
    population: 340000000,
    baseGDP: 980,
    baseBudget: 185,
    debt: 520,
    taxRate: 24,
    inflation: 2.8,
    unemployment: 4.2,
    satisfaction: 58,
    stability: 72,
    infrastructure: 82,
    industrialProduction: 88,
    naturalResources: 72,
    resources: { oil: 65, gas: 70, minerals: 55, agriculture: 75, rare_earth: 25 },
    military: { army: 78, airForce: 92, navy: 95, defenseSystems: 90, tech: 95, readiness: 80 },
    techLevel: 94,
    intelLevel: 88,
    strengths: ['قدرت اقتصادی', 'فناوری پیشرفته', 'قدرت نظامی جهانی', 'کشاورزی قوی'],
    weaknesses: ['بدهی ملی بالا', 'قطبی‌سازی سیاسی', 'وابستگی به واردات برخی مواد'],
    economyPower: 98, militaryPower: 96,
    startingChallenge: 'مدیریت بدهی و حفظ برتری فناوری',
    economicOpportunities: ['نوآوری فناوری', 'انرژی تجدیدپذیر', 'صادرات خدمات']
  },
  {
    id: 'china',
    name: 'چین',
    flag: '🇨🇳',
    color: '#ef4444',
    region: 'آسیای شرقی',
    description: 'قدرت اقتصادی در حال صعود با جمعیت عظیم و کنترل دولتی قوی.',
    population: 1410000000,
    baseGDP: 820,
    baseBudget: 155,
    debt: 380,
    taxRate: 20,
    inflation: 2.1,
    unemployment: 5.1,
    satisfaction: 55,
    stability: 78,
    infrastructure: 78,
    industrialProduction: 95,
    naturalResources: 68,
    resources: { oil: 35, gas: 30, minerals: 75, agriculture: 70, rare_earth: 90 },
    military: { army: 90, airForce: 75, navy: 72, defenseSystems: 70, tech: 78, readiness: 75 },
    techLevel: 82,
    intelLevel: 80,
    strengths: ['تولید صنعتی', 'خاک‌های نادر', 'جمعیت و بازار داخلی', 'زیرساخت سریع'],
    weaknesses: ['وابستگی به صادرات', 'چالش جمعیتی', 'تنش‌های ژئوپلیتیک'],
    economyPower: 92, militaryPower: 85,
    startingChallenge: 'تعادل رشد و تنش‌های خارجی',
    economicOpportunities: ['فناوری سبز', 'بازار داخلی', 'کمربند و جاده']
  },
  {
    id: 'russia',
    name: 'روسیه',
    flag: '🇷🇺',
    color: '#dc2626',
    region: 'اوراسیا',
    description: 'قدرت نظامی و انرژی با چالش‌های اقتصادی و جمعیتی.',
    population: 144000000,
    baseGDP: 420,
    baseBudget: 72,
    debt: 160,
    taxRate: 18,
    inflation: 6.5,
    unemployment: 4.8,
    satisfaction: 48,
    stability: 62,
    infrastructure: 52,
    industrialProduction: 58,
    naturalResources: 92,
    resources: { oil: 95, gas: 98, minerals: 80, agriculture: 55, rare_earth: 40 },
    military: { army: 85, airForce: 80, navy: 65, defenseSystems: 78, tech: 72, readiness: 70 },
    techLevel: 68,
    intelLevel: 82,
    strengths: ['منابع انرژی عظیم', 'قدرت نظامی', 'وسعت جغرافیایی', 'اطلاعات قوی'],
    weaknesses: ['وابستگی به انرژی', 'تورم', 'زیرساخت قدیمی', 'چالش جمعیتی'],
    economyPower: 55, militaryPower: 88,
    startingChallenge: 'تنوع‌بخشی اقتصاد و مدیریت تحریم‌ها',
    economicOpportunities: ['انرژی', 'معادن', 'کشاورزی صادراتی']
  },
  {
    id: 'germany',
    name: 'آلمان',
    flag: '🇩🇪',
    color: '#1e3a5f',
    region: 'اروپا',
    description: 'قدرت صنعتی و صادراتی اروپا با جمعیت سالخورده.',
    population: 84000000,
    baseGDP: 720,
    baseBudget: 125,
    debt: 280,
    taxRate: 28,
    inflation: 2.4,
    unemployment: 3.2,
    satisfaction: 65,
    stability: 80,
    infrastructure: 88,
    industrialProduction: 90,
    naturalResources: 35,
    resources: { oil: 8, gas: 15, minerals: 30, agriculture: 50, rare_earth: 10 },
    military: { army: 42, airForce: 55, navy: 40, defenseSystems: 68, tech: 82, readiness: 65 },
    techLevel: 88,
    intelLevel: 72,
    strengths: ['صنعت پیشرفته', 'صادرات', 'مهندسی', 'ثبات سیاسی'],
    weaknesses: ['وابستگی انرژی', 'جمعیت سالخورده', 'هزینه بالای انرژی'],
    economyPower: 88, militaryPower: 55,
    startingChallenge: 'امنیت انرژی و رقابت صنعتی',
    economicOpportunities: ['خودروهای برقی', 'انرژی پاک', 'صادرات فناوری']
  },
  {
    id: 'uk',
    name: 'بریتانیا',
    flag: '🇬🇧',
    color: '#1e40af',
    region: 'اروپا',
    description: 'قدرت مالی و دیپلماتیک با ارتش حرفه‌ای کوچک.',
    population: 68000000,
    baseGDP: 680,
    baseBudget: 115,
    debt: 310,
    taxRate: 26,
    inflation: 3.1,
    unemployment: 4.5,
    satisfaction: 60,
    stability: 72,
    infrastructure: 78,
    industrialProduction: 68,
    naturalResources: 42,
    resources: { oil: 40, gas: 45, minerals: 20, agriculture: 45, rare_earth: 8 },
    military: { army: 48, airForce: 70, navy: 75, defenseSystems: 72, tech: 80, readiness: 72 },
    techLevel: 85,
    intelLevel: 90,
    strengths: ['خدمات مالی', 'دیپلماسی', 'اطلاعات', 'زبان و نرم‌افزار'],
    weaknesses: ['بدهی', 'وابستگی به تجارت', 'چالش‌های پس از برگزیت'],
    economyPower: 82, militaryPower: 68,
    startingChallenge: 'رشد پس از برگزیت و مدیریت بدهی',
    economicOpportunities: ['فین‌تک', 'خدمات', 'انرژی دریایی']
  },
  {
    id: 'france',
    name: 'فرانسه',
    flag: '🇫🇷',
    color: '#2563eb',
    region: 'اروپا',
    description: 'قدرت هسته‌ای و فرهنگی با اقتصاد متنوع.',
    population: 68000000,
    baseGDP: 650,
    baseBudget: 110,
    debt: 340,
    taxRate: 30,
    inflation: 2.6,
    unemployment: 7.2,
    satisfaction: 55,
    stability: 68,
    infrastructure: 80,
    industrialProduction: 72,
    naturalResources: 38,
    resources: { oil: 5, gas: 10, minerals: 25, agriculture: 70, rare_earth: 5 },
    military: { army: 55, airForce: 72, navy: 65, defenseSystems: 75, tech: 78, readiness: 70 },
    techLevel: 82,
    intelLevel: 78,
    strengths: ['انرژی هسته‌ای', 'کشاورزی', 'فرهنگ و گردشگری', 'قدرت نظامی'],
    weaknesses: ['بیکاری ساختاری', 'بدهی بالا', 'اعتراضات اجتماعی'],
    economyPower: 78, militaryPower: 72,
    startingChallenge: 'اصلاحات ساختاری و رضایت عمومی',
    economicOpportunities: ['هسته‌ای', 'لوکس', 'هوافضا']
  },
  {
    id: 'japan',
    name: 'ژاپن',
    flag: '🇯🇵',
    color: '#dc2626',
    region: 'آسیای شرقی',
    description: 'قدرت فناوری و صنعتی با چالش جمعیتی شدید.',
    population: 123000000,
    baseGDP: 700,
    baseBudget: 120,
    debt: 480,
    taxRate: 27,
    inflation: 1.8,
    unemployment: 2.6,
    satisfaction: 62,
    stability: 82,
    infrastructure: 92,
    industrialProduction: 88,
    naturalResources: 18,
    resources: { oil: 2, gas: 5, minerals: 15, agriculture: 35, rare_earth: 12 },
    military: { army: 40, airForce: 65, navy: 70, defenseSystems: 80, tech: 90, readiness: 75 },
    techLevel: 95,
    intelLevel: 75,
    strengths: ['فناوری', 'رباتیک', 'کیفیت صنعتی', 'ثبات اجتماعی'],
    weaknesses: ['منابع طبیعی تقریباً صفر', 'جمعیت سالخورده', 'بدهی بسیار بالا'],
    economyPower: 85, militaryPower: 62,
    startingChallenge: 'پیری جمعیت و وابستگی انرژی',
    economicOpportunities: ['رباتیک', 'نیمه‌هادی', 'انرژی هیدروژن']
  },
  {
    id: 'india',
    name: 'هند',
    flag: '🇮🇳',
    color: '#ea580c',
    region: 'آسیای جنوبی',
    description: 'دموکراسی بزرگ با رشد سریع و چالش‌های زیرساختی.',
    population: 1420000000,
    baseGDP: 480,
    baseBudget: 85,
    debt: 220,
    taxRate: 18,
    inflation: 5.2,
    unemployment: 7.8,
    satisfaction: 52,
    stability: 58,
    infrastructure: 48,
    industrialProduction: 62,
    naturalResources: 55,
    resources: { oil: 20, gas: 25, minerals: 50, agriculture: 80, rare_earth: 20 },
    military: { army: 75, airForce: 60, navy: 55, defenseSystems: 55, tech: 58, readiness: 65 },
    techLevel: 55,
    intelLevel: 60,
    strengths: ['جمعیت جوان', 'IT و خدمات', 'کشاورزی', 'بازار داخلی'],
    weaknesses: ['زیرساخت ضعیف', 'بیکاری', 'نابرابری', 'بوروکراسی'],
    economyPower: 65, militaryPower: 70,
    startingChallenge: 'اشتغال و زیرساخت برای جمعیت عظیم',
    economicOpportunities: ['دیجیتال', 'تولید', 'انرژی خورشیدی']
  },
  {
    id: 'brazil',
    name: 'برزیل',
    flag: '🇧🇷',
    color: '#16a34a',
    region: 'آمریکای جنوبی',
    description: 'قدرت کشاورزی و منابع با چالش‌های اجتماعی و فساد.',
    population: 216000000,
    baseGDP: 380,
    baseBudget: 68,
    debt: 210,
    taxRate: 22,
    inflation: 4.8,
    unemployment: 8.5,
    satisfaction: 48,
    stability: 52,
    infrastructure: 45,
    industrialProduction: 55,
    naturalResources: 85,
    resources: { oil: 55, gas: 40, minerals: 70, agriculture: 95, rare_earth: 15 },
    military: { army: 50, airForce: 42, navy: 40, defenseSystems: 40, tech: 45, readiness: 55 },
    techLevel: 48,
    intelLevel: 45,
    strengths: ['کشاورزی و دام', 'منابع طبیعی', 'انرژی تجدیدپذیر', 'بازار بزرگ'],
    weaknesses: ['نابرابری', 'فساد', 'زیرساخت', 'نوسان اقتصادی'],
    economyPower: 55, militaryPower: 48,
    startingChallenge: 'ثبات اقتصاد و کاهش نابرابری',
    economicOpportunities: ['کشاورزی صادراتی', 'معادن', 'انرژی سبز']
  },
  {
    id: 'canada',
    name: 'کانادا',
    flag: '🇨🇦',
    color: '#dc2626',
    region: 'آمریکای شمالی',
    description: 'اقتصاد منابع‌محور پایدار با جمعیت کم و استاندارد بالا.',
    population: 40000000,
    baseGDP: 620,
    baseBudget: 105,
    debt: 240,
    taxRate: 26,
    inflation: 2.5,
    unemployment: 5.5,
    satisfaction: 70,
    stability: 85,
    infrastructure: 80,
    industrialProduction: 65,
    naturalResources: 90,
    resources: { oil: 80, gas: 85, minerals: 75, agriculture: 65, rare_earth: 30 },
    military: { army: 35, airForce: 48, navy: 40, defenseSystems: 55, tech: 70, readiness: 65 },
    techLevel: 78,
    intelLevel: 68,
    strengths: ['منابع طبیعی', 'ثبات سیاسی', 'کیفیت زندگی', 'آموزش'],
    weaknesses: ['وابستگی به آمریکا', 'جمعیت کم', 'هزینه دفاعی سرانه'],
    economyPower: 75, militaryPower: 48,
    startingChallenge: 'تنوع اقتصادی فراتر از منابع',
    economicOpportunities: ['انرژی', 'معادن', 'فناوری پاک']
  },
  {
    id: 'australia',
    name: 'استرالیا',
    flag: '🇦🇺',
    color: '#1e3a8a',
    region: 'اقیانوسیه',
    description: 'اقتصاد معدنی قوی با موقعیت استراتژیک اقیانوس آرام.',
    population: 27000000,
    baseGDP: 580,
    baseBudget: 95,
    debt: 190,
    taxRate: 25,
    inflation: 3.0,
    unemployment: 4.0,
    satisfaction: 68,
    stability: 82,
    infrastructure: 75,
    industrialProduction: 58,
    naturalResources: 88,
    resources: { oil: 30, gas: 60, minerals: 95, agriculture: 70, rare_earth: 45 },
    military: { army: 38, airForce: 55, navy: 50, defenseSystems: 60, tech: 72, readiness: 70 },
    techLevel: 75,
    intelLevel: 70,
    strengths: ['معادن و صادرات', 'کشاورزی', 'موقعیت جغرافیایی', 'ثبات'],
    weaknesses: ['وابستگی به چین', 'جمعیت کم', 'فاصله از بازارها'],
    economyPower: 72, militaryPower: 52,
    startingChallenge: 'تنوع شرکای تجاری و دفاع',
    economicOpportunities: ['لیتیوم و خاک نادر', 'انرژی', 'خدمات']
  },
  {
    id: 'turkey',
    name: 'ترکیه',
    flag: '🇹🇷',
    color: '#e11d48',
    region: 'خاورمیانه / اروپا',
    description: 'پل استراتژیک بین شرق و غرب با اقتصاد پرنوسان.',
    population: 86000000,
    baseGDP: 360,
    baseBudget: 62,
    debt: 180,
    taxRate: 20,
    inflation: 12.5,
    unemployment: 9.5,
    satisfaction: 45,
    stability: 50,
    infrastructure: 55,
    industrialProduction: 60,
    naturalResources: 40,
    resources: { oil: 10, gas: 15, minerals: 45, agriculture: 65, rare_earth: 10 },
    military: { army: 72, airForce: 58, navy: 50, defenseSystems: 55, tech: 55, readiness: 70 },
    techLevel: 52,
    intelLevel: 65,
    strengths: ['موقعیت استراتژیک', 'صنعت دفاعی رو به رشد', 'جوانی جمعیت', 'گردشگری'],
    weaknesses: ['تورم بالا', 'نوسان ارزی', 'قطبی‌سازی سیاسی'],
    economyPower: 52, militaryPower: 68,
    startingChallenge: 'کنترل تورم و ثبات سیاسی',
    economicOpportunities: ['تولید', 'گردشگری', 'انرژی ترانزیت']
  },
  {
    id: 'italy',
    name: 'ایتالیا',
    flag: '🇮🇹',
    color: '#16a34a',
    region: 'اروپا',
    description: 'اقتصاد متنوع با بدهی بالا و قدرت صنعتی منطقه‌ای.',
    population: 59000000,
    baseGDP: 520,
    baseBudget: 88,
    debt: 380,
    taxRate: 28,
    inflation: 2.9,
    unemployment: 7.8,
    satisfaction: 52,
    stability: 58,
    infrastructure: 70,
    industrialProduction: 68,
    naturalResources: 25,
    resources: { oil: 5, gas: 10, minerals: 20, agriculture: 60, rare_earth: 5 },
    military: { army: 40, airForce: 52, navy: 48, defenseSystems: 55, tech: 65, readiness: 60 },
    techLevel: 70,
    intelLevel: 60,
    strengths: ['صنعت لوکس و ماشین', 'گردشگری', 'کشاورزی', 'طراحی'],
    weaknesses: ['بدهی عمومی', 'بیکاری جوانان', 'بوروکراسی'],
    economyPower: 68, militaryPower: 52,
    startingChallenge: 'کاهش بدهی و رشد پایدار',
    economicOpportunities: ['گردشگری', 'مد و طراحی', 'انرژی سبز']
  },
  {
    id: 'spain',
    name: 'اسپانیا',
    flag: '🇪🇸',
    color: '#dc2626',
    region: 'اروپا',
    description: 'اقتصاد گردشگری و خدمات با چالش بیکاری ساختاری.',
    population: 48000000,
    baseGDP: 450,
    baseBudget: 78,
    debt: 290,
    taxRate: 25,
    inflation: 3.2,
    unemployment: 12.5,
    satisfaction: 55,
    stability: 65,
    infrastructure: 72,
    industrialProduction: 55,
    naturalResources: 30,
    resources: { oil: 3, gas: 5, minerals: 25, agriculture: 65, rare_earth: 8 },
    military: { army: 38, airForce: 48, navy: 45, defenseSystems: 50, tech: 60, readiness: 58 },
    techLevel: 65,
    intelLevel: 55,
    strengths: ['گردشگری', 'کشاورزی', 'انرژی تجدیدپذیر', 'فرهنگ'],
    weaknesses: ['بیکاری بالا', 'بدهی', 'وابستگی گردشگری'],
    economyPower: 62, militaryPower: 48,
    startingChallenge: 'اشتغال و تنوع اقتصادی',
    economicOpportunities: ['انرژی خورشیدی', 'گردشگری پایدار', 'صادرات کشاورزی']
  },
  {
    id: 'south_korea',
    name: 'کره جنوبی',
    flag: '🇰🇷',
    color: '#1d4ed8',
    region: 'آسیای شرقی',
    description: 'قدرت فناوری و صادرات با تهدید امنیتی دائمی.',
    population: 52000000,
    baseGDP: 580,
    baseBudget: 98,
    debt: 200,
    taxRate: 24,
    inflation: 2.3,
    unemployment: 3.0,
    satisfaction: 60,
    stability: 70,
    infrastructure: 85,
    industrialProduction: 85,
    naturalResources: 15,
    resources: { oil: 1, gas: 2, minerals: 10, agriculture: 30, rare_earth: 5 },
    military: { army: 70, airForce: 72, navy: 55, defenseSystems: 80, tech: 85, readiness: 85 },
    techLevel: 92,
    intelLevel: 78,
    strengths: ['نیمه‌هادی و الکترونیک', 'کشتی‌سازی', 'آموزش', 'نوآوری'],
    weaknesses: ['وابستگی انرژی', 'تهدید همسایه', 'فشار جمعیتی'],
    economyPower: 80, militaryPower: 75,
    startingChallenge: 'امنیت و وابستگی به صادرات',
    economicOpportunities: ['چیپ', 'باتری', 'هیدروژن']
  },
  {
    id: 'indonesia',
    name: 'اندونزی',
    flag: '🇮🇩',
    color: '#dc2626',
    region: 'آسیای جنوب‌شرقی',
    description: 'اقتصاد در حال رشد با منابع غنی و جمعیت جوان.',
    population: 280000000,
    baseGDP: 320,
    baseBudget: 55,
    debt: 150,
    taxRate: 16,
    inflation: 3.5,
    unemployment: 5.8,
    satisfaction: 55,
    stability: 60,
    infrastructure: 42,
    industrialProduction: 50,
    naturalResources: 75,
    resources: { oil: 45, gas: 50, minerals: 65, agriculture: 70, rare_earth: 25 },
    military: { army: 55, airForce: 35, navy: 40, defenseSystems: 35, tech: 40, readiness: 55 },
    techLevel: 42,
    intelLevel: 45,
    strengths: ['منابع طبیعی', 'جمعیت جوان', 'موقعیت استراتژیک', 'بازار داخلی'],
    weaknesses: ['زیرساخت', 'فساد', 'نابرابری منطقه‌ای'],
    economyPower: 48, militaryPower: 45,
    startingChallenge: 'توسعه زیرساخت و صنعتی‌سازی',
    economicOpportunities: ['نیکل و باتری', 'تولید', 'گردشگری']
  },
  {
    id: 'saudi',
    name: 'عربستان سعودی',
    flag: '🇸🇦',
    color: '#166534',
    region: 'خاورمیانه',
    description: 'قدرت نفتی در حال تنوع‌بخشی با بودجه بالا.',
    population: 37000000,
    baseGDP: 480,
    baseBudget: 130,
    debt: 120,
    taxRate: 12,
    inflation: 2.5,
    unemployment: 6.0,
    satisfaction: 58,
    stability: 70,
    infrastructure: 65,
    industrialProduction: 45,
    naturalResources: 95,
    resources: { oil: 98, gas: 70, minerals: 40, agriculture: 15, rare_earth: 10 },
    military: { army: 55, airForce: 65, navy: 35, defenseSystems: 60, tech: 55, readiness: 65 },
    techLevel: 50,
    intelLevel: 55,
    strengths: ['نفت و گاز', 'سرمایه مالی', 'موقعیت انرژی', 'چشم‌انداز تنوع'],
    weaknesses: ['وابستگی شدید به نفت', 'تنوع محدود', 'چالش‌های اجتماعی'],
    economyPower: 68, militaryPower: 58,
    startingChallenge: 'کاهش وابستگی به نفت',
    economicOpportunities: ['توریست', 'انرژی سبز', 'سرمایه‌گذاری خارجی']
  },
  {
    id: 'mexico',
    name: 'مکزیک',
    flag: '🇲🇽',
    color: '#16a34a',
    region: 'آمریکای شمالی',
    description: 'اقتصاد نزدیک به آمریکا با چالش امنیت و نابرابری.',
    population: 130000000,
    baseGDP: 340,
    baseBudget: 58,
    debt: 170,
    taxRate: 18,
    inflation: 4.5,
    unemployment: 3.5,
    satisfaction: 48,
    stability: 48,
    infrastructure: 50,
    industrialProduction: 60,
    naturalResources: 55,
    resources: { oil: 50, gas: 40, minerals: 55, agriculture: 60, rare_earth: 12 },
    military: { army: 45, airForce: 35, navy: 30, defenseSystems: 35, tech: 40, readiness: 50 },
    techLevel: 45,
    intelLevel: 42,
    strengths: ['نزدیکی به بازار آمریکا', 'تولید', 'منابع', 'جوانی'],
    weaknesses: ['امنیت داخلی', 'نابرابری', 'فساد', 'وابستگی تجاری'],
    economyPower: 52, militaryPower: 40,
    startingChallenge: 'امنیت و کاهش نابرابری',
    economicOpportunities: ['نیرشوریگ', 'تولید خودرو', 'انرژی']
  },
  {
    id: 'south_africa',
    name: 'آفریقای جنوبی',
    flag: '🇿🇦',
    color: '#ca8a04',
    region: 'آفریقا',
    description: 'اقتصاد متنوع آفریقا با چالش‌های اجتماعی و انرژی.',
    population: 62000000,
    baseGDP: 280,
    baseBudget: 48,
    debt: 160,
    taxRate: 28,
    inflation: 5.5,
    unemployment: 32.0,
    satisfaction: 40,
    stability: 45,
    infrastructure: 48,
    industrialProduction: 50,
    naturalResources: 80,
    resources: { oil: 5, gas: 10, minerals: 95, agriculture: 50, rare_earth: 35 },
    military: { army: 40, airForce: 35, navy: 30, defenseSystems: 35, tech: 42, readiness: 50 },
    techLevel: 48,
    intelLevel: 45,
    strengths: ['معادن غنی', 'زیرساخت نسبی', 'بازار منطقه‌ای', 'منابع'],
    weaknesses: ['بیکاری بسیار بالا', 'نابرابری', 'بحران انرژی', 'جرم'],
    economyPower: 42, militaryPower: 38,
    startingChallenge: 'اشتغال و بحران انرژی',
    economicOpportunities: ['معادن', 'انرژی تجدیدپذیر', 'گردشگری']
  },
  {
    id: 'egypt',
    name: 'مصر',
    flag: '🇪🇬',
    color: '#b45309',
    region: 'خاورمیانه / آفریقا',
    description: 'قدرت جمعیتی و استراتژیک با چالش‌های اقتصادی عمیق.',
    population: 110000000,
    baseGDP: 260,
    baseBudget: 42,
    debt: 200,
    taxRate: 15,
    inflation: 8.5,
    unemployment: 7.5,
    satisfaction: 42,
    stability: 50,
    infrastructure: 40,
    industrialProduction: 42,
    naturalResources: 45,
    resources: { oil: 35, gas: 45, minerals: 30, agriculture: 55, rare_earth: 5 },
    military: { army: 65, airForce: 50, navy: 35, defenseSystems: 45, tech: 45, readiness: 60 },
    techLevel: 40,
    intelLevel: 55,
    strengths: ['موقعیت کانال سوئز', 'جمعیت', 'ارتش بزرگ', 'گردشگری تاریخی'],
    weaknesses: ['تورم', 'بدهی', 'بیکاری جوانان', 'وابستگی واردات غذا'],
    economyPower: 38, militaryPower: 58,
    startingChallenge: 'ثبات اقتصاد و اشتغال',
    economicOpportunities: ['کانال سوئز', 'انرژی', 'گردشگری', 'تولید']
  }
];

// All countries are in PLAYABLE_COUNTRIES. NPCs = others when player chooses one.
const COUNTRIES = PLAYABLE_COUNTRIES.map(c => ({
  id: c.id,
  name: c.name,
  flag: c.flag,
  color: c.color,
  region: c.region,
  economyPower: c.economyPower,
  militaryPower: c.militaryPower,
  techLevel: c.techLevel,
  stability: c.stability,
  interests: deriveInterests(c),
  attitude: 50
}));

function deriveInterests(c) {
  const interests = [];
  if (c.resources.oil > 60 || c.resources.gas > 60) interests.push('energy');
  if (c.economyPower > 70) interests.push('trade', 'finance');
  if (c.militaryPower > 70) interests.push('military');
  if (c.techLevel > 75) interests.push('tech');
  if (c.resources.agriculture > 65) interests.push('agriculture');
  if (c.resources.minerals > 60 || c.resources.rare_earth > 30) interests.push('resources');
  if (interests.length === 0) interests.push('trade');
  return [...new Set(interests)];
}

const RESOURCE_TYPES = [
  { id: 'oil', name: 'نفت', basePrice: 75, volatility: 0.15 },
  { id: 'gas', name: 'گاز', basePrice: 45, volatility: 0.12 },
  { id: 'minerals', name: 'معادن', basePrice: 30, volatility: 0.08 },
  { id: 'agriculture', name: 'کشاورزی', basePrice: 20, volatility: 0.06 },
  { id: 'rare_earth', name: 'خاک‌های نادر', basePrice: 120, volatility: 0.2 }
];

/**
 * Base political relations matrix (0-100).
 * Used to seed Realistic Mode multi-dimensional relations.
 * Logical, structural (not current-event based). Extensible.
 */
const BASE_RELATIONS = {
  // USA allies / partners
  usa: { china: 28, russia: 22, germany: 72, uk: 88, france: 75, japan: 82, india: 62, brazil: 58, canada: 92, australia: 85, turkey: 48, italy: 70, spain: 68, south_korea: 80, indonesia: 55, saudi: 55, mexico: 65, south_africa: 52, egypt: 48 },
  china: { usa: 28, russia: 68, germany: 55, uk: 42, france: 48, japan: 32, india: 35, brazil: 58, canada: 50, australia: 38, turkey: 52, italy: 50, spain: 48, south_korea: 45, indonesia: 62, saudi: 55, mexico: 52, south_africa: 58, egypt: 55 },
  russia: { usa: 22, china: 68, germany: 35, uk: 28, france: 32, japan: 30, india: 58, brazil: 48, canada: 30, australia: 28, turkey: 55, italy: 38, spain: 35, south_korea: 32, indonesia: 48, saudi: 42, mexico: 40, south_africa: 50, egypt: 55 },
  germany: { usa: 72, china: 55, russia: 35, uk: 75, france: 85, japan: 70, india: 58, brazil: 55, canada: 72, australia: 68, turkey: 52, italy: 78, spain: 75, south_korea: 65, indonesia: 52, saudi: 48, mexico: 55, south_africa: 55, egypt: 48 },
  uk: { usa: 88, china: 42, russia: 28, germany: 75, france: 72, japan: 75, india: 65, brazil: 55, canada: 80, australia: 85, turkey: 50, italy: 68, spain: 70, south_korea: 70, indonesia: 55, saudi: 58, mexico: 55, south_africa: 60, egypt: 52 },
  france: { usa: 75, china: 48, russia: 32, germany: 85, uk: 72, japan: 68, india: 55, brazil: 52, canada: 70, australia: 65, turkey: 45, italy: 75, spain: 72, south_korea: 62, indonesia: 50, saudi: 45, mexico: 52, south_africa: 55, egypt: 55 },
  japan: { usa: 82, china: 32, russia: 30, germany: 70, uk: 75, france: 68, india: 58, brazil: 52, canada: 72, australia: 78, turkey: 48, italy: 65, spain: 62, south_korea: 55, indonesia: 60, saudi: 50, mexico: 52, south_africa: 50, egypt: 48 },
  india: { usa: 62, china: 35, russia: 58, germany: 58, uk: 65, france: 55, japan: 58, brazil: 55, canada: 60, australia: 62, turkey: 52, italy: 55, spain: 52, south_korea: 55, indonesia: 58, saudi: 55, mexico: 50, south_africa: 55, egypt: 52 },
  brazil: { usa: 58, china: 58, russia: 48, germany: 55, uk: 55, france: 52, japan: 52, india: 55, canada: 55, australia: 52, turkey: 48, italy: 55, spain: 58, south_korea: 50, indonesia: 52, saudi: 48, mexico: 60, south_africa: 55, egypt: 48 },
  canada: { usa: 92, china: 50, russia: 30, germany: 72, uk: 80, france: 70, japan: 72, india: 60, brazil: 55, australia: 75, turkey: 50, italy: 65, spain: 65, south_korea: 68, indonesia: 55, saudi: 50, mexico: 68, south_africa: 55, egypt: 50 },
  australia: { usa: 85, china: 38, russia: 28, germany: 68, uk: 85, france: 65, japan: 78, india: 62, brazil: 52, canada: 75, turkey: 48, italy: 62, spain: 60, south_korea: 70, indonesia: 65, saudi: 50, mexico: 52, south_africa: 55, egypt: 48 },
  turkey: { usa: 48, china: 52, russia: 55, germany: 52, uk: 50, france: 45, japan: 48, india: 52, brazil: 48, canada: 50, australia: 48, italy: 52, spain: 50, south_korea: 48, indonesia: 52, saudi: 45, mexico: 48, south_africa: 50, egypt: 58 },
  italy: { usa: 70, china: 50, russia: 38, germany: 78, uk: 68, france: 75, japan: 65, india: 55, brazil: 55, canada: 65, australia: 62, turkey: 52, spain: 78, south_korea: 58, indonesia: 50, saudi: 48, mexico: 52, south_africa: 52, egypt: 52 },
  spain: { usa: 68, china: 48, russia: 35, germany: 75, uk: 70, france: 72, japan: 62, india: 52, brazil: 58, canada: 65, australia: 60, turkey: 50, italy: 78, south_korea: 55, indonesia: 50, saudi: 48, mexico: 55, south_africa: 52, egypt: 50 },
  south_korea: { usa: 80, china: 45, russia: 32, germany: 65, uk: 70, france: 62, japan: 55, india: 55, brazil: 50, canada: 68, australia: 70, turkey: 48, italy: 58, spain: 55, indonesia: 55, saudi: 50, mexico: 50, south_africa: 50, egypt: 48 },
  indonesia: { usa: 55, china: 62, russia: 48, germany: 52, uk: 55, france: 50, japan: 60, india: 58, brazil: 52, canada: 55, australia: 65, turkey: 52, italy: 50, spain: 50, south_korea: 55, saudi: 52, mexico: 50, south_africa: 52, egypt: 50 },
  saudi: { usa: 55, china: 55, russia: 42, germany: 48, uk: 58, france: 45, japan: 50, india: 55, brazil: 48, canada: 50, australia: 50, turkey: 45, italy: 48, spain: 48, south_korea: 50, indonesia: 52, mexico: 48, south_africa: 50, egypt: 62 },
  mexico: { usa: 65, china: 52, russia: 40, germany: 55, uk: 55, france: 52, japan: 52, india: 50, brazil: 60, canada: 68, australia: 52, turkey: 48, italy: 52, spain: 55, south_korea: 50, indonesia: 50, saudi: 48, south_africa: 50, egypt: 48 },
  south_africa: { usa: 52, china: 58, russia: 50, germany: 55, uk: 60, france: 55, japan: 50, india: 55, brazil: 55, canada: 55, australia: 55, turkey: 50, italy: 52, spain: 52, south_korea: 50, indonesia: 52, saudi: 50, mexico: 50, egypt: 55 },
  egypt: { usa: 48, china: 55, russia: 55, germany: 48, uk: 52, france: 55, japan: 48, india: 52, brazil: 48, canada: 50, australia: 48, turkey: 58, italy: 52, spain: 50, south_korea: 48, indonesia: 50, saudi: 62, mexico: 48, south_africa: 55 }
};

/** Create multi-dim relation object for Realistic Mode */
function createMultiDimRelation(basePolitical, fromCountry, toCountry) {
  const economic = Math.round(Math.max(10, Math.min(90, basePolitical + (fromCountry.economyPower - 50) * 0.15 + (toCountry.economyPower - 50) * 0.1)));
  const military = Math.round(Math.max(10, Math.min(90, basePolitical * 0.7 + (100 - Math.abs(fromCountry.militaryPower - toCountry.militaryPower)) * 0.3)));
  const trust = Math.round(Math.max(5, Math.min(95, basePolitical * 0.85 + (Math.random() * 10 - 5))));
  const strategic = Math.round(Math.max(10, Math.min(90, (fromCountry.economyPower + toCountry.economyPower) / 2 * 0.4 + basePolitical * 0.5)));
  const threat = Math.round(Math.max(5, Math.min(90, 100 - basePolitical + (toCountry.militaryPower - fromCountry.militaryPower) * 0.3)));
  return {
    political: basePolitical,
    economic,
    military,
    trust,
    strategicInterest: strategic,
    threatLevel: threat,
    overall: Math.round((basePolitical * 0.3 + economic * 0.25 + military * 0.15 + trust * 0.2 + strategic * 0.1))
  };
}

function getCountryById(id) {
  return PLAYABLE_COUNTRIES.find(c => c.id === id) || COUNTRIES.find(c => c.id === id);
}

function getCountryName(id) {
  const c = getCountryById(id);
  return c ? c.name : id;
}

function getCountryFlag(id) {
  const c = getCountryById(id);
  return c ? c.flag : '🏳️';
}

// Events with player choices
const EVENT_TEMPLATES = [
  {
    id: 'economic_crisis',
    title: 'بحران اقتصادی',
    description: 'رکود باعث کاهش تولید و افزایش بیکاری شده است.',
    type: 'negative', icon: '📉', category: 'economy',
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
    type: 'positive', icon: '⛏️', category: 'economy',
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
    type: 'negative', icon: '⚡', category: 'economy',
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
    type: 'negative', icon: '📢', category: 'domestic',
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
    type: 'positive', icon: '💼', category: 'economy',
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
    type: 'negative', icon: '🛡️', category: 'military',
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
    type: 'positive', icon: '🔬', category: 'tech',
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
    type: 'negative', icon: '🌐', category: 'diplomacy',
    conditions: (s) => {
      const rels = s.diplomacy.relations;
      return Object.values(rels).some(r => (typeof r === 'number' ? r : r.overall || r.political) < 35);
    },
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
    type: 'negative', icon: '⚖️', category: 'domestic',
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
    type: 'negative', icon: '🌍', category: 'global',
    conditions: () => true,
    probabilityBase: 0.04,
    choices: [
      { id: 'protect', label: 'حمایت از تولید داخل', pros: 'حفظ اشتغال', cons: 'تورم و انزوا', effects: { unemployment: -1, inflation: 1.2, exports: -4 } },
      { id: 'open', label: 'باز نگه داشتن بازار', pros: 'جذب سرمایه', cons: 'رقابت سخت', effects: { foreignInvestment: 5, unemployment: 1, gdpGrowth: 0.3 } },
      { id: 'aid', label: 'کمک به آسیب‌دیدگان', pros: 'رضایت و وجهه', cons: 'هزینه', effects: { budget: -14, satisfaction: 5 } }
    ]
  }
];

/** Action definitions — categorized for modern Actions panel */
const ACTION_CATEGORIES = [
  {
    id: 'economy',
    name: 'اقتصادی',
    icon: '💰',
    actions: [
      { id: 'change_tax', name: 'تغییر نرخ مالیات', icon: '📊', desc: 'تنظیم نرخ مالیات مستقیم', cost: '—', time: 'فوری', impact: 'درآمد و رضایت', risk: 'متوسط', needsConfirm: true },
      { id: 'invest_infra', name: 'سرمایه‌گذاری زیرساخت', icon: '🏗️', desc: 'پروژه زیرساخت و رشد بلندمدت', cost: 'بودجه', time: 'چند ماه', impact: 'رشد و رضایت', risk: 'کم' },
      { id: 'trade_policy', name: 'سیاست تجاری', icon: '🚢', desc: 'تنظیم تعرفه و روابط تجاری', cost: 'کم', time: 'فوری', impact: 'تراز تجاری', risk: 'متوسط' }
    ]
  },
  {
    id: 'domestic',
    name: 'داخلی',
    icon: '👥',
    actions: [
      { id: 'social_policy', name: 'سیاست اجتماعی', icon: '🤝', desc: 'افزایش خدمات عمومی و رضایت', cost: 'بودجه', time: 'فوری', impact: 'رضایت ↑', risk: 'کم' },
      { id: 'employment', name: 'برنامه اشتغال', icon: '💼', desc: 'کاهش بیکاری با هزینه بودجه', cost: 'بودجه', time: 'چند ماه', impact: 'بیکاری ↓', risk: 'کم' },
      { id: 'public_services', name: 'تقویت خدمات عمومی', icon: '🏥', desc: 'بهداشت و آموزش', cost: 'بودجه', time: 'فوری', impact: 'رضایت و ثبات', risk: 'کم' }
    ]
  },
  {
    id: 'military',
    name: 'نظامی',
    icon: '⚔️',
    actions: [
      { id: 'mil_budget', name: 'بودجه نظامی', icon: '💵', desc: 'تنظیم بودجه دفاعی', cost: '—', time: 'فوری', impact: 'آمادگی', risk: 'کم' },
      { id: 'develop_force', name: 'تقویت نیرو', icon: '🪖', desc: 'توسعه ارتش، هوایی یا دریایی', cost: 'بودجه', time: 'چند ماه', impact: 'قدرت نظامی', risk: 'کم' },
      { id: 'research_mil', name: 'تحقیق نظامی', icon: '🔬', desc: 'افزایش فناوری دفاعی', cost: 'بودجه + امتیاز', time: 'فوری', impact: 'تکنولوژی', risk: 'کم' },
      { id: 'train', name: 'تمرینات آمادگی', icon: '🎯', desc: 'افزایش آمادگی نیروها', cost: 'بودجه', time: 'فوری', impact: 'آمادگی ↑', risk: 'کم' }
    ]
  },
  {
    id: 'intelligence',
    name: 'اطلاعاتی',
    icon: '🕵️',
    actions: [
      { id: 'intel_budget', name: 'بودجه اطلاعات', icon: '💵', desc: 'تنظیم بودجه سازمان اطلاعات', cost: '—', time: 'فوری', impact: 'سطح اطلاعات', risk: 'کم' },
      { id: 'gather_intel', name: 'جمع‌آوری اطلاعات', icon: '📡', desc: 'عملیات جمع‌آوری داخلی/خارجی', cost: 'بودجه', time: 'فوری', impact: 'سطح اطلاعات', risk: 'متوسط' },
      { id: 'covert', name: 'عملیات مخفی', icon: '🌑', desc: 'عملیات خارجی یا ضدجاسوسی', cost: 'بودجه', time: 'چند ماه', impact: 'متغیر', risk: 'بالا', needsConfirm: true }
    ]
  },
  {
    id: 'diplomacy',
    name: 'دیپلماتیک',
    icon: '🌐',
    actions: [
      { id: 'improve_rel', name: 'بهبود روابط', icon: '🤝', desc: 'سرمایه‌گذاری دیپلماتیک روی یک کشور', cost: 'بودجه', time: 'فوری', impact: 'روابط ↑', risk: 'کم' },
      { id: 'propose_agree', name: 'پیشنهاد توافق', icon: '📜', desc: 'تجاری، اقتصادی، دفاعی یا نظامی', cost: 'بودجه', time: 'فوری', impact: 'توافق / روابط', risk: 'متوسط', needsConfirm: true },
      { id: 'sanction', name: 'تحریم / رفع تحریم', icon: '🚫', desc: 'اعمال یا رفع تحریم علیه کشورها', cost: 'سیاسی', time: 'فوری', impact: 'روابط و اقتصاد', risk: 'بالا', needsConfirm: true }
    ]
  }
];
