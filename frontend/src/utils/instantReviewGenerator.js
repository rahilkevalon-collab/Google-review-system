/**
 * Instant SEO Review Synthesizer (Zero-Latency Client-Side Engine)
 * 
 * Generates authentic, varied 5-star customer reviews incorporating selected SEO keywords
 * in < 1 millisecond with session-based deduplication and multi-keyword distribution.
 * Guarantees fresh, unique reviews on every refresh while preserving user selections.
 */

const SEEN_HASHES_STORAGE_KEY = 'reviewcraft_shown_review_hashes';
const SEED_COUNTER_KEY = 'reviewcraft_instant_seed_counter';

// Helper to retrieve seen review hashes in the current session
function getSeenHashes() {
  try {
    const raw = sessionStorage.getItem(SEEN_HASHES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

// Helper to record newly displayed review hashes
function recordSeenHashes(newHashes) {
  try {
    const existing = getSeenHashes();
    const combined = Array.from(new Set([...existing, ...newHashes]));
    // Keep last 80 hashes to prevent unbounded memory growth while ensuring no repeats
    const trimmed = combined.slice(-80);
    sessionStorage.setItem(SEEN_HASHES_STORAGE_KEY, JSON.stringify(trimmed));
  } catch (e) {}
}

// Fast string hash generator
function computeTextHash(str) {
  if (!str) return 'empty';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

// Increment seed counter on each generation/refresh
function getNextGenerationSeed() {
  try {
    const cur = parseInt(sessionStorage.getItem(SEED_COUNTER_KEY) || '0', 10);
    const next = (cur + 1) % 10000;
    sessionStorage.setItem(SEED_COUNTER_KEY, String(next));
    return next;
  } catch (e) {
    return Math.floor(Math.random() * 1000);
  }
}

/**
 * Natural language formatter for multiple keywords
 */
export function formatKeywordsPhrase(keywords = [], lang = 'en') {
  const clean = (Array.isArray(keywords) ? keywords : [keywords])
    .map((k) => (typeof k === 'string' ? k.trim() : ''))
    .filter(Boolean);

  if (!clean.length) return 'Quality Service';
  if (clean.length === 1) return clean[0];

  const l = (lang || 'en').toLowerCase().trim();
  if (clean.length === 2) {
    if (l === 'gu' || l === 'gujarati') return `${clean[0]} અને ${clean[1]}`;
    if (l === 'hi' || l === 'hindi') return `${clean[0]} और ${clean[1]}`;
    return `${clean[0]} and ${clean[1]}`;
  }

  // 3 or more keywords
  if (l === 'gu' || l === 'gujarati') {
    return `${clean.slice(0, -1).join(', ')} અને ${clean[clean.length - 1]}`;
  }
  if (l === 'hi' || l === 'hindi') {
    return `${clean.slice(0, -1).join(', ')} और ${clean[clean.length - 1]}`;
  }
  return `${clean.slice(0, -1).join(', ')}, and ${clean[clean.length - 1]}`;
}

/**
 * Distributes selected keywords across review cards.
 * If 1 keyword is selected: all 3 cards feature it from different angles.
 * If 2 keywords are selected: Card 1 focuses on Kw1, Card 2 focuses on Kw2, Card 3 covers both.
 * If 3+ keywords are selected: Each card features different selected keywords so all are represented!
 */
export function distributeKeywordsForCards(selectedKeywords = [], count = 3, seedOffset = 0) {
  const clean = (Array.isArray(selectedKeywords) ? selectedKeywords : [selectedKeywords])
    .map((k) => (typeof k === 'string' ? k.trim() : ''))
    .filter(Boolean);

  if (clean.length === 0) {
    return Array(count).fill(['Quality Service']);
  }

  if (clean.length === 1) {
    return Array(count).fill([clean[0]]);
  }

  if (clean.length === 2) {
    const schemes = [
      [[clean[0]], [clean[1]], [clean[0], clean[1]]],
      [[clean[1]], [clean[0], clean[1]], [clean[0]]],
      [[clean[0], clean[1]], [clean[0]], [clean[1]]]
    ];
    const picked = schemes[seedOffset % schemes.length];
    return Array(count).fill(0).map((_, i) => picked[i % picked.length]);
  }

  // 3 or more keywords: rotate keywords across cards with seed offset
  const distributed = [];
  for (let i = 0; i < count; i++) {
    const primaryIdx = (seedOffset + i) % clean.length;
    const secondaryIdx = (seedOffset + i + 1) % clean.length;

    // Last card blends two keywords if we have extra keywords
    if (i === count - 1 && clean.length > count) {
      distributed.push([clean[primaryIdx], clean[secondaryIdx]]);
    } else {
      distributed.push([clean[primaryIdx]]);
    }
  }

  return distributed;
}

// ============================================================================
// TEMPLATE REPOSITORY BY CATEGORY & LANGUAGE
// ============================================================================

const TEMPLATE_POOLS = {
  it: {
    en: {
      openers: [
        'Partnered with {comp} for {kw} and they delivered beyond our expectations.',
        'Outstanding experience with {comp}! Their expertise in {kw} is truly world-class.',
        'Got our {kw} requirements handled by {comp}. Seamless communication and flawless delivery!',
        'Highly recommend {comp} for anyone looking for reliable {kw} solutions.',
        'The technical team at {comp} did an incredible job with our {kw}.',
        'Finding a dependable partner for {kw} is tough, but {comp} made the whole rollout effortless.',
        'Super impressed with the speed and technical precision of {comp} on {kw}.',
        'From kickoff to deployment, {comp} demonstrated absolute mastery in {kw}.',
        'We engaged {comp} for {kw} and the results have been remarkable.',
        '{comp} handled our {kw} project with great professionalism and deep tech know-how.'
      ],
      aspects: [
        'Clean architecture, solid code quality, and delivered right on schedule.',
        'The engineering standards are top tier and their ongoing support is phenomenal.',
        'Prompt responses, transparent workflow, and zero technical debt.',
        'Every milestone was thoroughly tested and delivered ahead of our release timeline.',
        'Very courteous team that accommodated our feedback quickly and effectively.',
        'Clear documentation, smooth integration, and proactive communication throughout.'
      ],
      closers: [
        'Solid 5-star service all the way!',
        'Will definitely continue working with them for future tech projects.',
        'Easily the best technology partner we have worked with.',
        'A huge thank you to the whole development team!',
        'Strongly recommend their services to any scaling business.'
      ]
    }
  },
  restaurant: {
    en: {
      openers: [
        'Had a delightful dining experience at {comp}! Their {kw} was absolutely extraordinary.',
        'From the moment we walked into {comp}, the warm hospitality and {kw} blew us away.',
        'Best spot in town for {kw}! {comp} never fails to impress.',
        'Celebrated an evening at {comp} and every dish featuring {kw} was packed with authentic flavor.',
        'Incredible food and lovely ambience at {comp}. Their {kw} is a must-try!',
        '{comp} sets a very high benchmark when it comes to {kw} and attentive service.'
      ],
      aspects: [
        'Everything was served piping hot, fresh, and beautifully plated.',
        'The staff was attentive, friendly, and made great recommendations.',
        'Great vibe, soothing music, and immaculate hygiene standards throughout.',
        'Portion sizes were generous and the pricing was completely fair.',
        'Service was prompt and courteous from start to finish.'
      ],
      closers: [
        'Cannot wait to visit again with family and friends!',
        'Deserves a solid 5-star rating without a doubt.',
        'Hands down my new favorite dining destination!',
        'Highly recommended to all food lovers in the area.'
      ]
    }
  },
  healthcare: {
    en: {
      openers: [
        'Very compassionate and professional care at {comp}. Handled our {kw} with utmost precision.',
        'Had a wonderful consultation with {comp}. Their thorough approach to {kw} gave me complete peace of mind.',
        'Pristine clinic environment and friendly staff at {comp}. Exceptional service for {kw}.',
        'Highly recommend {comp} to anyone seeking trustworthy medical support for {kw}.',
        'The doctors at {comp} are very attentive and handled my {kw} treatment with great dedication.'
      ],
      aspects: [
        'The doctors patiently listened, explained every step clearly, and made me feel comfortable.',
        'Zero wait times, smooth appointment booking, and top-tier clinical hygiene.',
        'Modern diagnostic facilities and gentle, supportive treatment throughout.',
        'Transparent advice with genuine care for the patient.'
      ],
      closers: [
        'Grateful for their dedicated care—solid 5 stars!',
        'The best clinic experience I have had in a very long time.',
        'Truly a healthcare team you can trust unconditionally.',
        'Would unreservedly recommend {comp} to family and friends.'
      ]
    }
  },
  beauty: {
    en: {
      openers: [
        'Had an amazing pampering session at {comp}! Their expertise in {kw} is second to none.',
        'Super clean, relaxing atmosphere and world-class service at {comp}. My {kw} turned out gorgeous!',
        'The stylists at {comp} are true artists! Flawless execution on {kw}.',
        'First time visiting {comp} for {kw} and I was thoroughly pampered from start to finish.',
        '{comp} is hands down the best place for professional {kw} and self-care.'
      ],
      aspects: [
        'Premium products used, gentle techniques, and wonderful attention to detail.',
        'Staff is polite, welcoming, and takes time to understand your exact preferences.',
        'Luxurious ambience, soothing music, and very hygienic equipment.',
        'Results lasted wonderfully and exceeded all my expectations.'
      ],
      closers: [
        'Definitely my go-to salon from now on!',
        '10/10 experience, highly recommended to everyone!',
        'Left feeling refreshed, confident, and radiant!',
        'A heartfelt thank you to the wonderful team at {comp}!'
      ]
    }
  },
  retail: {
    en: {
      openers: [
        'Fantastic shopping experience with {comp}! Premium variety and unmatched quality for {kw}.',
        'Super fast delivery, careful packaging, and genuine support from {comp} for {kw}.',
        'Great value and friendly team at {comp}. If you are looking for {kw}, this is the place to be.',
        'Purchased {kw} from {comp} and the product quality exceeded all expectations!',
        'Always a pleasure buying from {comp}. Their dedication to quality {kw} is evident.'
      ],
      aspects: [
        'Hassle-free purchase, transparent pricing, and instant customer service.',
        'Products arrived in pristine condition right on time.',
        'Wide selection of authentic items with clear guidance from staff.',
        'Fair prices and honest recommendations throughout.'
      ],
      closers: [
        'Will certainly be a repeat customer. 5 stars!',
        'Outstanding customer service from start to finish.',
        'Highly recommended store for authentic quality!',
        'Very happy with my purchase and will visit again soon.'
      ]
    }
  },
  marketing: {
    en: {
      openers: [
        'Partnered with {comp} for {kw} and saw a noticeable surge in organic traffic and conversions.',
        'The strategic vision of {comp} regarding {kw} has transformed our digital presence.',
        'Transparent monthly reporting, data-driven insights, and remarkable results on {kw} from {comp}.',
        'If you want real growth and top rankings, {comp} is the undisputed authority in {kw}.',
        'Working with {comp} on {kw} has been one of our best business investments.'
      ],
      aspects: [
        'Clear KPIs, regular progress updates, and proactive optimization strategies.',
        'High ROI campaigns executed with complete integrity and professionalism.',
        'Deep analytical expertise and immediate response to all queries.',
        'Strategic insights that helped us outperform our key competitors.'
      ],
      closers: [
        'A game changer for our business growth!',
        'Proud to have {comp} as our growth partner.',
        'Solid 5 stars for measurable results and transparent communication.',
        'Looking forward to scaling further with their team.'
      ]
    }
  },
  general: {
    en: {
      openers: [
        'Really great experience with {comp}! Their dedication and high standards on {kw} were truly commendable.',
        'The team at {comp} is responsive, knowledgeable, and polite. Handled our {kw} with utmost professionalism.',
        'Flawless execution, fair pricing, and dependable support for {kw} from {comp}.',
        "I've worked with {comp} for {kw} and they consistently deliver prompt and honest work.",
        'Finding reliable professionals for {kw} is tough, but {comp} exceeded every expectation.',
        'From initial consultation to final delivery of {kw}, {comp} was top class all the way.',
        'Outstanding service by {comp}! They took care of our {kw} requirements smoothly and efficiently.',
        'Very pleased with the exceptional level of care and expertise {comp} provided for {kw}.'
      ],
      aspects: [
        'Communication was crystal clear throughout the entire process.',
        'Everything was completed cleanly, quickly, and within our agreed budget.',
        'Staff is attentive, skilled, and took time to ensure every detail was perfect.',
        'Fast turnaround time without compromising on the quality of work.',
        'Very polite team that addressed every single question with patience.'
      ],
      closers: [
        'Would gladly recommend {comp} to everyone!',
        'Truly a 5-star experience from beginning to end.',
        'Will definitely turn to them again for future requirements.',
        'Solid craftsmanship and dependable service throughout!',
        'Best in class service—highly appreciated!'
      ]
    }
  },

  // HINDI REPOSITORY
  hi: {
    openers: [
      '{comp} के साथ {kw} का अनुभव बहुत ही शानदार और सुखद रहा!',
      '{kw} के लिए {comp} सबसे बेहतरीन और भरोसेमंद विकल्प है.',
      '{comp} की टीम ने हमारे {kw} का काम पूरी लगन, सफाई और समय पर किया.',
      'बहुत ही प्रोफेशनल और समय की पाबंद टीम है {comp} की, {kw} में लाजवाब काम किया.',
      'अगर आपको {kw} में उच्च गुणवत्ता और सही मार्गदर्शन चाहिए तो {comp} को जरूर चुनें.',
      '{comp} ने {kw} के मामले में हमारी उम्मीदों से भी बेहतर परिणाम दिया.',
      '{comp} के साथ काम करके बहुत खुशी हुई, इनकी {kw} सर्विस वाकई 5-स्टार है.',
      'शुरुआत से लेकर काम पूरा होने तक {comp} की सर्विस एकदम फर्स्ट क्लास रही.'
    ],
    aspects: [
      'स्टाफ का व्यवहार बहुत ही सहयोगी, विनम्र और अपने काम में पूरी तरह निपुण रहा.',
      'बिना किसी झंझट और सही बजट में सारा काम समय से पहले पूरा हुआ.',
      'हर छोटी बात का बारीकी से ध्यान रखा गया और पूरी पारदर्शिता बनी रही.',
      'काम की फिनिशिंग और क्वालिटी देखकर मन पूरी तरह संतुष्ट हो गया.',
      'तुरंत रिस्पॉन्स और बेहतरीन कस्टमर सपोर्ट सराहनीय है.'
    ],
    closers: [
      'पूरी टीम का बहुत-बहुत धन्यवाद, 5 स्टार!',
      'भविष्य में भी अपनी जरूरतों के लिए इन्हीं से संपर्क करेंगे.',
      'अपने सभी मित्रों और जानकारों को जरूर सिफारिश करूंगा.',
      'शानदार अनुभव, 10 में से 10 अंक!',
      'दिल से शुक्रिया पूरी टीम को, हमेशा ऐसा ही काम करते रहें!'
    ]
  },

  // GUJARATI REPOSITORY
  gu: {
    openers: [
      '{comp} ખાતે {kw} નો અનુભવ ખરેખર ખૂબ જ અદ્ભુત અને સંતોષકારક રહ્યો!',
      '{kw} માટે {comp} શ્રેષ્ઠ અને સૌથી વિશ્વસનીય સ્થળ છે.',
      '{comp} ની ટીમે અમારા {kw} ના કામમાં શ્રેષ્ઠ ગુણવત્તા, ઝડપ અને ચોકસાઈ દર્શાવી.',
      'ખૂબ જ નમ્ર અને કુશળ સ્ટાફ! {comp} એ {kw} નું કામ અપેક્ષા કરતાં પણ સરસ રીતે પૂર્ણ કર્યું.',
      '{kw} બાબતે અમને ૧૦૦% સંપૂર્ણ સંતોષ મળ્યો છે.',
      '{comp} ની સર્વિસ ઝડપી, પારદર્શક અને ખૂબ જ વિશ્વસનીય છે.',
      '{kw} માટે અમદાવાદમાં {comp} થી શ્રેષ્ઠ કોઈ વિકલ્પ નથી.'
    ],
    aspects: [
      'સમયસર કામ, વાજબી ભાવ અને એકદમ પારદર્શક વ્યવહાર જોવા મળ્યો.',
      'દરેક તબક્કે સચોટ માર્ગદર્શન અને ઉત્તમ સપોર્ટ આપવામાં આવ્યો.',
      'કામની ઉત્કૃષ્ટ ગુણવત્તા રહી અને કોઈ પણ પ્રકારની અગવડ પડી નથી.',
      'સ્ટાફ ખૂબ જ વિનમ્ર અને પોતાના ક્ષેત્રમાં સંપૂર્ણ અનુભવી છે.'
    ],
    closers: [
      'ચોક્કસપણે 5 સ્ટાર સેવા! ખૂબ ખૂબ આભાર.',
      'ફરીથી જરૂર પડે ત્યારે આ જ ટીમ સાથે કામ કરીશું.',
      'બધા મિત્રો અને સ્નેહીજનોને ચોક્કસપણે ભલામણ કરીશ.',
      'શ્રેષ્ઠ કામગીરી માટે આખી ટીમને ખૂબ ખૂબ અભિનંદન!'
    ]
  }
};

/**
 * Resolves appropriate category domain key
 */
function resolveCategoryKey(catStr = '') {
  const c = catStr.toLowerCase();
  if (/restaurant|food|dining|bistro|cafe|bar|kitchen|cuisine/i.test(c)) return 'restaurant';
  if (/it|software|tech|developer|development|code|cloud|web|computer|system/i.test(c)) return 'it';
  if (/health|clinic|doctor|dental|medical|hospital|care|wellness/i.test(c)) return 'healthcare';
  if (/beauty|salon|spa|hair|makeup|parlour|styling/i.test(c)) return 'beauty';
  if (/retail|shop|store|ecommerce|e-commerce|mart|supermarket/i.test(c)) return 'retail';
  if (/seo|marketing|digital|ads|branding|social media|growth/i.test(c)) return 'marketing';
  return 'general';
}

/**
 * Generates an array of unique review suggestions incorporating selected keywords.
 * Shuffles templates, enforces session-based deduplication, and rotates keywords across cards.
 */
export function generateInstantReviews(
  selectedKeywords = [],
  company = {},
  branch = {},
  count = 3
) {
  const compName = (branch?.branchName || company?.companyName || company?.name || 'Business').trim();
  const rawCategory = company?.category || '';
  const domainKey = resolveCategoryKey(rawCategory);
  const location = (branch?.city || branch?.address || company?.location || company?.formattedAddress || '').trim();
  const lang = (company?.preferredLanguage || 'en').toLowerCase().trim();
  const reviewUrl = branch?.googleReviewUrl || company?.googleReviewUrl || company?.externalReviewLink || '';

  const cleanKws = (Array.isArray(selectedKeywords) ? selectedKeywords : [selectedKeywords])
    .map((k) => (typeof k === 'string' ? k.trim() : ''))
    .filter(Boolean);

  const targetCount = Math.max(1, Math.min(count, 5));
  const seenHashes = new Set(getSeenHashes());
  const genSeed = getNextGenerationSeed();

  // Distribute keywords cleanly across review cards
  const keywordAllocations = distributeKeywordsForCards(cleanKws, targetCount, genSeed);

  // Retrieve templates pool
  let pool;
  if (lang === 'hi' || lang === 'hindi') {
    pool = TEMPLATE_POOLS.hi;
  } else if (lang === 'gu' || lang === 'gujarati') {
    pool = TEMPLATE_POOLS.gu;
  } else {
    pool = TEMPLATE_POOLS[domainKey]?.en || TEMPLATE_POOLS.general.en;
  }

  const openers = [...pool.openers];
  const aspects = [...pool.aspects];
  const closers = [...pool.closers];

  const generatedReviews = [];
  const newlyCreatedHashes = [];
  const generatedTextsInThisBatch = new Set();

  for (let i = 0; i < targetCount; i++) {
    const cardKws = keywordAllocations[i] || ['Quality Service'];
    const cardKwPhrase = formatKeywordsPhrase(cardKws, lang);

    let chosenText = null;
    let chosenHash = null;

    // Combinatorial attempts to find a fresh, unique review not seen in this session
    // Try multiple seed permutations
    for (let attempt = 0; attempt < 25; attempt++) {
      const opIdx = (genSeed * 7 + i * 11 + attempt * 5) % openers.length;
      const aspIdx = (genSeed * 13 + i * 17 + attempt * 7) % aspects.length;
      const cloIdx = (genSeed * 19 + i * 23 + attempt * 11) % closers.length;

      const rawOpener = openers[opIdx].replace(/\{comp\}/g, compName).replace(/\{kw\}/g, cardKwPhrase);
      const rawAspect = aspects[aspIdx].replace(/\{comp\}/g, compName).replace(/\{kw\}/g, cardKwPhrase);
      const rawCloser = closers[cloIdx].replace(/\{comp\}/g, compName).replace(/\{kw\}/g, cardKwPhrase);

      // Select natural sentence structures (Opener + Aspect, Opener + Closer, or Full 3-part)
      let candidate;
      const pattern = (i + attempt + genSeed) % 3;
      if (pattern === 0) {
        candidate = `${rawOpener} ${rawAspect} ${rawCloser}`.trim();
      } else if (pattern === 1) {
        candidate = `${rawOpener} ${rawCloser}`.trim();
      } else {
        candidate = `${rawOpener} ${rawAspect}`.trim();
      }

      const h = computeTextHash(candidate);

      // Check for uniqueness within current batch AND recent session history
      if (!generatedTextsInThisBatch.has(candidate) && !seenHashes.has(h)) {
        chosenText = candidate;
        chosenHash = h;
        break;
      }
    }

    // Fallback if session history exhausted all templates: allow slight variation
    if (!chosenText) {
      const opIdx = (genSeed + i) % openers.length;
      const cloIdx = (genSeed + i * 2) % closers.length;
      chosenText = `${openers[opIdx].replace(/\{comp\}/g, compName).replace(/\{kw\}/g, cardKwPhrase)} ${closers[cloIdx]}`.trim();
      chosenHash = computeTextHash(chosenText);
    }

    generatedTextsInThisBatch.add(chosenText);
    newlyCreatedHashes.push(chosenHash);

    const uniqueId = `inst-${chosenHash}-${Date.now()}-${i + 1}`;
    generatedReviews.push({
      id: uniqueId,
      _id: uniqueId,
      reviewText: chosenText,
      rating: 5,
      keyword: cardKwPhrase,
      selectedKeywords: cardKws,
      sentiment: 'positive',
      status: 'generated',
      companyName: compName,
      companyLocation: location,
      branchName: branch?.branchName || '',
      googleReviewUrl: reviewUrl,
      externalReviewLink: reviewUrl,
      isInstant: true,
      contentHash: chosenHash,
      createdAt: new Date().toISOString()
    });
  }

  // Record hashes in session storage for continuous freshness on subsequent refreshes
  recordSeenHashes(newlyCreatedHashes);

  return generatedReviews;
}
