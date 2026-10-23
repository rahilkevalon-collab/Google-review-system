# ReviewCraft AI: SEO Product & Business Review Generator

An enterprise-grade, full-stack AI review generation platform inspired by the workflow of [Tapzy AI](https://ai.tapzy.in/review/0dcd84f7). The application allows businesses to generate high-performing, category-specific, SEO-keyword-optimized customer review suggestions with guaranteed non-repetition powered by Scikit-Learn TF-IDF vectorization and cosine similarity deduplication stored in MongoDB.

> **Legal & Ethical Notice**: All generated reviews are strictly labelled as **AI-generated draft suggestions** for marketing and search visibility purposes. They are not genuine or verified customer testimonials. Ratings and sentiment scores are designated as synthetic demo metrics.

---

## 1. System Architecture

```mermaid
graph TD
    User["User Interface (React + Vite + Tailwind CSS)"]
    API["Flask REST API Server (:5000)"]
    DB[("MongoDB (Local / Atlas)")]
    DEDUP["NLP Deduplication Engine (TF-IDF + Cosine Sim)"]
    LLM["Pluggable LLM Provider (Gemini / OpenAI / Demo Engine)"]

    User -->|REST API Requests (Fetch / Axios)| API
    API -->|Persist Profiles, Reviews & Logs| DB
    API -->|Vectorize Candidates & Reject Duplicates| DEDUP
    API -->|Synthesize Review Candidates| LLM
    DEDUP -->|Similarity < 0.72 Threshold| API
```

---

## 2. Technology Stack

- **Frontend**: React 19, Vite, Tailwind CSS v4, Lucide React, React Router v7.
- **Backend**: Python 3.12, Flask 3.1, Flask-CORS, python-dotenv, Gunicorn/Werkzeug.
- **Database**: MongoDB (Atlas or local MongoDB server on port 27017, with automatic in-memory `mongomock` fallback).
- **Machine Learning & NLP**: Scikit-learn (TfidfVectorizer, cosine_similarity), NumPy, Pandas, Content Hashing (SHA-256).
- **AI Integration**: Pluggable LLM Provider abstraction (`google-genai` / Gemini 2.5 Flash, OpenAI, Groq, or High-Quality Template Demo Engine).

---

## 3. Key Features

1. **Multiple Company Profiles**:
   - Manage business profiles with Name, Category, Description, Products/Services, Location, Preferred Language, SEO Keywords, and Google Review URL.
2. **11+ Business Categories & Dynamic SEO Keywords**:
   - IT Services and Software Development
   - E-commerce
   - Restaurants and Food
   - Healthcare
   - Real Estate
   - Education
   - Travel and Hospitality
   - Beauty and Salon
   - Digital Marketing
   - Retail
   - Other
   - Dynamically loaded SEO keywords + custom keyword chips added on the fly.
3. **Customizable Review Generation**:
   - **Tones**: Natural, Formal, Conversational.
   - **Lengths**: Short (1 sentence), Medium (2-3 sentences), Long (4-5 sentences).
   - **Languages**: English, Hindi (`हिन्दी`), Gujarati (`ગુજરાતી`).
   - **Batch Size**: 1 to 5 suggestions per generation batch.
4. **Machine Learning Deduplication & Non-Repeating Guarantee**:
   - Compares new candidates against the company's historical review database.
   - Exact duplicate prevention via normalized string comparison and SHA-256 content hashes.
   - Near-duplicate detection via TF-IDF n-grams (1, 2) and Cosine Similarity (threshold: 0.72).
   - Auto-retry loop to replace rejected candidates up to max attempts.
   - Enforces rate limits (30 req/min) and cooldown (2s) to prevent API spamming.
5. **Interactive Review Studio & Dedicated Detail View**:
   - Review cards with instant clipboard copy, tone tags, character/word counters, and synthetic demo rating badge.
   - Dedicated detail page (`/review/:id`) using React Router with editable textarea, copy button, and separate "Open Google Review Page" button (zero automated posting).
6. **Analytics Dashboard**:
   - Displays total companies, reviews generated, copy conversions, near-duplicate rejection rates, top SEO keywords, and generation audit logs.

---

## 4. Setup and Installation

### Prerequisites
- Node.js (v18+) and npm
- Python (v3.10+ or v3.12 recommended)
- MongoDB running locally on `mongodb://127.0.0.1:27017` or a MongoDB Atlas URI (if MongoDB is not running, the backend automatically uses `mongomock` in-memory fallback).

### Backend Setup
```bash
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env to add your GEMINI_API_KEY if desired (optional, operates in template demo mode by default)

# Run tests
pytest tests/test_backend.py -v

# Run ML evaluation benchmark
python tests/evaluate_ml.py

# Start Flask Backend Server
python app.py
# Running on http://127.0.0.1:5000
```

### Frontend Setup
```bash
cd frontend

# Install Node dependencies
npm install

# Build for production
npm run build

# Start Vite Development Server
npm run dev
# Running on http://localhost:5173
```

---

## 5. Environment Variables (`backend/.env`)

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `5000` | Port for Flask REST API server |
| `DEBUG` | `True` | Flask debug mode flag |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/seo_review_generator` | MongoDB connection URI |
| `DB_NAME` | `seo_review_generator` | Target database name |
| `LLM_PROVIDER` | `demo` or `gemini` | Active LLM provider (`gemini`, `openai`, `demo`) |
| `GEMINI_API_KEY` | `""` | Google Gemini API key (optional) |
| `SIMILARITY_THRESHOLD`| `0.72` | Cosine similarity threshold for near-duplicate rejection |
| `MAX_GENERATION_RETRIES` | `4` | Max attempts to generate fresh non-repeating candidates |
| `MAX_BATCH_SIZE` | `5` | Maximum suggestions per generation call |
| `RATE_LIMIT_PER_MINUTE` | `30` | Rate limiting per client |
| `COOLDOWN_SECONDS` | `2` | Minimum cooldown between consecutive generations |

---

## 6. REST API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Health status, database connectivity, and active AI model |
| `GET` | `/api/categories` | List all 11 business categories |
| `GET` | `/api/categories/<id_or_name>/keywords` | Fetch SEO keywords for a specific category |
| `GET` | `/api/companies` | List all business profiles |
| `GET` | `/api/companies/<id>` | Fetch single company profile |
| `POST` | `/api/companies` | Create a new company profile |
| `POST` | `/api/generate-reviews` | Generate reviews with ML deduplication and rate limiting |
| `GET` | `/api/reviews` | List reviews with filters (`companyId`, `keyword`, `search`, `page`) |
| `GET` | `/api/reviews/<id>` | Fetch specific review detail record |
| `PUT` | `/api/reviews/<id>` | Update review text from editable textarea |
| `POST` | `/api/reviews/<id>/copy-event` | Increment copy analytics count |
| `GET` | `/api/analytics/overview` | Fetch system metrics, rejection rates, top keywords, and audit logs |

---

## 7. Machine Learning Deduplication Benchmarks

The NLP deduplication engine was evaluated using `tests/evaluate_ml.py` across diverse datasets with the following results:

| Threshold | Accepted | Rejected | Exact Dup Rate | Near Dup Rate | Avg Similarity (Accepted) |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **0.65** | 5 | 5 | 20.0% | 30.0% | 0.000 |
| **0.72** *(Optimal)* | 6 | 4 | 20.0% | 20.0% | 0.006 |
| **0.80** | 7 | 3 | 20.0% | 10.0% | 0.012 |
| **0.85** | 7 | 3 | 20.0% | 10.0% | 0.012 |

- **Exact Duplicate Detection**: 100% precision via NFKD text normalization and SHA-256 hashes.
- **Near-Duplicate Detection**: 0.72 cosine similarity provides optimal balance, filtering paraphrases while accepting novel phrasing.
- **Linguistic Diversity**: Average pairwise similarity between accepted suggestions remains below 0.02.
