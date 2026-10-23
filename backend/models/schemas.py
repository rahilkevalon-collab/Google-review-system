"""
Schemas and validation helpers for MongoDB documents.
"""

INITIAL_CATEGORIES = [
    {
        "name": "IT Services and Software Development",
        "description": "Custom software, mobile apps, web engineering, cloud, and digital transformation.",
        "icon": "Code",
        "keywords": [
            "Web Development",
            "Mobile App Development",
            "AI Solutions",
            "Custom Software Development",
            "CRM & ERP Development",
            "Cloud Migration",
            "Technical Support",
            "Project Delivery"
        ]
    },
    {
        "name": "E-commerce",
        "description": "Online shopping, direct-to-consumer brands, and marketplace stores.",
        "icon": "ShoppingBag",
        "keywords": [
            "Product Quality",
            "Fast Delivery",
            "Affordable Prices",
            "Customer Support",
            "Easy Returns",
            "Shopping Experience",
            "Packaging Integrity",
            "Value for Money"
        ]
    },
    {
        "name": "Restaurants and Food",
        "description": "Fine dining, cozy cafes, culinary experiences, and quick-service eateries.",
        "icon": "Utensils",
        "keywords": [
            "Culinary Taste",
            "Ambiance & Atmosphere",
            "Attentive Service",
            "Fresh Ingredients",
            "Signature Dishes",
            "Cleanliness & Hygiene",
            "Great Value",
            "Family Friendly"
        ]
    },
    {
        "name": "Healthcare",
        "description": "Clinics, diagnostic centers, wellness centers, and specialized care.",
        "icon": "Stethoscope",
        "keywords": [
            "Doctor Expertise",
            "Compassionate Care",
            "Modern Diagnostic Equipment",
            "Minimal Wait Time",
            "Accurate Treatment",
            "Hygienic Facility",
            "Patient Counseling",
            "Emergency Response"
        ]
    },
    {
        "name": "Real Estate",
        "description": "Property consulting, residential developments, commercial leasing, and architecture.",
        "icon": "Building2",
        "keywords": [
            "Prime Location",
            "Transparent Dealings",
            "High Quality Construction",
            "On-Time Possession",
            "Legal Clarity",
            "Modern Amenities",
            "Investment Potential",
            "Customer Guidance"
        ]
    },
    {
        "name": "Education",
        "description": "Academies, tutoring centers, vocational training, and universities.",
        "icon": "GraduationCap",
        "keywords": [
            "Experienced Faculty",
            "Interactive Curriculum",
            "Practical Learning",
            "Student Mentorship",
            "Career Placement Support",
            "Modern Campus Infrastructure",
            "Personalized Attention",
            "Doubt Resolution"
        ]
    },
    {
        "name": "Travel and Hospitality",
        "description": "Boutique hotels, luxury resorts, travel agencies, and tour operators.",
        "icon": "Compass",
        "keywords": [
            "Comfortable Stay",
            "Scenic Location",
            "Courteous Staff",
            "Seamless Itinerary",
            "Prompt Room Service",
            "Custom Tour Packages",
            "Authentic Local Experiences",
            "Clean Accommodations"
        ]
    },
    {
        "name": "Beauty and Salon",
        "description": "Hair salons, skin spas, aesthetic care, and wellness therapies.",
        "icon": "Sparkles",
        "keywords": [
            "Expert Stylists",
            "Premium Products",
            "Relaxing Ambience",
            "Personalized Consultation",
            "Clean & Sanitized Equipment",
            "Trending Styles",
            "Skin Care Results",
            "Punctual Appointments"
        ]
    },
    {
        "name": "Digital Marketing",
        "description": "SEO agencies, performance marketing, content creation, and social media branding.",
        "icon": "TrendingUp",
        "keywords": [
            "SEO Ranking Growth",
            "Targeted Lead Generation",
            "High ROI Campaigns",
            "Creative Content",
            "Transparent Reporting",
            "Brand Visibility",
            "Social Media Engagement",
            "Strategy Consultation"
        ]
    },
    {
        "name": "Retail",
        "description": "Brick-and-mortar stores, lifestyle fashion, electronics, and home decor.",
        "icon": "Store",
        "keywords": [
            "Wide Selection",
            "Helpful Staff",
            "Competitive Pricing",
            "Store Ambience",
            "Exclusive Collections",
            "After-Sales Warranty",
            "Quick Billing",
            "Convenient Parking"
        ]
    },
    {
        "name": "Other",
        "description": "General professional services, consulting, logistics, and specialized industries.",
        "icon": "Layers",
        "keywords": [
            "Professionalism",
            "Timely Delivery",
            "Clear Communication",
            "Cost Effectiveness",
            "Quality Assurance",
            "Client Satisfaction",
            "Custom Solutions",
            "Industry Experience"
        ]
    }
]
