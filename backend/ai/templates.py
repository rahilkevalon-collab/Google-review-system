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

# Restaurant-specific openers in English
RESTAURANT_OPENERS_EN = [
    "Dining at {company} was an incredible culinary experience, especially with their focus on {keyword}.",
    "The food quality and hospitality at {company} regarding {keyword} were truly world-class.",
    "If you are looking for exceptional taste and {keyword}, {company} is hands down the best place in town.",
    "My dinner at {company} exceeded all expectations—their {keyword} was phenomenal.",
    "Hands down the most delightful restaurant for an unforgettable meal and outstanding {keyword}.",
    "From the appetizers to the final dessert at {company}, everything revolving around {keyword} was exquisite.",
    "We reserved a table at {company} for our family dinner, and their {keyword} made it truly memorable.",
    "Super impressed with the culinary craft, presentation, and {keyword} at {company}.",
    "I was recommended {company} for {keyword}, and it turned out to be one of our favorite food destinations.",
    "The chefs and service team at {company} take immense pride in their {keyword}, and it shows in every dish.",
    "Outstanding food taste and attentive warmth from {company}—their attention to {keyword} is second to none.",
    "We recently visited {company} and were genuinely blown away by the authentic flavors and their dedication to {keyword}.",
    "A fantastic dining experience from start to finish with {company} for {keyword}.",
    "Can't say enough good things about {company} and their mouthwatering menu and {keyword}."
]

RESTAURANT_BODIES_EN = [
    "The dishes were freshly prepared, rich in authentic flavors, and served with great care and attention.",
    "Every course arrived promptly, perfectly seasoned, and beautifully presented by courteous staff.",
    "The ingredients were remarkably fresh, and the hospitality team made us feel right at home.",
    "The balance of authentic spices, generous portions, and attentive table service made for a perfect meal.",
    "The culinary expertise was evident in every bite, accompanied by swift, warm, and friendly service.",
    "The atmosphere was welcoming, the decor was tasteful, and every special food request was accommodated seamlessly.",
    "The signature recipes and beverage pairings elevated our entire dining experience."
]

RESTAURANT_CLOSERS_EN = [
    "I will definitely be bringing my friends and family back to {company} very soon!",
    "A true gastronomic gem! Highly recommend booking a table at {company}.",
    "Easily a five-star culinary experience. You will not be disappointed!",
    "Can't wait to visit again and explore more of their delightful menu.",
    "An extraordinary dining journey from start to finish. Hats off to the entire team at {company}!",
    "Truly one of the finest dining spots around. Worth every single penny!"
]

# General business openers in English
OPENERS_EN = [
    "I had a thoroughly positive experience with {company} for {keyword}.",
    "Working with {company} regarding {keyword} has been an absolute pleasure.",
    "If you are looking for dependable quality in {keyword}, {company} is the real deal.",
    "My experience with {company} regarding {keyword} exceeded all expectations.",
    "Hands down the most reliable and efficient team for {keyword}.",
    "From the first interaction with {company}, everything was handled with exceptional care.",
    "We entrusted {company} with our {keyword} needs, and they delivered flawlessly.",
    "Super impressed with the professionalism and standard of work at {company}.",
    "I was recommended {company} for {keyword}, and I could not be happier with the outcome.",
    "Choosing {company} for our {keyword} was one of the best decisions we made.",
    "The commitment to excellence at {company} regarding {keyword} is immediately noticeable.",
    "Outstanding service from {company}—their attention to {keyword} is second to none.",
    "We recently engaged {company} for {keyword} and were genuinely blown away by their dedication.",
    "A fantastic experience from start to finish with {company} for {keyword}.",
    "Can't say enough good things about {company} and their expertise in {keyword}."
]

BODIES_EN = [
    "Their team demonstrated deep industry knowledge and fulfilled our requirements right on schedule.",
    "The quality of the service was top-tier, communication was clear, and delivery was remarkably fast.",
    "Every single detail of our {keyword} request was executed with precision and prompt support.",
    "They understood our specific requirements immediately and provided a seamless, effective solution.",
    "The turnaround time was swift, the pricing was fair, and customer care was world-class.",
    "The entire process was stress-free, transparent, and built around our exact goals.",
    "Their specialists were courteous, responsive, and always ready to go the extra mile.",
    "They kept us informed at every milestone and ensured everything met strict quality standards.",
    "Consistent excellence, high standards, and genuine care for customer satisfaction set them apart.",
    "The attention to detail and care shown toward our {keyword} was truly commendable.",
    "Their prompt communication and solution-oriented mindset made the entire collaboration effortless.",
    "They tackled every nuance of our {keyword} project with unmatched professionalism."
]

CLOSERS_EN = [
    "I would definitely recommend them to anyone seeking premium quality and dependable service.",
    "Five stars all around! Looking forward to continuing our partnership in the future.",
    "A trustworthy company that stands firmly behind its promises and deliverables.",
    "Very pleased with the results and will certainly be returning for future requirements.",
    "Do not hesitate to give {company} a try—you will be thrilled with their high standard.",
    "Couldn't have asked for a smoother experience. Truly deserving of every bit of praise!",
    "A breath of fresh air in the industry. Highly, highly recommended!",
    "Honest, reliable, and thorough from start to finish. Big thumbs up to the entire team!",
    "An absolute pleasure to do business with. Keep up the phenomenal work!",
    "I have already recommended them to several friends and business associates."
]

# Hindi templates
OPENERS_HI = [
    "{company} के साथ {keyword} के संबंध में हमारा अनुभव बहुत ही शानदार रहा।",
    "{company} की सेवा और {keyword} में उनकी दक्षता वाकई प्रशंसनीय है।",
    "यदि आप उत्कृष्ट {keyword} की तलाश में हैं, तो {company} सबसे बेहतरीन विकल्प है।",
    "{company} की पूरी टीम ने {keyword} को लेकर हमारे हर लक्ष्य को समय पर पूरा किया।",
    "{company} के साथ काम करना हमारे लिए बहुत ही सुखद और संतोषजनक अनुभव रहा।"
]

BODIES_HI = [
    "शुरुआत से लेकर अंत तक पूरी प्रक्रिया बेहद पारदर्शी, समयबद्ध और पेशेवर रही।",
    "गुणवत्ता, ग्राहक संतुष्टि और निरंतर संवाद के मामले में उन्होंने हमारे विश्वास को पूरा किया।",
    "उनकी टीम हर विवरण पर बारीकी से ध्यान देती है और हमेशा मदद के लिए तत्पर रहती है।",
    "सभी कार्य उच्चतम मानकों के अनुसार और बिना किसी परेशानी के पूरे किए गए।"
]

CLOSERS_HI = [
    "हम सभी को {company} की पुरजोर अनुशंसा करते हैं। बेहतरीन कार्य!",
    "शानदार सेवा! भविष्य में भी हम {company} के साथ ही जुड़ना चाहेंगे।",
    "{company} की पूरी टीम को हार्दिक धन्यवाद और शुभकामनाएं।",
    "उत्कृष्ट परिणाम और शत-प्रतिशत संतुष्टि! ज़रूर संपर्क करें।"
]

# Gujarati templates
OPENERS_GU = [
    "{company} સાથે અમારો {keyword} અંગેનો અનુભવ ખુબ જ ઉત્તમ અને સંતોષકારક રહ્યો.",
    "{company} ની ટીમ અને {keyword} માં તેમનું કામ ખરેખર શ્રેષ્ઠ અને ભરોસાપાત્ર છે.",
    "જો તમે ગુણવત્તાસભર {keyword} શોધી રહ્યા હોવ, તો {company} શ્રેષ્ઠ પસંદગી છે.",
    "{company} એ અમારી જરૂરિયાત સમજીને {keyword} બાબતે ખુબ સુંદર પરિણામ આપ્યું.",
    "{company} સાથે કામ કરવું ખૂબ જ સરળ અને પ્રોફેશનલ રહ્યું."
]

BODIES_GU = [
    "સમયસર સેવા, સ્પષ્ટ વાતચીત અને શ્રેષ્ઠ ગુણવત્તા તેમના કામની વિશેષતા છે.",
    "દરેક તબક્કે પારદર્શિતા જળવાઈ રહી અને ગ્રાહક સંતોષને સર્વોચ્ચ પ્રાથમિકતા આપી.",
    "તેમનું ગ્રાહકલક્ષી વલણ અને ટીમનો ઉત્સાહ ખરેખર પ્રશંસનીય છે.",
    "બધું કામ નક્કી કરેલા ધોરણો અને સમય મર્યાદામાં ઉત્કૃષ્ટ રીતે પૂર્ણ થયું."
]

CLOSERS_GU = [
    "અમે {company} ની સેવાઓને દિલથી ભલામણ કરીએ છીએ. ઉત્તમ કાર્ય!",
    "ફરીથી તેમની સાથે જોડાવાનો ચોક્કસ આનંદ થશે. ખૂબ ખૂબ આભાર {company}!",
    "શ્રેષ્ઠ ગુણવત્તા અને પૂરેપૂરો સંતોષ! અદ્ભુત અનુભવ.",
    "{company} ની સમગ્ર ટીમને ઉત્કૃષ્ટ કાર્ય બદલ અભિનંદન."
]

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
    **kwargs
) -> list[str]:
    """
    Generate a large pool of unique review variations in English, Hindi, or Gujarati.
    Produces 40+ distinct candidates by combining dynamic openers, bodies, and closers.
    """
    results = []
    seen = set()

    lang = (language or "en").lower().strip()
    is_restaurant = category and "restaurant" in category.lower()

    if lang in ("gu", "gujarati"):
        openers = OPENERS_GU
        bodies = BODIES_GU
        closers = CLOSERS_GU
    elif lang in ("hi", "hindi"):
        openers = OPENERS_HI
        bodies = BODIES_HI
        closers = CLOSERS_HI
    elif is_restaurant:
        openers = RESTAURANT_OPENERS_EN
        bodies = RESTAURANT_BODIES_EN
        closers = RESTAURANT_CLOSERS_EN
    else:
        openers = OPENERS_EN
        bodies = BODIES_EN
        closers = CLOSERS_EN

    # Generate combinatorial permutations with interleaved offsets
    sample_openers = list(openers)
    sample_bodies = list(bodies)
    sample_closers = list(closers)

    random.shuffle(sample_openers)
    random.shuffle(sample_bodies)
    random.shuffle(sample_closers)

    loc_str = ""
    if location and random.random() > 0.5:
        if lang in ("hi", "hindi"):
            loc_str = f" ({location})"
        elif lang in ("gu", "gujarati"):
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
            if lang in ("hi", "hindi"):
                extra = f"{keyword} के प्रति उनका समर्पण हमारे लिए बेहद मददगार साबित हुआ।"
            elif lang in ("gu", "gujarati"):
                extra = f"{keyword} માટેનું તેમનું સમર્પણ અમારા માટે ખૂબ ફાયદાકારક સાબિત થયું."
            else:
                extra = f"Their dedication to {keyword} made all the difference for us."
            full_review = f"{sentence1} {sentence2} {extra} {sentence3}"
        else:  # medium
            full_review = f"{sentence1} {sentence2} {sentence3}"

        if full_review not in seen:
            seen.add(full_review)
            results.append(full_review)

    random.shuffle(results)
    return results
