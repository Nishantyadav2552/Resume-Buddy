# ResumeX (Resume-Buddy) - Comprehensive System Documentation

## Overview

**ResumeX** (also referred to as **Resume-Buddy**) is a full-stack, AI-powered platform designed for resume creation, automated ATS (Applicant Tracking System) scoring, and job-targeted resume generation.

The application allows job seekers to:
1. **Manage a Career Knowledge Base**: Store all personal details, work history, projects, skills, certifications, and achievements once in a central repository.
2. **AI-Powered Resume Tailoring ("Resume Buddy")**: Submit any Job Description (JD) to automatically select and rank the user's most relevant projects, experiences, and skills using hybrid BM25 + vector similarity algorithms.
3. **Interactive Resume Builder**: Customize resume content in real-time, reorder sections using drag-and-drop (`@dnd-kit`), switch templates (Classic, Modern, Minimal), and export print-ready PDFs.
4. **Comprehensive ATS Resume Analyzer**: Evaluate any existing resume (PDF/DOCX or text) against a Job Description to receive an overall score (0–100%), technical skill gap analysis (matched vs. missing skills), role keyword match rate, action verb counts, metrics check, and ATS formatting validation.

---

## Technical Architecture Overview

```mermaid
graph TD
    User([User / Browser])
    
    subgraph Frontend ["Next.js 16 Frontend (App Router)"]
        Landing["Landing Page (/)"]
        AuthPages["Login / Register Pages"]
        Dashboard["Dashboard (/dashboard)"]
        KBPage["Knowledge Base Manager (/buddy)"]
        Generator["JD Tailor Generator (/buddy/generate)"]
        Builder["Resume Editor (/builder/[id])"]
        AnalyzerPage["ATS Analyzer (/analyzer)"]
        Templates["Templates (Classic, Modern, Minimal)"]
    end

    subgraph Backend ["FastAPI Backend (Python)"]
        AuthAPI["/auth (JWT, Google OAuth)"]
        KBAPI["/kb (Knowledge Base CRUD)"]
        BuddyAPI["/buddy (RAG Generator & JD Extractor)"]
        ResumeAPI["/resumes (Resume CRUD)"]
        AnalyzerAPI["/analyzer (ATS & Tech Skill Matcher)"]
        
        subgraph Engine ["AI & Retrieval Engine"]
            Embedder["SentenceTransformer (all-MiniLM-L6-v2)"]
            BM25["BM25Okapi Lexical Ranker"]
            Stemmer["Stemmer & Tech Skill Matcher"]
            Extractor["PyMuPDF & python-docx Extractor"]
        end
    end

    subgraph DB ["Database"]
        PostgreSQL[("PostgreSQL Database + pgvector")]
    end

    User --> Landing
    Landing --> AuthPages
    AuthPages --> AuthAPI
    Dashboard --> Builder
    Dashboard --> AnalyzerPage
    Dashboard --> KBPage

    KBPage --> KBAPI
    Generator --> BuddyAPI
    BuddyAPI --> Engine
    Engine --> Embedder
    Engine --> BM25
    KBAPI --> DB
    ResumeAPI --> DB
    BuddyAPI --> DB
    AnalyzerAPI --> Stemmer
    AnalyzerAPI --> Extractor
    Builder --> ResumeAPI
    Builder --> Templates
```

---

## Tech Stack & Dependencies

### Backend
* **Language & Framework**: Python 3.10+ with [FastAPI](https://fastapi.tiangolo.com/) and `uvicorn`.
* **Database & ORM**: PostgreSQL with `pgvector` extension for storing and querying vector embeddings; SQLAlchemy ORM.
* **Authentication**: JWT tokens signed with `python-jose` (HS256); password hashing via `bcrypt`; Google OAuth API verification via `requests`.
* **AI & NLP Engine**:
  * `SentenceTransformer('all-MiniLM-L6-v2')`: Generates 384-dimensional dense vector embeddings.
  * `rank-bm25`: BM25Okapi algorithm for sparse term frequency keyword matching.
  * Custom stemmer and tech-skill dictionary for ATS term extraction.
* **Document Processing**: `PyMuPDF` (`fitz`) and `python-docx` for extracting raw text from uploaded PDF and DOCX files.

### Frontend
* **Framework**: Next.js 16 (React 19, App Router, TypeScript).
* **Styling**: Tailwind CSS v4, Google Fonts (Inter / Display font support), custom glassmorphism and modern UI components.
* **State & Drag-and-Drop**: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` for vertical drag-and-drop reordering of resume entries.
* **PDF Exporting**: `react-to-print` for converting rendered DOM resume previews directly to high-quality print/PDF files.
* **Authentication**: NextAuth.js integration (`[...nextauth]`) paired with local JWT storage (`localStorage`).
* **Icons**: `lucide-react`.

---

## Directory Structure

```
Resume-Buddy/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── analyzer.py        # ATS Scoring, tech skills extraction, file parser
│   │   │   ├── auth.py            # Login, register, Google OAuth, JWT creation
│   │   │   ├── buddy.py           # Tailored resume generator using RAG retrieval
│   │   │   ├── knowledge_base.py  # User Career Knowledge Base CRUD endpoints
│   │   │   └── resumes.py         # Resume document CRUD operations
│   │   ├── models/
│   │   │   ├── knowledge_base.py  # SQLAlchemy models with pgvector fields
│   │   │   ├── resume.py         # Resume model (user_id, title, template, JSON content)
│   │   │   └── user.py           # User model (email, name, hashed_password)
│   │   ├── schemas/
│   │   │   ├── resume.py         # Pydantic validation schemas for resumes
│   │   │   └── user.py           # Pydantic validation schemas for users
│   │   ├── services/
│   │   │   ├── embeddings.py     # SentenceTransformer embeddings generator
│   │   │   ├── file_extraction.py# PDF & DOCX text extraction
│   │   │   └── retrieval.py      # Hybrid BM25 + rule-based boosting ranker
│   │   ├── config.py             # App secrets & algorithm settings
│   │   └── database.py           # Database URL loading & SQLAlchemy SessionLocal
│   ├── debug_scoring.py          # Standalone CLI test script for analyzer rules
│   ├── main.py                   # FastAPI app entry point & CORS configuration
│   └── requirements.txt          # Backend Python dependencies
│
└── frontend/
    ├── public/                   # Static images and assets
    ├── src/
    │   ├── app/
    │   │   ├── analyzer/page.tsx # Resume ATS Analyzer interface
    │   │   ├── api/auth/[...nextauth]/route.ts # NextAuth provider handlers
    │   │   ├── buddy/
    │   │   │   ├── page.tsx      # Knowledge Base form tabs
    │   │   │   └── generate/page.tsx # Tailored resume generator tool
    │   │   ├── builder/
    │   │   │   ├── page.tsx      # Resume list dashboard
    │   │   │   └── [id]/page.tsx # Full interactive Resume Editor & PDF exporter
    │   │   ├── dashboard/page.tsx# User quick action hub
    │   │   ├── login/page.tsx    # Sign-in page
    │   │   ├── logout/page.tsx   # Sign-out route
    │   │   ├── register/page.tsx # Registration page
    │   │   ├── globals.css       # Global styles & Tailwind CSS imports
    │   │   ├── layout.tsx        # Root layout wrapper
    │   │   ├── page.tsx          # Landing page with interactive ATS scanner demo
    │   │   └── providers.tsx     # Context providers
    │   ├── components/
    │   │   ├── resume-templates/
    │   │   │   ├── ClassicTemplate.tsx # Classic single-column template
    │   │   │   ├── MinimalTemplate.tsx # Minimalist sans-serif template
    │   │   │   ├── ModernTemplate.tsx  # Two-column modern dark-accent template
    │   │   │   ├── index.ts           # Template exports & registry
    │   │   │   └── types.ts           # Shared TypeScript interfaces for templates
    │   │   ├── ui/                    # UI primitive components (Button, Input, etc.)
    │   │   ├── AppNav.tsx             # Main header navigation bar
    │   │   └── ResumePreview.tsx      # Resume preview container
    │   ├── lib/
    │   │   ├── api.ts                 # API base URL export
    │   │   └── utils.ts               # Class merging utilities
    │   └── types/                     # NextAuth module augmentations
    ├── components.json                # Shadcn configuration
    ├── next.config.ts                 # Next.js configuration
    ├── package.json                   # NPM dependencies & scripts
    └── tsconfig.json                  # TypeScript compiler configuration
```

---

## Detailed Component Analysis

### 1. Database & Data Models (`backend/app/models/`)

* **User (`users`)**:
  * Fields: `id`, `email` (unique), `name`, `hashed_password`, `created_at`.
  * Has a one-to-many relationship with `Resume`.

* **Resume (`resumes`)**:
  * Fields: `id`, `user_id` (FK), `title`, `template` (`classic`, `modern`, `minimal`), `content` (`JSON`), `created_at`, `updated_at`.
  * Stores complete structured resume content inside a flexible JSON column.

* **Knowledge Base Models (`knowledge_base.py`)**:
  * `KBPersonal`: Personal information (name, email, phone, location, linkedin, github, summary). One per user.
  * `KBEducation`: Degree, school, field of study, start/end years, grade.
  * `KBProject`: Title, description, technologies, role, outcomes, domain, dates, `embedding` (`Vector(384)`).
  * `KBExperience`: Company, role, responsibilities, technologies, dates, `embedding` (`Vector(384)`).
  * `KBSkill`: Category (`languages`, `frameworks`, `tools`, `databases`, `cloud`), skill name.
  * `KBCertification`: Name, issuer, skills covered, date, `embedding` (`Vector(384)`).
  * `KBAchievement`: Title, description, date, `embedding` (`Vector(384)`).

---

### 2. Retrieval & Hybrid Ranking Engine (`backend/app/services/retrieval.py`)

When generating a targeted resume, the system ranks the user's saved items against a given Job Description (JD):

1. **Preprocessing & Tokenization**:
   * Extracts meaningful keywords from the JD, removing stopwords.
2. **BM25 Lexical Scoring**:
   * Uses `BM25Okapi` over item text representations (e.g. project title, description, technologies, outcomes).
   * Normalizes raw scores using an exponential mapping curve: $\text{score}_{\text{norm}} = 1 - e^{-\text{raw}/6}$.
3. **Exact & Technical Boosting**:
   * Calculates exact keyword matches between JD tokens and item tokens.
   * Gives strong extra weight ($\le 0.40$) for matching technical skill tokens.
4. **Final Scoring Formula**:
   $$\text{Final Score} = (0.60 \times \text{BM25}_{\text{norm}}) + (0.40 \times \text{Boost})$$
5. **Selection & Assembly**:
   * Retrieves the top 3 projects, top 2 experiences, top certifications, achievements, and sorts skills by relevance to the JD before packaging them into the resume JSON format.

---

### 3. ATS & Resume Analyzer Engine (`backend/app/api/analyzer.py`)

The analyzer rates a candidate's resume against a job description according to four weighted metrics:

$$\text{Overall Score} = (0.45 \times \text{Tech Skills}) + (0.25 \times \text{Role Keywords}) + (0.20 \times \text{Quality}) + (0.10 \times \text{ATS Essentials})$$

1. **Tech Skills Match (45%)**:
   * Checks for known technical languages, frameworks, databases, cloud tools, and AI concepts.
   * Reports exact matched skills vs. missing skills required by the job post.
2. **Role & Domain Keywords (25%)**:
   * Employs custom stemming (`developing` $\rightarrow$ `develop`, `systems` $\rightarrow$ `system`) to evaluate whether domain vocabulary matches regardless of verb tense or pluralization.
3. **Resume Quality (20%)**:
   * Word count check (ideal range: 200 to 900 words).
   * Metrics detection: identifies numeric achievements (e.g., `40%`, `$50k`, `10x`).
   * Action verb verification: counts strong verbs (e.g., `spearheaded`, `architected`, `engineered`) vs weak passive phrases (`responsible for`, `worked on`).
4. **ATS Essentials (10%)**:
   * Checks for essential elements: Email, Phone, LinkedIn, GitHub, clean layout (no table pipe over-use), and absence of incompatible special symbols (e.g., `★`, `▶`).

---

### 4. Interactive Frontend Features

* **Resume Builder (`/builder/[id]`)**:
  * **Split Screen UI**: Form editing panel on the left, real-time live preview on the right.
  * **Drag-and-Drop Reordering**: Built with `@dnd-kit` to reorder experiences, projects, and skills dynamically.
  * **Template Swapping**: Switch seamlessly between `Classic`, `Modern`, and `Minimal` designs.
  * **Instant PDF Download**: Uses `react-to-print` for vector-sharp PDF generation directly in browser.
* **Resume Buddy (`/buddy`)**:
  * Single source of truth for career data.
  * Add, edit, or delete personal details, education, projects, experience, skills, certifications, and achievements.
  * Instant status check (`ready` boolean) ensuring minimum requirements are met before generation.
* **Tailored Generator (`/buddy/generate`)**:
  * Paste a Job Description or upload a JD document (`.pdf` / `.docx`).
  * Generates a tailored resume matching the target job description in seconds.

---

## API Reference Summary

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/auth/register` | `POST` | Registers a new user and returns JWT token |
| `/auth/login` | `POST` | Validates credentials and returns JWT token |
| `/auth/google` | `POST` | Authenticates Google OAuth access token |
| `/resumes/` | `GET` / `POST` | Lists all user resumes or creates a new resume |
| `/resumes/{id}` | `GET` / `PUT` / `DELETE` | Retrieves, updates, or deletes a specific resume |
| `/kb/personal` | `GET` / `POST` | Gets or updates personal info in Knowledge Base |
| `/kb/projects` | `GET` / `POST` / `DELETE` | Manages project entries in Knowledge Base |
| `/kb/experience` | `GET` / `POST` / `DELETE` | Manages experience entries in Knowledge Base |
| `/kb/skills` | `GET` / `POST` / `DELETE` | Manages skill entries in Knowledge Base |
| `/buddy/status` | `GET` | Checks if Knowledge Base meets minimum entry counts |
| `/buddy/generate` | `POST` | Generates a tailored resume for a specific job description |
| `/buddy/extract-jd` | `POST` | Extracts text from an uploaded JD PDF/DOCX file |
| `/analyzer/analyze-text` | `POST` | Evaluates raw resume text against a Job Description |
| `/analyzer/analyze-file` | `POST` | Evaluates uploaded resume file against a Job Description |

---

## How to Run the Application Locally

### Prerequisites
* Python 3.10+
* Node.js 18+ & `npm`
* PostgreSQL database instance with `pgvector` extension enabled

### 1. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create virtual environment & activate it
python -m venv venv
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables in backend/.env:
# DATABASE_URL=postgresql://user:password@localhost:5432/resumex_db
# SECRET_KEY=your_secret_key

# Run FastAPI server
uvicorn main:app --reload --port 8000
```
Backend API will run at `http://localhost:8000`.

### 2. Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Configure environment variables in frontend/.env.local:
# NEXT_PUBLIC_API_URL=http://localhost:8000
# NEXTAUTH_SECRET=your_nextauth_secret

# Start Next.js development server
npm run dev
```
Frontend web application will run at `http://localhost:3000`.
