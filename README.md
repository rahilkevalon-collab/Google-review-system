# ReviewCraft AI: SEO Business Review Generator & Onboarding Flow

An enterprise-grade, full-stack AI review generation and Google Review onboarding platform inspired by modern review platforms such as [Tapzy Reviews](https://ai.tapzy.in/review/0dcd84f7). The application enables businesses to onboard with their real company details, services, location, and target SEO keywords, then synthesizes diverse, non-repeating review suggestions powered by Scikit-Learn TF-IDF vectorization, cosine similarity deduplication, and MongoDB persistence.

> **Legal & Ethical Notice**: All generated reviews are strictly labelled as **AI-generated draft suggestions** for marketing and search visibility purposes. In compliance with review platform policies, suggestions are **never automatically posted** to Google; users manually copy editable drafts and voluntarily submit them on the official Google review form. Demo stars are clearly designated as synthetic demonstration ratings.

---

## 1. System Architecture & Workflow

```mermaid
graph TD
    P1["Page 1: /setup (Company Setup Form)"] -->|POST /api/companies (Place ID, Services, Keywords)| API["Flask REST API Server (:5000)"]
    API -->|Save Profile| DB[("MongoDB Collections: companies, generated_reviews, generation_logs")]
    P1 -->|React Router Navigate| P2["Page 2: /reviews/:companyId (Tapzy-Inspired Dark Studio)"]
    P2 -->|POST /api/generate-reviews| API
    API -->|TF-IDF Vectorization & Cosine Similarity Deduplication| DEDUP["NLP Deduplication Engine (Threshold: 0.72)"]
    API -->|Template / LLM Synthesis| LLM["Pluggable Engine (Gemini API or Multilingual Templates)"]
    DEDUP -->|Verified Distinct Reviews (3)| P2
    P2 -->|Click Card| P3["Page 3: /review/:reviewId (Editor & Review Detail)"]
    P2 -->|Copy & Open Google| GOOGLE["Google Reviews Destination (Verified Place ID writereview link)"]
    P3 -->|PATCH /api/reviews/:reviewId| API
```

---

## 2. Technology Stack

- **Frontend**: React 19, Vite, Tailwind CSS v4, Lucide React, React Router v7.
- **Backend**: Python 3.12, Flask 3.1, Flask-CORS, python-dotenv, Werkzeug.
- **Database**: MongoDB (Atlas or local MongoDB server on port 27017, with automatic in-memory `mongomock` fallback).
- **Machine Learning & NLP**: Scikit-learn (`TfidfVectorizer`, `cosine_similarity`), NumPy, SHA-256 Content Hashing.
- **Google Maps & Places**: Google Places API Text Search for autocomplete & Place ID detection, with resilient manual fallback.
- **AI Integration**: Pluggable LLM Provider abstraction (`google-genai` / Gemini 2.5 Flash, or High-Quality Template Engine supporting English, Hindi, and Gujarati).

---

## 3. Workflow & Page Overview

### Page 1 — Company Setup Form (`/setup`, `/`)
- **Heading**: "Generate Business Reviews"
- **Company / Business Name**: Required input with real-time Google Places API auto-detection and autocomplete suggestions.
- **Services Offered**: Comma-separated input (e.g. *Web Development, AI Solutions, Mobile App Development, SEO Services*).
- **SEO Keywords**: Comma-separated input (e.g. *Web Development India, AI Solutions India, Software Development Company India, Digital Marketing India*).
- **Business Category**: Searchable dropdown featuring 11+ industry categories.
- **Company Location**: Auto-detects matching businesses via Google Places API, populates verified address and Google Place ID, with manual location entry fallback.
- **Preferred Review Language**: English (`en`), Hindi (`hi`), Gujarati (`gu`).
- **Description**: Optional business overview.
- **Action**: Prominent "Generate Reviews" button persists the profile to MongoDB and navigates to Page 2 (`/reviews/:companyId`).

### Page 2 — Review Generation UI (`/reviews/:companyId`)
- **Visual Identity**: Dark, modern, premium UI inspired by the Tapzy Reviews screenshot with deep purple radial gradients and glassmorphism.
- **Header**: "Review [Company Name]" (white heading with purple gradient business name) and subtitle "SELECT KEYWORDS & GENERATE REVIEW SUGGESTIONS".
- **Configurable Rating Distribution Settings**:
  - Toolbar with presets: **60% 5★ / 40% 4★ (Recommended Mix)**, **70% 5★ / 30% 4★ (High Praise)**, **50% 5★ / 50% 4★ (Balanced Mix)**, **100% 5★**.
  - **Custom Ratio Mode**: Live validation ensuring that custom percentages sum to exactly 100%.
  - Persisted in `localStorage` across page reloads.
- **Natural, Balanced Review Suggestions**:
  - **5-Star Suggestions**: Grounded, specific, and professional praise without hyperbolic marketing fluff or fake enthusiasm.
  - **4-Star Suggestions**: Genuinely positive overall while incorporating one mild, plausible operational or process observation (e.g., initial response time, onboarding documentation, or milestone status reporting frequency).
- **Rounded Purple Keyword Chips**:
  - Dynamically rendered from the user-provided SEO keywords.
  - Supports single-select and multi-select.
  - Allows adding new keyword chips and removing existing ones.
- **3 Review Cards**:
  - Italic, readable review drafts incorporating the company's real details.
  - SEO keyword badge and company name badge.
  - Star rating display with clearly labelled Demo Rating tags (`★ 4.0 (Demo)` and `★ 5.0 (Demo)` with 4 or 5 gold stars).
  - One-click **Copy Review** button with instant feedback toast.
  - **Open Google Reviews** button resolving direct Google Place ID review URLs (`https://search.google.com/local/writereview?placeid=...`) without Google 400 Bad Request errors.
  - Clicking a review card navigates to `/review/:reviewId`.
- **Generation Controls**:
  - **Regenerate**: Generates a fresh batch of non-repeating reviews.
  - **Generate More Reviews**: Requests additional unique suggestions.
  - **Persistence**: Reloading the page reloads the company and keywords directly from MongoDB.

### Page 3 — Review Detail & Editor (`/review/:reviewId`)
- Displays company name, location/address, selected keyword, assigned star rating (`4.0` or `5.0`), demo rating badge, and word/character counts.
- Editable textarea allowing users to customize suggestions to reflect their genuine experience.
- **Save Edits** button: Persists changes to MongoDB via `PATCH /api/reviews/:reviewId`.
- **Copy Review Text** button: Copies to clipboard with success toast.
- **Open Google Reviews** button: Copies review and opens Google in a new tab with explicit instructions to paste.

---

## 4. API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check and active AI model status |
| `GET` | `/api/settings/rating-distribution` | Supported rating presets (60/40, 70/30, 50/50, 100/0) & default configuration |
| `GET` | `/api/categories` | List all business categories |
| `GET` | `/api/categories/:cat/keywords` | List default keywords for a category |
| `POST` | `/api/companies` | Create a company profile with Place ID, services, and SEO keywords |
| `GET` | `/api/companies` | List saved companies |
| `GET` | `/api/companies/:id` | Fetch company profile details |
| `GET` | `/api/companies/search?query=...` | Google Places API company search & place ID lookup |
| `GET` | `/api/companies/:id/google-review-link`| Get verified Google Maps write-review destination URL |
| `POST` | `/api/companies/:id/keywords` | Add a keyword to company profile |
| `DELETE`| `/api/companies/:id/keywords/:kw` | Remove a keyword from company profile |
| `POST` | `/api/generate-reviews` | Synthesize reviews with TF-IDF deduplication |
| `GET` | `/api/reviews` | List generated reviews with filters |
| `GET` | `/api/reviews/:id` | Get single review suggestion details |
| `PUT`/`PATCH` | `/api/reviews/:id` | Update / edit review text |
| `POST` | `/api/reviews/:id/copy-event` | Track review copy action for analytics |
| `GET` | `/api/analytics/overview` | Platform generation & deduplication metrics |

---

## 5. MongoDB Collections Schema

### `companies`
- `_id`: ObjectId
- `name`: String (required)
- `category`: String
- `services`: String (comma-separated or text)
- `seoKeywords`: Array of Strings
- `description`: String
- `location`: String
- `formattedAddress`: String
- `googlePlaceId`: String (Google Places API ID)
- `googleReviewUrl`: String (Verified review link)
- `preferredLanguage`: String (`en`, `hi`, `gu`)
- `createdAt`, `updatedAt`: Date

### `generated_reviews`
- `_id`: ObjectId
- `companyId`: String (Foreign key to `companies._id`)
- `companyName`: String
- `companyLocation`: String
- `keyword` / `selectedKeywords`: String / Array
- `reviewText`: String
- `language`: String (`en`, `hi`, `gu`)
- `tone`, `length`: String
- `source`: String (`google-gemini` or `template-demo`)
- `generationBatchId`: UUID string
- `contentHash`: SHA-256 string (unique compound index with `companyId`)
- `isUserEdited`: Boolean
- `copyCount`: Number
- `createdAt`, `updatedAt`: Date

### `generation_logs`
- `_id`: ObjectId
- `companyId`: String
- `requestedKeywords`: Array of Strings
- `generatedCount`: Number
- `rejectedDuplicateCount`: Number
- `status`: String (`completed`, `failed`)
- `createdAt`: Date

---

## 6. Installation and Setup Instructions

### Prerequisites
- **Node.js**: v18+ and npm
- **Python**: v3.10+ (v3.12 recommended)
- **MongoDB**: Local MongoDB instance running on `mongodb://127.0.0.1:27017` or a MongoDB Atlas URI (falls back to `mongomock` in-memory if MongoDB is not present).

### 1. Environment Variables Configuration

In `backend/.env` (copy from `backend/.env.example`):

```ini
PORT=5000
FLASK_ENV=development
DEBUG=True

# Database Configuration
MONGODB_URI=mongodb://127.0.0.1:27017/seo_review_generator

# Google Places API (Optional: enables real-time place search & autocomplete)
# If not configured, the system uses resilient database/manual location entry.
GOOGLE_PLACES_API_KEY=your_google_places_api_key_here

# AI Model Configuration (Optional: template engine used if not provided)
GEMINI_API_KEY=your_gemini_api_key_here
AI_PROVIDER=gemini
AI_MODEL=gemini-2.5-flash

# NLP & Rate Limiting Controls
SIMILARITY_THRESHOLD=0.72
RATE_LIMIT_PER_MINUTE=60
COOLDOWN_SECONDS=0
MAX_GENERATION_RETRIES=5
```

### 2. Backend Setup & Run

```bash
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Run Unit & API Test Suite (14 tests)
py -3.12 -m pytest tests/test_backend.py -v

# Run Machine Learning TF-IDF Deduplication Benchmark
py -3.12 tests/evaluate_ml.py

# Start Flask Backend Server
py -3.12 app.py
# Server runs on http://127.0.0.1:5000
```

### 3. Frontend Setup & Run

```bash
cd frontend

# Install Node dependencies
npm install

# Build production bundle
npm run build

# Start Vite Development Server
npm run dev
# Vite runs on http://localhost:5173
```

---

## 7. Machine Learning Deduplication Benchmark

Run `py -3.12 backend/tests/evaluate_ml.py` to evaluate deduplication performance across test thresholds:

| Threshold | Accepted | Rejected | Exact Dup Rejection | Near Dup Rejection | Avg Pairwise Sim |
|---|---|---|---|---|---|
| **0.65** | 5 | 5 | 20.0% | 30.0% | 0.000 |
| **0.72 (Optimal)** | 6 | 4 | 20.0% | 20.0% | 0.006 |
| **0.80** | 7 | 3 | 20.0% | 10.0% | 0.012 |
| **0.85** | 7 | 3 | 20.0% | 10.0% | 0.012 |

- **Exact Duplicate Detection Rate**: 100% caught via SHA-256 normalized content hashing.
- **Optimal Threshold**: 0.72 provides balanced near-duplicate rejection without rejecting distinct novel reviews.
- **Linguistic Variety**: Average pairwise similarity among accepted candidates remains below 0.02.
