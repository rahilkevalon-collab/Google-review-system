from flask import Blueprint, request, jsonify
from services.review_service import review_service
from services.company_service import company_service
from ai.generator import generator_service
from utils.rate_limiter import generation_rate_limiter

review_bp = Blueprint("review_bp", __name__)

@review_bp.route("/generate-reviews", methods=["POST"])
def generate_reviews():
    data = request.get_json(silent=True) or {}
    
    company_id = data.get("companyId", "").strip()
    company_name = data.get("companyName", "").strip()
    category = data.get("category", "").strip()
    raw_kws = data.get("selectedKeywords") or data.get("keywords") or data.get("keyword") or ""
    if isinstance(raw_kws, list):
        kw_list = [str(k).strip() for k in raw_kws if str(k).strip()]
        keyword = ", ".join(kw_list)
    else:
        keyword = str(raw_kws).strip()

    # Fallback to look up company if company_name not provided
    comp = None
    if company_id:
        comp = company_service.get_company_by_id(company_id)
        if comp:
            if not company_name:
                company_name = comp.get("name", "")
            if not category:
                category = comp.get("category", "")
            if not keyword:
                comp_kws = comp.get("seoKeywords") or comp.get("keywords") or []
                keyword = ", ".join(comp_kws) if isinstance(comp_kws, list) else str(comp_kws)

    if not company_name:
        return jsonify({"success": False, "error": "Company name or valid company ID is required."}), 400
    if not keyword:
        return jsonify({"success": False, "error": "SEO keyword is required for review generation."}), 400

    # Rate limiting & cooldown check
    client_ip = request.remote_addr or "client-default"
    identifier = f"{client_ip}:{company_id or company_name}"
    allowed, rate_msg = generation_rate_limiter.is_allowed(identifier)
    if not allowed:
        return jsonify({"success": False, "error": rate_msg, "rateLimited": True}), 429

    language = data.get("language") or (comp.get("preferredLanguage") if comp else "en") or "en"
    tone = data.get("tone", "natural")
    length = data.get("length", "medium")
    count = int(data.get("count", 3))
    description = data.get("description") or (comp.get("description") if comp else "") or ""
    services = data.get("services") or (comp.get("services") if comp else "") or ""
    location = data.get("location") or (comp.get("location") if comp else "") or ""
    threshold = float(data.get("similarityThreshold")) if data.get("similarityThreshold") is not None else None

    try:
        result = generator_service.generate_reviews(
            company_id=company_id or "default",
            company_name=company_name,
            category=category or "Other",
            keyword=keyword,
            description=description,
            services=services,
            location=location,
            language=language,
            tone=tone,
            length=length,
            count=count,
            threshold=threshold
        )
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"success": False, "error": f"Generation failed: {str(e)}"}), 500

@review_bp.route("/reviews", methods=["GET"])
def get_reviews():
    company_id = request.args.get("companyId")
    keyword = request.args.get("keyword")
    category = request.args.get("category")
    tone = request.args.get("tone")
    language = request.args.get("language")
    search = request.args.get("search")
    page = int(request.args.get("page", 1))
    limit = int(request.args.get("limit", 12))

    data = review_service.list_reviews(
        company_id=company_id,
        keyword=keyword,
        category=category,
        tone=tone,
        language=language,
        search=search,
        page=page,
        limit=limit
    )
    return jsonify({"success": True, **data}), 200

@review_bp.route("/reviews/<review_id>", methods=["GET"])
def get_single_review(review_id):
    review = review_service.get_review_by_id(review_id)
    if not review:
        return jsonify({"success": False, "error": "Review suggestion not found"}), 404
    return jsonify({"success": True, "review": review}), 200

@review_bp.route("/reviews/<review_id>", methods=["PUT", "PATCH"])
def update_review(review_id):
    data = request.get_json(silent=True) or {}
    text = data.get("reviewText", "").strip()
    if not text:
        return jsonify({"success": False, "error": "Review text cannot be empty."}), 400

    updated = review_service.update_review_text(review_id, text)
    if not updated:
        return jsonify({"success": False, "error": "Could not update review."}), 404
    return jsonify({"success": True, "review": updated}), 200

@review_bp.route("/reviews/<review_id>/copy-event", methods=["POST"])
def record_copy(review_id):
    success = review_service.record_copy_event(review_id)
    if not success:
        return jsonify({"success": False, "error": "Review not found"}), 404
    return jsonify({"success": True, "message": "Copy event logged"}), 200
