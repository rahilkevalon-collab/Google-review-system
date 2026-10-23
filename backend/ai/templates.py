import random

CATEGORY_BUSINESS_NAMES = {
    "Restaurants and Food": [
        "Spice Pavilion Fine Dine",
        "Royal Saffron Bistro",
        "The Heritage Table",
        "Olive & Basil Trattoria",
        "Saffron Grill & Bar",
        "Urban Spice Kitchen",
        "Coastal Bay Seafood",
        "The Golden Curry & Grill",
        "Bella Vista Fine Dining",
        "Copper Chimney Kitchen",
        "Amber Court Gastronomy",
        "The Grand Feast Kitchen",
        "Barbeque & Biryani Central",
        "Cinnamon Tree Brasserie",
        "Skyline Rooftop Restobar",
        "Tandoori Nights Lounge",
        "Flavors of Malabar",
        "Gourmet Avenue Dining",
        "Maharaja Royal Thali",
        "Blue Ocean Seafood Grill"
    ],
    "Retail": [
        "Urban Trendz Lifestyle Superstore",
        "Metro Vogue Department Store",
        "The Elite Galleria",
        "Prime Fashion Hub",
        "Nexus Lifestyle Superstore",
        "Moda Luxe Boutique",
        "Grand Central Retail Mart",
        "Apex Streetwear & Apparel"
    ],
    "E-commerce": [
        "Aura Organic Living",
        "PureEarth Lifestyle Essentials",
        "GreenNest Eco Store",
        "UrbanCart Online",
        "Velvet Botanicals",
        "EcoBreeze Organics"
    ],
    "IT Services and Software Development": [
        "Kevalon Technology",
        "Apex Cloud Solutions",
        "NovaByte Innovations",
        "CyberCraft Software",
        "NextGen Web Systems",
        "CodeSphere Technologies"
    ],
    "Healthcare": [
        "Apex Care Multispeciality Clinic",
        "LifeSpring Wellness Center",
        "CarePoint Family Clinic",
        "Metropolis Dental & Healthcare",
        "Healing Touch Medical Pavilion"
    ],
    "Real Estate": [
        "Prime Landmark Realty",
        "Skyline Haven Estates",
        "Greenfield Properties",
        "Silvercrest Realty Advisors",
        "Apex Urban Living"
    ],
    "Education": [
        "BrightPath International Academy",
        "Apex Scholars Institute",
        "Horizon STEM Academy",
        "Oxford Bridge Learning Center",
        "Pinnacle Career Academy"
    ],
    "Travel and Hospitality": [
        "Wanderlust Horizon Travels",
        "Blue Lagoon Tours & Resorts",
        "Silver Cloud Holidays",
        "Voyager Global Vacations",
        "Golden Coast Retreats"
    ],
    "Beauty and Salon": [
        "Glow & Grace Luxury Wellness Salon",
        "Elysian Hair & Day Spa",
        "Belleza Organic Studio",
        "Radiance Luxury Salon",
        "Velvet Touch Beauty Lounge"
    ],
    "Digital Marketing": [
        "NexGen Growth Media",
        "PixelPulse Digital Agency",
        "Elevate Brand Strategists",
        "Apex Search Marketing",
        "Catalyst Digital Growth"
    ],
    "Other": [
        "Elite Falcon Global Consulting",
        "Apex Corporate Advisory",
        "Vanguard Strategic Partners",
        "Meridian Global Associates"
    ]
}

# ==============================================================================
# 5-STAR TEMPLATES: Natural, professional, grounded praise without hype
# ==============================================================================

# English 5-Star General Business
OPENERS_5_EN = [
    "We partnered with {company} for our {keyword} needs, and the experience was solid and professional.",
    "Working with {company} regarding {keyword} met all our expectations in terms of quality and execution.",
    "Our team engaged {company} for {keyword}, and their execution was dependable from day one.",
    "The service provided by {company} for {keyword} was organized, timely, and delivered as scoped.",
    "We entrusted {company} with our {keyword} requirements, and they handled everything conscientiously.",
    "Choosing {company} for {keyword} proved to be a sound operational decision for our business.",
    "A smooth and straightforward engagement with {company} on our {keyword} project.",
    "From initial discussions to completion, {company} delivered dependable results for {keyword}.",
    "We had a positive experience working with {company} for our {keyword} goals.",
    "The engineering and support team at {company} demonstrated genuine professionalism in {keyword}."
]

BODIES_5_EN = [
    "Their team communicated clearly at key milestones, respected deadlines, and maintained consistent quality throughout.",
    "Technical execution was sharp, turnaround matched the agreed timeline, and queries were addressed promptly.",
    "The deliverables matched our exact specifications without unnecessary revisions or delays.",
    "The entire collaboration was streamlined, transparent, and focused on delivering practical business value.",
    "They brought reliable domain knowledge to the table and kept our core requirements front and center.",
    "Communication was straightforward, requirements were understood quickly, and the output was well-tested.",
    "They delivered quality work on schedule and were always approachable when adjustments were requested."
]

CLOSERS_5_EN = [
    "I would certainly recommend {company} to anyone needing reliable service.",
    "A dependable partner that stands behind their commitments. Would gladly work with them again.",
    "Very pleased with the outcome and looking forward to continuing our collaboration.",
    "A professional, stress-free engagement from start to finish.",
    "Dependable team and quality deliverables—definitely worthy of a 5-star rating."
]

# English 5-Star Restaurant
RESTAURANT_OPENERS_5_EN = [
    "Dining at {company} was an enjoyable experience, with attentive service and fresh {keyword}.",
    "The food quality and warm hospitality at {company} regarding {keyword} were consistently high.",
    "We had dinner at {company} and were very pleased with their flavorful {keyword} and clean ambience.",
    "A delightful meal at {company}—their attention to {keyword} and fresh ingredients stood out.",
    "We reserved a table at {company} for an evening out, and the {keyword} made it a memorable visit."
]

RESTAURANT_BODIES_5_EN = [
    "The dishes were freshly prepared, well-seasoned, and brought out promptly by attentive staff.",
    "Every course arrived warm, thoughtfully presented, and accurately matched our dietary preferences.",
    "The balance of authentic spices, generous portions, and courteous table service made for a great meal.",
    "The dining atmosphere was welcoming and the kitchen accommodated our table requests smoothly."
]

RESTAURANT_CLOSERS_5_EN = [
    "We will definitely return to {company} for future family dinners.",
    "A dependable culinary spot with consistent quality. Highly recommended!",
    "Great dining experience all around—deserving of full five stars.",
    "Looking forward to visiting {company} again soon."
]

# ==============================================================================
# 4-STAR TEMPLATES: Overall positive, with one mild, plausible improvement area
# (e.g., response time, reporting detail, delivery timelines, communication, documentation)
# ==============================================================================

OPENERS_4_EN = [
    "We had a positive overall experience with {company} for {keyword}.",
    "Our collaboration with {company} on {keyword} produced solid results across the board.",
    "Engaging {company} for our {keyword} requirements was a productive engagement for our team.",
    "Overall very satisfied with the work {company} delivered for {keyword}.",
    "We partnered with {company} for {keyword} and were generally pleased with the final outcome.",
    "A good experience overall with {company} regarding their work on {keyword}.",
    "The team at {company} did a commendable job handling our {keyword} needs."
]

BODIES_4_EN = [
    "The core technical deliverables were strong, though onboarding documentation could have been slightly more detailed at the start.",
    "The final output met our quality benchmarks, while initial project kickoff took a few extra days to get fully scheduled.",
    "Their specialists demonstrated genuine domain expertise; regular status reporting could be slightly more frequent between major milestones.",
    "Solid execution and dependable output, though communication during initial sprint planning was a bit gradual.",
    "The work was completed to our satisfaction, with just minor room for a slightly faster turnaround on initial inquiry responses.",
    "The quality of work was reliable throughout, though weekly summary reports would have added even more clarity to the roadmap.",
    "Core deliverables were dependable and cleanly executed; occasional handover notes could be slightly more comprehensive."
]

CLOSERS_4_EN = [
    "A dependable team delivering quality work—solid 4 stars with just minor room for process polish.",
    "Overall very happy with the end results and would gladly recommend them.",
    "Good experience all around, and we would certainly consider working with them again on future initiatives.",
    "Constructive collaboration with dependable professionals who deliver on their core promises.",
    "Very satisfied with the core service and confident in their technical capabilities."
]

# English 4-Star Restaurant
RESTAURANT_OPENERS_4_EN = [
    "We had a pleasant dining experience at {company} and enjoyed their {keyword}.",
    "Dinner at {company} was tasty and satisfying, especially their take on {keyword}.",
    "Overall a good visit to {company} with great flavors centered around {keyword}."
]

RESTAURANT_BODIES_4_EN = [
    "The food taste was delicious and freshly prepared, though table seating took a little longer than expected during peak hours.",
    "Flavorful courses and generous portions, with just minor room for slightly faster beverage service between courses.",
    "The main dishes were flavorful and satisfying, while dessert options were somewhat limited on the evening we visited."
]

RESTAURANT_CLOSERS_4_EN = [
    "A solid 4-star meal with tasty food and welcoming hospitality. Would gladly visit again.",
    "Good food and pleasant ambience overall—definitely worth checking out.",
    "Very satisfied with the meal and we look forward to returning."
]

# ==============================================================================
# HINDI TEMPLATES (5-Star & 4-Star)
# ==============================================================================

OPENERS_5_HI = [
    "{company} के साथ {keyword} के संबंध में हमारा अनुभव बहुत ही पेशेवर और संतोषजनक रहा।",
    "{company} की टीम ने {keyword} के कार्य को समयबद्ध और उच्च गुणवत्ता के साथ पूरा किया।",
    "यदि आप भरोसेमंद {keyword} की तलाश में हैं, तो {company} एक बेहतरीन विकल्प है।",
    "{company} के साथ काम करना हमारे लिए एक सहज और व्यवस्थित अनुभव साबित हुआ।"
]

BODIES_5_HI = [
    "शुरुआत से अंत तक पूरी प्रक्रिया पारदर्शी, समय पर और तय मानकों के अनुसार पूरी की गई।",
    "गुणवत्ता, पेशेवर संवाद और समय पर डिलीवरी के मामले में उन्होंने हमारे विश्वास को पूरा किया।",
    "उनकी टीम बारीकियों पर ध्यान देती है और जरूरत पड़ने पर हमेशा उपयोगी सुझाव देती है।"
]

CLOSERS_5_HI = [
    "हम {company} की सेवाओं की अनुशंसा करते हैं। 5-स्टार गुणवत्ता!",
    "शानदार सेवा! भविष्य में भी हम {company} के साथ जुड़ना चाहेंगे।",
    "उत्कृष्ट परिणाम और पूरा संतोष। पूरी टीम को धन्यवाद।"
]

OPENERS_4_HI = [
    "{company} के साथ {keyword} को लेकर हमारा अनुभव कुल मिलाकर काफी सकारात्मक रहा।",
    "{company} की टीम ने {keyword} के कार्य में अच्छी कार्यकुशलता और परिणाम दिए।",
    "{company} के साथ साझेदारी अच्छी रही और हमें संतोषजनक परिणाम मिले।"
]

BODIES_4_HI = [
    "काम की गुणवत्ता अच्छी रही, हालांकि शुरुआती दस्तावेज़ीकरण और प्रक्रिया में थोड़ा और स्पष्टीकरण मददगार होता।",
    "अंतिम परिणाम हमारी अपेक्षाओं के अनुरूप थे, बस प्रोजेक्ट की शुरुआत में प्रतिक्रिया समय थोड़ा और तेज हो सकता था।",
    "उनकी टीम काफी पेशेवर है, हालांकि नियमित स्टेटस रिपोर्टिंग थोड़ी और बारंबार हो सकती थी।"
]

CLOSERS_4_HI = [
    "कुल मिलाकर अच्छा अनुभव रहा—ठोस 4 स्टार और हम भविष्य में भी उनके साथ काम करने पर विचार करेंगे।",
    "एक भरोसेमंद टीम जिसने अपना काम अच्छे से निभाया। अच्छी सेवा!",
    "संतोषजनक काम और अच्छी गुणवत्ता। हम उनकी सेवाओं से खुश हैं।"
]

# ==============================================================================
# GUJARATI TEMPLATES (5-Star & 4-Star)
# ==============================================================================

OPENERS_5_GU = [
    "{company} સાથે અમારો {keyword} અંગેનો અનુભવ વ્યવસાયિક અને અત્યંત સંતોષકારક રહ્યો.",
    "{company} ની ટીમ અને {keyword} માં તેમનું કામ ભરોસાપાત્ર અને સમયબદ્ધ છે.",
    "જો તમે ગુણવત્તાસભર {keyword} શોધી રહ્યા હોવ, તો {company} એક શ્રેષ્ઠ પસંદગી છે.",
    "{company} સાથે કામ કરવું સરળ, પારદર્શક અને ખૂબ પ્રોફેશનલ રહ્યું."
]

BODIES_5_GU = [
    "સમયસર સેવા, સ્પષ્ટ વાતચીત અને શ્રેષ્ઠ ગુણવત્તા તેમના કામની મુખ્ય વિશેષતા છે.",
    "દરેક તબક્કે પારદર્શિતા જળવાઈ રહી અને ગ્રાહક સંતોષને સર્વોચ્ચ પ્રાથમિકતા આપી.",
    "બધું કામ નક્કી કરેલા ધોરણો અને સમય મર્યાદામાં ઉત્કૃષ્ટ રીતે પૂર્ણ થયું."
]

CLOSERS_5_GU = [
    "અમે {company} ની સેવાઓની દિલથી ભલામણ કરીએ છીએ. ઉત્તમ 5-સ્ટાર કાર્ય!",
    "ફરીથી તેમની સાથે જોડાવાનો ચોક્કસ આનંદ થશે. ખૂબ ખૂબ આભાર {company}!",
    "શ્રેષ્ઠ ગુણવત્તા અને પૂરેપૂરો સંતોષ."
]

OPENERS_4_GU = [
    "{company} સાથે {keyword} અંગેનો અમારો અનુભવ એકંદરે સારો અને ઉત્પાદક રહ્યો.",
    "{company} ની ટીમે {keyword} ના કામમાં સારી કુશળતા દાખવી અને સંતોષકારક પરિણામ આપ્યું.",
    "{company} સાથેનો અનુભવ સકારાત્મક રહ્યો અને કામ સમયસર પૂરું થયું."
]

BODIES_4_GU = [
    "કામની અંતિમ ગુણવત્તા ખૂબ સરસ રહી, જોકે શરૂઆતના આયોજન અને દસ્તાવેજીકરણમાં થોડી વધુ ઝડપ રાખી શકાઈ હોત.",
    "તેમની ટીમ પ્રોફેશનલ છે, માત્ર માઈલસ્ટોન વચ્ચે સ્ટેટસ અપડેટ્સ થોડા વધુ નિયમિત મળ્યા હોત તો વધુ સારું રહેત.",
    "પરિણામ સારું મળ્યું, બસ શરૂઆતના પ્રશ્નોના ઉત્તરમાં થોડી ઝડપ હોત તો પ્રક્રિયા વધુ સરળ બની હોત."
]

CLOSERS_4_GU = [
    "એકંદરે સારો અનુભવ રહ્યો—વિશ્વસનીય 4-સ્ટાર પરિણામ અને અમે ફરી તેમની સાથે કામ કરવા વિચારીશું.",
    "વિશ્વાસપાત્ર ટીમ અને ગુણવત્તાસભર કામ. સારી સેવા!",
    "કામથી સંતુષ્ટ છીએ અને તેમના પ્રયત્નોની સરાહના કરીએ છીએ."
]

# ==============================================================================
# CANDIDATE GENERATION ENGINE
# ==============================================================================

def generate_template_candidates(
    company_name: str,
    category: str,
    keyword: str,
    description: str = "",
    services: str = "",
    location: str = "",
    language: str = "en",
    tone: str = "natural",
    length: str = "medium",
    count: int = 5,
    target_rating: int = 5,
    **kwargs
) -> list[str]:
    """
    Generate a large pool of unique review variations in English, Hindi, or Gujarati.
    Produces distinct candidates by combining dynamic openers, bodies, and closers
    tailored specifically to the target rating (4-star vs 5-star).
    """
    results = []
    seen = set()

    lang = (language or "en").lower().strip()
    is_restaurant = category and "restaurant" in category.lower()
    is_four_star = int(target_rating) == 4

    if lang in ("gu", "gujarati"):
        if is_four_star:
            openers = OPENERS_4_GU
            bodies = BODIES_4_GU
            closers = CLOSERS_4_GU
        else:
            openers = OPENERS_5_GU
            bodies = BODIES_5_GU
            closers = CLOSERS_5_GU
    elif lang in ("hi", "hindi"):
        if is_four_star:
            openers = OPENERS_4_HI
            bodies = BODIES_4_HI
            closers = CLOSERS_4_HI
        else:
            openers = OPENERS_5_HI
            bodies = BODIES_5_HI
            closers = CLOSERS_5_HI
    elif is_restaurant:
        if is_four_star:
            openers = RESTAURANT_OPENERS_4_EN
            bodies = RESTAURANT_BODIES_4_EN
            closers = RESTAURANT_CLOSERS_4_EN
        else:
            openers = RESTAURANT_OPENERS_5_EN
            bodies = RESTAURANT_BODIES_5_EN
            closers = RESTAURANT_CLOSERS_5_EN
    else:
        if is_four_star:
            openers = OPENERS_4_EN
            bodies = BODIES_4_EN
            closers = CLOSERS_4_EN
        else:
            openers = OPENERS_5_EN
            bodies = BODIES_5_EN
            closers = CLOSERS_5_EN

    # Combinatorial permutations with shuffled offsets
    sample_openers = list(openers)
    sample_bodies = list(bodies)
    sample_closers = list(closers)

    random.shuffle(sample_openers)
    random.shuffle(sample_bodies)
    random.shuffle(sample_closers)

    loc_str = ""
    if location and random.random() > 0.4:
        if lang in ("hi", "hindi", "gu", "gujarati"):
            loc_str = f" ({location})"
        else:
            loc_str = f" in {location}"

    total_pool_needed = max(40, count * 8)
    for i in range(total_pool_needed):
        op = sample_openers[i % len(sample_openers)]
        bd = sample_bodies[(i * 3 + 1) % len(sample_bodies)]
        cl = sample_closers[(i * 7 + 2) % len(sample_closers)]

        sentence1 = op.format(company=company_name, keyword=f"{keyword}{loc_str}")
        sentence2 = bd.format(company=company_name, keyword=keyword)
        sentence3 = cl.format(company=company_name, keyword=keyword)

        if length == "short":
            full_review = f"{sentence1} {sentence3}"
        elif length == "long":
            if is_four_star:
                if lang in ("hi", "hindi"):
                    extra = "प्रक्रिया में थोड़े और सुधार के साथ यह टीम और भी अधिक प्रभावशाली हो सकती है।"
                elif lang in ("gu", "gujarati"):
                    extra = "પ્રક્રિયામાં થોડા વધુ સુધારા સાથે આ ટીમ વધુ પ્રભાવશાળી પરિણામ આપી શકે છે."
                else:
                    extra = "With just minor ongoing process tuning, their service will be even stronger."
            else:
                if lang in ("hi", "hindi"):
                    extra = f"{keyword} के प्रति उनका समर्पण हमारे लिए बेहद मददगार साबित हुआ।"
                elif lang in ("gu", "gujarati"):
                    extra = f"{keyword} માટેનું તેમનું સમર્પણ અમારા માટે ખૂબ ફાયદાકારક સાબિત થયું."
                else:
                    extra = f"Their disciplined approach to {keyword} made a measurable positive difference for us."
            full_review = f"{sentence1} {sentence2} {extra} {sentence3}"
        else:  # medium
            full_review = f"{sentence1} {sentence2} {sentence3}"

        if full_review not in seen:
            seen.add(full_review)
            results.append(full_review)

    random.shuffle(results)
    return results
