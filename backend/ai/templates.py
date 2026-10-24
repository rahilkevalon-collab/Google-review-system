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
# AUTHENTIC HUMAN GOOGLE REVIEW TEMPLATES (Small, Genuine, Natural Phrasing)
# ==============================================================================

# English 5-Star General Business
OPENERS_5_EN = [
    "Really great experience with {company}! Their work on {keyword} was super fast and high quality.",
    "Got {keyword} done from {company}. The team is very friendly, responsive, and did an amazing job.",
    "Had a wonderful experience with {company}. Their work on {keyword} was top notch and delivered on time.",
    "Best place for {keyword}! The team at {company} is very helpful, knowledgeable, and polite.",
    "Super happy with {company}'s service. Quick turnaround for our {keyword} and fair pricing.",
    "Excellent work by {company} on our {keyword}! Everything was completed cleanly and without any hassle.",
    "I've used {company} for {keyword} and they always provide prompt, honest, and reliable service.",
    "Smooth and easy process with {company}. Quality work on {keyword} at a very reasonable rate.",
    "Super impressed with {company}! Great quality on {keyword} and very supportive staff.",
    "Prompt and professional service. {company} did a fantastic job with our {keyword}.",
    "Awesome experience with {company}. They understood exactly what we needed for {keyword}."
]

CLOSERS_5_EN = [
    "Highly recommended!",
    "Will definitely use them again.",
    "5 stars all the way!",
    "Thanks a lot team!",
    "Would gladly recommend to friends and family.",
    "Very satisfied with their work.",
    "Definitely coming back!"
]

# Category-Specific 5-Star English Restaurant
RESTAURANT_OPENERS_5_EN = [
    "Loved dining at {company}! The {keyword} was fresh, delicious, and served quickly.",
    "Amazing food and super friendly staff at {company}. The {keyword} is a must try!",
    "Had a great dinner with family at {company}. Delicious {keyword} and lovely ambience.",
    "One of our favorite food spots! {company} has the best {keyword} in town.",
    "Clean place, great music, and mouthwatering {keyword} at {company}."
]

RESTAURANT_CLOSERS_5_EN = [
    "Will definitely visit again soon!",
    "Highly recommended for food lovers!",
    "Can't wait to come back!",
    "Great vibes and tasty food. 5 stars!"
]

# Category-Specific 5-Star English Beauty and Salon
BEAUTY_OPENERS_5_EN = [
    "Really loved my visit to {company}! Their work on {keyword} was fantastic and staff was very polite.",
    "Had an amazing experience at {company}. The {keyword} turned out beautiful and stylish!",
    "Super happy with {company}! Great service on {keyword} and very clean, relaxing environment.",
    "Best salon experience! {company} did my {keyword} wonderfully and with great care.",
    "Extremely satisfied with {company}. The team is skilled and did my {keyword} perfectly."
]

BEAUTY_CLOSERS_5_EN = [
    "Highly recommend this salon!",
    "Definitely coming back for my next visit!",
    "5 stars all the way!",
    "Loved the outcome, thank you team!",
    "Will definitely be returning soon!"
]

# Category-Specific 4-Star English Beauty and Salon
BEAUTY_OPENERS_4_EN = [
    "Good experience at {company} for {keyword}. Loved the result, just a slight delay in appointment start time and turnaround.",
    "Nice service and skilled staff at {company}. Great {keyword}, though response time to booking could be slightly faster.",
    "Pleasant visit to {company}. Quality work on {keyword}, with just a little room for faster communication."
]

BEAUTY_CLOSERS_4_EN = [
    "Overall a positive experience, would recommend.",
    "Good service and skilled staff.",
    "Happy with the results and will visit again."
]

# ==============================================================================
# 4-STAR TEMPLATES: Overall positive, with one mild, plausible improvement area
# ==============================================================================

OPENERS_4_EN = [
    "Good experience with {company} for {keyword}. Quality work and friendly team, just a slight delay in initial response time.",
    "Happy with the outcome on {keyword}. {company} did a solid job, would just appreciate slightly quicker communication updates.",
    "Nice work on {keyword} by {company}. Decent pricing and supportive staff, minor wait in initial turnaround.",
    "Reliable service overall. {company} handled our {keyword} well, with just a little room for faster response and communication.",
    "Solid 4-star experience with {company}! Good quality {keyword}, though initial response could be slightly faster.",
    "Satisfied with {company}'s work on {keyword}. Professional team, just a minor delay in turnaround time."
]

CLOSERS_4_EN = [
    "Overall a positive experience, would recommend.",
    "Good value for money and solid service.",
    "Happy with the results and will use them again.",
    "Solid work from a dependable team."
]

# Category-Specific 4-Star Restaurant
RESTAURANT_OPENERS_4_EN = [
    "Tasty food and good vibes at {company}. Loved their {keyword}, just had to wait a few minutes for a table.",
    "Really nice dinner at {company}. Great {keyword} and courteous staff, service turnaround was just a bit slow during rush hour.",
    "Good food and pleasant atmosphere at {company}. The {keyword} tasted great, though response for seating took a little time."
]

RESTAURANT_CLOSERS_4_EN = [
    "Overall a good visit, definitely worth checking out.",
    "Tasty food, will probably visit again on a weekday.",
    "Solid 4-star dining spot."
]

# ==============================================================================
# HINDI AUTHENTIC HUMAN TEMPLATES
# ==============================================================================

OPENERS_5_HI = [
    "{company} के साथ {keyword} का अनुभव बहुत बढ़िया रहा! समय पर काम हुआ और टीम बहुत मददगार है।",
    "{keyword} के लिए {company} सबसे अच्छी चॉइस है। काम की क्वालिटी बेहतरीन थी और व्यवहार भी बहुत अच्छा।",
    "बहुत ही शानदार सर्विस! {company} ने हमारे {keyword} का काम बिना किसी परेशानी के पूरा किया।",
    "सुपर अनुभव! {company} की टीम ने {keyword} बहुत ही प्रोफेशनल तरीके से किया।",
    "काफी संतुष्ट हूँ {company} की सर्विस से। {keyword} का काम बहुत ही सफाई और समय पर किया।"
]

CLOSERS_5_HI = [
    "Highly recommended!",
    "5 स्टार सर्विस!",
    "पूरी टीम का बहुत-बहुत धन्यवाद!",
    "भविष्य में भी इन्हीं से काम करवाएंगे।"
]

OPENERS_4_HI = [
    "{company} के साथ {keyword} का अनुभव काफी अच्छा रहा। काम की क्वालिटी बढ़िया है, बस शुरुआत में थोड़ा समय लगा।",
    "कुल मिलाकर अच्छी सर्विस मिली। {keyword} का काम समय पर हुआ और टीम भी काफी सपोर्टिव है।",
    "{company} ने {keyword} का काम अच्छा किया। सर्विस अच्छी है, बस रिस्पॉन्स थोड़ा और तेज हो सकता था।"
]

CLOSERS_4_HI = [
    "कुल मिलाकर अच्छा अनुभव रहा, 4 स्टार!",
    "काम अच्छा है, सिफारिश कर सकते हैं।",
    "संतुष्ट हूँ इनके काम से।"
]

# ==============================================================================
# GUJARATI AUTHENTIC HUMAN TEMPLATES
# ==============================================================================

OPENERS_5_GU = [
    "{company} સાથે {keyword} નો અનુભવ બહુ જ સરસ રહ્યો! ટીમ ખૂબ હેલ્પફુલ છે અને કામ પણ એકદમ પરફેક્ટ થયું.",
    "{keyword} માટે {company} ની સર્વિસ બેસ્ટ છે. બધું કામ સમયસર અને સરસ પૂરું કર્યું.",
    "ખૂબ જ સંતોષકારક સેવા! {company} ની ટીમે {keyword} માં બહુ સરસ કામ કર્યું.",
    "સુપર સર્વિસ! {company} નું {keyword} નું કામ ખૂબ ગમ્યું. સ્ટાફ પણ એકદમ સારો અને વિનમ્ર છે.",
    "ખૂબ સારો અનુભવ! {company} એ {keyword} માં પૂરી મદદ કરી. કામની ગુણવત્તા ઉત્તમ છે."
]

CLOSERS_5_GU = [
    "Highly recommended!",
    "5 સ્ટાર સેવા!",
    "ખૂબ ખૂબ આભાર!",
    "ફરીથી તેમની સાથે જ કામ કરીશું."
]

OPENERS_4_GU = [
    "{company} સાથે {keyword} નો સારો અનુભવ રહ્યો. કામ ઉત્તમ છે, માત્ર શરૂઆતમાં થોડો સમય વધુ લાગ્યો હતો.",
    "એકંદરે ખૂબ સારી સર્વિસ. {keyword} નું કામ સરસ થયું, સ્ટાફ પ્રોફેશનલ છે અને પરિણામ સારું છે.",
    "{company} ની સર્વિસ સારી છે. {keyword} માટે સારો અનુભવ રહ્યો, માત્ર પ્રતિસાદ થોડો વધુ ઝડપી હોત તો સારું."
]

CLOSERS_4_GU = [
    "એકંદરે સારો અનુભવ રહ્યો, 4 સ્ટાર!",
    "કામ સારું છે અને ટીમ પણ સારી છે.",
    "કામથી સંતુષ્ટ છીએ."
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
    Generate small, authentic, human-sounding customer review variations in English, Hindi, or Gujarati.
    Produces realistic customer reviews tailored specifically to the target rating (4-star vs 5-star).
    """
    results = []
    seen = set()

    lang = (language or "en").lower().strip()
    is_restaurant = category and "restaurant" in category.lower()
    is_beauty = category and any(b in category.lower() for b in ["beauty", "salon", "spa", "hair", "skin", "care"])
    is_four_star = int(target_rating) == 4

    if lang in ("gu", "gujarati"):
        if is_four_star:
            openers = OPENERS_4_GU
            closers = CLOSERS_4_GU
        else:
            openers = OPENERS_5_GU
            closers = CLOSERS_5_GU
    elif lang in ("hi", "hindi"):
        if is_four_star:
            openers = OPENERS_4_HI
            closers = CLOSERS_4_HI
        else:
            openers = OPENERS_5_HI
            closers = CLOSERS_5_HI
    elif is_beauty:
        if is_four_star:
            openers = BEAUTY_OPENERS_4_EN
            closers = BEAUTY_CLOSERS_4_EN
        else:
            openers = BEAUTY_OPENERS_5_EN
            closers = BEAUTY_CLOSERS_5_EN
    elif is_restaurant:
        if is_four_star:
            openers = RESTAURANT_OPENERS_4_EN
            closers = RESTAURANT_CLOSERS_4_EN
        else:
            openers = RESTAURANT_OPENERS_5_EN
            closers = RESTAURANT_CLOSERS_5_EN
    else:
        if is_four_star:
            openers = OPENERS_4_EN
            closers = CLOSERS_4_EN
        else:
            openers = OPENERS_5_EN
            closers = CLOSERS_5_EN

    sample_openers = list(openers)
    sample_closers = list(closers)

    random.shuffle(sample_openers)
    random.shuffle(sample_closers)

    total_pool_needed = max(40, count * 8)
    for i in range(total_pool_needed):
        op = sample_openers[i % len(sample_openers)]
        cl = sample_closers[(i * 3 + 1) % len(sample_closers)]

        sentence1 = op.format(company=company_name, keyword=keyword)
        sentence2 = cl.format(company=company_name, keyword=keyword)

        if length == "short":
            # 1 short, crisp sentence
            full_review = sentence1
        elif length == "long":
            # 2 to 3 concise human sentences
            if is_four_star:
                if lang in ("hi", "hindi"):
                    extra = "थोड़ा समय जरूर लगा, लेकिन परिणाम से हम खुश हैं।"
                elif lang in ("gu", "gujarati"):
                    extra = "થોડો સમય વધુ લાગ્યો, પણ પરિણામથી અમે ખુશ છીએ."
                else:
                    extra = "A little wait during the process, but happy with the final result."
            else:
                if lang in ("hi", "hindi"):
                    extra = "काम बहुत ही साफ-सुथरा और बिना किसी झंझट के पूरा हुआ।"
                elif lang in ("gu", "gujarati"):
                    extra = "બધું કામ એકદમ સરળતાથી અને કોઈ પણ મુશ્કેલી વગર પૂરું થયું."
                else:
                    extra = "Everything was handled smoothly and without any complications."
            full_review = f"{sentence1} {extra} {sentence2}"
        else:  # medium / natural default
            # 1 natural opener + 1 punchy closer (approx 15-22 words)
            full_review = f"{sentence1} {sentence2}"

        if full_review not in seen:
            seen.add(full_review)
            results.append(full_review)

    random.shuffle(results)
    return results
