/**
 * Semantic Validation Layer for Balanced Duration-Aware Dubbing.
 *
 * Prevents translations from sacrificing critical meaning, dropping essential clauses,
 * skipping numerical values, or flipping logical negation merely to achieve shorter audio duration.
 *
 * Implements deterministic checks for:
 * 1. Numbers, digits, dates, and order rankings.
 * 2. Logical negation markers (not/never/don't vs نـ/نیست/هیچ).
 * 3. Named entities and technical terms (Docker, API, Callback, VMware, etc.).
 * 4. Propositional completeness (clause preservation).
 */

export interface SemanticValidationResult {
  semanticScore: number;        // 0 - 100
  naturalnessScore: number;     // 0 - 100
  validationStatus: 'valid' | 'invalid' | 'needs_review';
  validationReasonFa: string;
  numberCheckPassed: boolean;
  negationCheckPassed: boolean;
  entityCheckPassed: boolean;
  missingEntities: string[];
}

// English to Persian number mapping
const NUMBER_PAIRS: Array<{ enRegex: RegExp; faRegex: RegExp; label: string }> = [
  { enRegex: /\b(zero|0)\b/i, faRegex: /(صفر|۰|0)/, label: '0' },
  { enRegex: /\b(one|first|1|1st)\b/i, faRegex: /(یک|اول|نخست|۱|1)/, label: '1' },
  { enRegex: /\b(two|second|2|2nd)\b/i, faRegex: /(دو|دوم|۲|2)/, label: '2' },
  { enRegex: /\b(three|third|3|3rd)\b/i, faRegex: /(سه|سوم|۳|3)/, label: '3' },
  { enRegex: /\b(four|fourth|4|4th)\b/i, faRegex: /(چهار|چهارم|۴|4)/, label: '4' },
  { enRegex: /\b(five|fifth|5|5th)\b/i, faRegex: /(پنج|پنجم|۵|5)/, label: '5' },
  { enRegex: /\b(six|sixth|6|6th)\b/i, faRegex: /(شش|ششم|۶|6)/, label: '6' },
  { enRegex: /\b(seven|seventh|7|7th)\b/i, faRegex: /(هفت|هفتم|۷|7)/, label: '7' },
  { enRegex: /\b(eight|eighth|8|8th)\b/i, faRegex: /(هشت|هشتم|۸|8)/, label: '8' },
  { enRegex: /\b(nine|ninth|9|9th)\b/i, faRegex: /(نه|نهم|۹|9)/, label: '9' },
  { enRegex: /\b(ten|tenth|10|10th)\b/i, faRegex: /(ده|دهم|۱۰|10)/, label: '10' },
  { enRegex: /\b(hundred|100)\b/i, faRegex: /(صد|۱۰۰|100)/, label: '100' },
  { enRegex: /\b(thousand|1000)\b/i, faRegex: /(هزار|۱۰۰۰|1000)/, label: '1000' },
];

// English negation markers
const EN_NEGATION_REGEX = /\b(not|no|never|neither|nor|none|nobody|nothing|cannot|can't|won't|don't|doesn't|didn't|isn't|aren't|wasn't|weren't|haven't|hasn't|hadn't|shouldn't|wouldn't|couldn't|without)\b/i;

// Persian negation markers
const FA_NEGATION_REGEX = /(نمی|نمی‌|نیست|نیستند|نیستم|نیستی|نشد|نکرد|نرفت|نخواست|ندارد|نبود|نمی‌توان|نتوانست|نه|هیچ|هیچ‌وقت|هرگز|اصلاً|نباید|بدون)/;

/**
 * Validates a Persian translation candidate against its original English source.
 */
export function validateCandidateSemantics(
  sourceEnglish: string,
  candidatePersian: string,
  targetDuration?: number
): SemanticValidationResult {
  const enText = (sourceEnglish || '').trim();
  const faText = (candidatePersian || '').trim();

  let semanticScore = 95;
  let naturalnessScore = 90;
  const missingEntities: string[] = [];
  const reasons: string[] = [];

  if (!faText || faText.length < 2) {
    return {
      semanticScore: 0,
      naturalnessScore: 0,
      validationStatus: 'invalid',
      validationReasonFa: 'متن ترجمه خالی است.',
      numberCheckPassed: false,
      negationCheckPassed: false,
      entityCheckPassed: false,
      missingEntities: [],
    };
  }

  // Ensure translation is genuinely in Persian (contains Persian/Arabic script)
  if (!/[\u0600-\u06FF]/.test(faText)) {
    return {
      semanticScore: 0,
      naturalnessScore: 0,
      validationStatus: 'invalid',
      validationReasonFa: 'متن به زبان فارسی ترجمه نشده و به زبان انگلیسی یا نویسه‌های نامعتبر باقی مانده است.',
      numberCheckPassed: false,
      negationCheckPassed: false,
      entityCheckPassed: false,
      missingEntities: [],
    };
  }

  // 1. Number preservation check
  let numberCheckPassed = true;
  for (const pair of NUMBER_PAIRS) {
    if (pair.enRegex.test(enText)) {
      if (!pair.faRegex.test(faText)) {
        // Also check if numeric digits directly match (e.g. 25, 2024)
        const digitMatch = enText.match(/\b\d+\b/);
        if (digitMatch && !faText.includes(digitMatch[0])) {
          numberCheckPassed = false;
          semanticScore -= 25;
          reasons.push(`عدد یا رتبه «${pair.label}» در ترجمه حذف شده است.`);
          break;
        }
      }
    }
  }

  // Check arbitrary numbers (e.g. 2024, 440)
  const arbitraryNumbers = enText.match(/\b\d{2,}\b/g) || [];
  for (const num of arbitraryNumbers) {
    const enDigits = num;
    const faDigits = enDigits.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[parseInt(d, 10)]);
    if (!faText.includes(enDigits) && !faText.includes(faDigits)) {
      numberCheckPassed = false;
      semanticScore -= 25;
      reasons.push(`مقدار عددی «${num}» در ترجمه ذکر نشده است.`);
    }
  }

  // 2. Negation preservation check (CRITICAL: prevents flipped meaning)
  const isEnNegated = EN_NEGATION_REGEX.test(enText);
  const isFaNegated = FA_NEGATION_REGEX.test(faText);
  let negationCheckPassed = true;

  if (isEnNegated && !isFaNegated) {
    negationCheckPassed = false;
    semanticScore -= 45; // Severe penalty for flipping negation
    reasons.push('جمله اصلی انگلیسی منفی است اما ترجمه فارسی به صورت مثبت درآمده و معنا معکوس شده است!');
  } else if (!isEnNegated && isFaNegated) {
    // Only flag if source clearly has no restrictive words
    if (!/\b(only|barely|scarcely|hardly|seldom|few|little)\b/i.test(enText)) {
      // Possible caution, slight penalty
      semanticScore -= 15;
      reasons.push('در جمله فارسی کلمه منفی به کار رفته در حالی که جمله اصلی منفی نیست.');
    }
  }

  // 3. Technical entities preservation check
  let entityCheckPassed = true;
  const commonTechTerms = [
    'VMware',
    'Docker',
    'Kubernetes',
    'React',
    'Vue',
    'Angular',
    'Node',
    'Python',
    'TypeScript',
    'JavaScript',
    'API',
    'Endpoint',
    'Callback',
    'Middleware',
    'Class',
    'Object',
    'Function',
    'Method',
    'Framework',
    'Database',
    'Runtime',
    'Debug',
    'Token',
    'Prompt',
    'VS Code',
    'Linux',
  ];

  for (const term of commonTechTerms) {
    const termRegex = new RegExp(`\\b${term}\\b`, 'i');
    if (termRegex.test(enText)) {
      // Check if term exists in English or standard Persian in candidate
      const faTranslit: Record<string, string> = {
        function: 'فانکشن',
        method: 'متد',
        class: 'کلاس',
        object: 'آبجکت',
        api: 'ای‌پی‌آی',
        endpoint: 'اندپوینت',
        callback: 'کالبک|کال‌بک',
        middleware: 'میدل‌ور',
        database: 'دیتابیس',
        runtime: 'ران‌تایم',
        debug: 'دیباگ',
      };
      const altFa = faTranslit[term.toLowerCase()];
      const pattern = altFa ? `(${term}|${term.toLowerCase()}|${altFa})` : `(${term}|${term.toLowerCase()})`;
      const inFa = new RegExp(pattern, 'i').test(faText);
      if (!inFa) {
        missingEntities.push(term);
        semanticScore -= 15;
      }
    }
  }

  if (missingEntities.length > 0) {
    entityCheckPassed = false;
    reasons.push(`اصطلاح تخصصی «${missingEntities.join(', ')}» به زبان انگلیسی حفظ نشده است.`);
  }

  // 4. Propositional completeness & clause preservation
  const enWords = enText.split(/\s+/).filter(Boolean).length;
  const faWords = faText.split(/\s+/).filter(Boolean).length;

  if (enWords >= 10 && faWords <= 4) {
    // Dangerous truncation (clause deletion)
    semanticScore -= 30;
    reasons.push('ترجمه بیش از حد خلاصه شده و بخشی از گزاره‌های جمله اصلی حذف گردیده است.');
  }

  // 5. Conversational naturalness evaluation
  // Rewards smooth spoken Persian (می‌خوایم، قراره، بیاید، این رو، کار می‌کنه)
  if (/(می‌خوایم|می‌ریم|قراره|توی این|رو |کاری کنیم|چک کنیم|هندل کنیم|ببینید)/.test(faText)) {
    naturalnessScore += 8;
  }
  // Penalizes unnatural literal or overly formal written forms
  if (/(ما قصد داریم|مجدداً من هستم|متد جادویی|کال بک را رسیدگی کنیم)/.test(faText)) {
    naturalnessScore -= 20;
    reasons.push('عبارت‌پردازی غیرطبیعی یا ترجمه تحت‌اللفظی شناسایی شد.');
  }

  semanticScore = Math.max(0, Math.min(100, semanticScore));
  naturalnessScore = Math.max(0, Math.min(100, naturalnessScore));

  // Determine validation status:
  // Flipped negation or missing critical numbers makes candidate strictly INVALID!
  let validationStatus: 'valid' | 'invalid' | 'needs_review' = 'valid';
  if (!negationCheckPassed || !numberCheckPassed || semanticScore < 60) {
    validationStatus = 'invalid';
  } else if (semanticScore < 80 || missingEntities.length > 0) {
    validationStatus = 'needs_review';
  }

  return {
    semanticScore,
    naturalnessScore,
    validationStatus,
    validationReasonFa: reasons.length > 0 ? reasons.join(' ') : 'تطابق کامل معنایی، عددی و اصطلاحات.',
    numberCheckPassed,
    negationCheckPassed,
    entityCheckPassed,
    missingEntities,
  };
}
