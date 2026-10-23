import random

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

# Hindi components
OPENERS_HI = [
    "{company} के साथ {keyword} का अनुभव अत्यंत सराहनीय और सुखद रहा।",
    "यदि आप {keyword} में बेहतरीन सेवा और विश्वसनीयता चाहते हैं, तो {company} सबसे उत्तम विकल्प है।",
    "{company} ने {keyword} के मामले में हमारी सभी अपेक्षाओं को पार कर दिखाया।",
    "{company} के साथ जुड़ना हमारे लिए बहुत ही फायदेमंद और सकारात्मक निर्णय साबित हुआ।",
    "{keyword} के लिए {company} की सेवाएं वास्तव में प्रभावशाली और भरोसेमंद हैं।"
]

BODIES_HI = [
    "उनकी टीम ने बहुत ही पेशेवर तरीके से काम किया और समय पर उच्च गुणवत्ता प्रदान की।",
    "काम की गति, स्पष्ट बातचीत और ग्राहकों के प्रति समर्पण वास्तव में प्रशंसनीय था।",
    "उन्होंने हमारी हर आवश्यकता को ध्यान से समझा और बिना किसी परेशानी के कार्य पूर्ण किया।",
    "गुणवत्ता और सेवा दोनों के मामले में {company} ने उत्कृष्ट मानक स्थापित किए हैं।"
]

CLOSERS_HI = [
    "हम निश्चित रूप से {company} की सभी को अनुशंसा करते हैं।",
    "पांच में से पांच स्टार! भविष्य में भी हम इनकी सेवाएं लेते रहेंगे।",
    "एक अत्यंत भरोसेमंद और पेशेवर संस्था, बहुत-बहुत धन्यवाद!",
    "शानदार अनुभव! बिना किसी झिझक के {company} से संपर्क करें।"
]

# Gujarati components
OPENERS_GU = [
    "{company} સાથે {keyword} માટે કામ કરવાનો અનુભવ અત્યંત સંતોષકારક રહ્યો છે.",
    "{keyword} માટે {company} ની સેવાઓ ખરેખર ઉત્કૃષ્ટ અને વિશ્વસનીય છે.",
    "શરૂઆતથી લઈને અંત સુધી {company} ની ટીમે {keyword} માં શ્રેષ્ઠ સહયોગ આપ્યો.",
    "જો તમે {keyword} માટે શ્રેષ્ઠ પરિણામ ઇચ્છતા હોવ તો {company} એકદમ યોગ્ય પસંદગી છે."
]

BODIES_GU = [
    "તેમની ટીમે ખૂબ જ પ્રોફેશનલ રીતે અને સમયસર કામ પૂરું કરી આપ્યું છે.",
    "સર્વિસની ગુણવત્તા, સચોટ માર્ગદર્શન અને ગ્રાહક સંતોષ બંને અજોડ છે.",
    "કામગીરીમાં પારદર્શિતા અને ચોકસાઈ જોઈને અમને ખૂબ આનંદ થયો."
]

CLOSERS_GU = [
    "અમે પૂરા વિશ્વાસ સાથે {company} ની ભલામણ કરીએ છીએ.",
    "ઉત્તમ સેવા બદલ સમગ્ર ટીમનો ખૂબ ખૂબ આભાર! પાંચ સ્ટાર અનુભવ.",
    "ભવિષ્યમાં પણ અમે ચોક્કસપણે {company} ની જ સેવા લઈશું."
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
    Generate a large pool of unique, combinatorial review variations.
    Produces 30+ distinct candidates by combining dynamic openers, bodies, and closers.
    """
    lang_key = language.lower() if language else "en"
    if lang_key not in ["en", "hi", "gu"]:
        lang_key = "en"

    results = []
    seen = set()

    if lang_key == "hi":
        openers = OPENERS_HI
        bodies = BODIES_HI
        closers = CLOSERS_HI
    elif lang_key == "gu":
        openers = OPENERS_GU
        bodies = BODIES_GU
        closers = CLOSERS_GU
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

    loc_str = f" in {location}" if location and random.random() > 0.5 else ""

    total_pool_needed = max(35, count * 8)
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
            extra = f"Their dedication to {keyword} made all the difference for our organization."
            full_review = f"{sentence1} {sentence2} {extra} {sentence3}"
        else: # medium
            full_review = f"{sentence1} {sentence2} {sentence3}"

        if full_review not in seen:
            seen.add(full_review)
            results.append(full_review)

    random.shuffle(results)
    return results
