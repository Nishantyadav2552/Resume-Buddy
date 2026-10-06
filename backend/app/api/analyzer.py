from fastapi import APIRouter, HTTPException, UploadFile, File, Form, status
from pydantic import BaseModel
from typing import Optional, List, Dict, Any, Set
import re
import io

router = APIRouter()

# ─── Tech skill dictionary ───────────────────────────────────────────────────

TECH_SKILLS = {
    # Languages
    "python", "java", "javascript", "typescript", "c++", "c#", "go", "rust",
    "kotlin", "swift", "scala", "r", "matlab", "bash", "shell", "php", "ruby",
    "dart", "elixir", "haskell", "lua", "perl", "sql", "html", "css",

    # ML / AI / Data
    "tensorflow", "pytorch", "keras", "scikit-learn", "sklearn", "xgboost",
    "lightgbm", "catboost", "hugging face", "transformers", "langchain",
    "openai", "llm", "nlp", "cv", "bert", "gpt", "stable diffusion",
    "pandas", "numpy", "scipy", "matplotlib", "seaborn", "plotly",
    "jupyter", "colab", "wandb", "mlflow", "ray", "dask", "spark", "hadoop",

    # Web frameworks & libraries
    "react", "nextjs", "next.js", "vuejs", "vue.js", "angular", "svelte",
    "fastapi", "django", "flask", "express", "nestjs", "nest.js", "spring",
    "spring boot", "laravel", "rails", "asp.net", "fastify", "tailwind",
    "tailwindcss", "bootstrap", "redux", "graphql", "rest", "restful",

    # Databases
    "postgresql", "postgres", "mysql", "sqlite", "mongodb", "redis", "elasticsearch",
    "cassandra", "dynamodb", "neo4j", "firebase", "supabase", "pinecone",
    "qdrant", "weaviate", "chroma", "pgvector", "prisma", "sqlalchemy",

    # Cloud & DevOps
    "aws", "gcp", "azure", "docker", "kubernetes", "terraform", "ansible",
    "jenkins", "github actions", "circleci", "gitlab ci", "helm", "airflow",
    "kafka", "rabbitmq", "celery", "nginx", "linux", "ci/cd",

    # Tools & Methodologies
    "git", "github", "gitlab", "bitbucket", "jira", "confluence", "figma",
    "postman", "grpc", "websocket", "agile", "scrum", "tdd", "microservices",
    "system design", "distributed systems", "rag", "vector search", "api design"
}

STOPWORDS = {
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "we", "you", "he", "she", "they", "it", "i",
    "my", "your", "our", "their", "this", "that", "these", "those",
    "all", "any", "both", "each", "more", "most", "other", "some", "no",
    "not", "only", "same", "so", "than", "too", "very", "just", "as", "if",
    "also", "well", "can", "must", "able", "good", "used", "use", "using",
    "work", "working", "ensure", "including", "required", "ideal",
    "candidate", "position", "role", "team", "company", "join", "looking",
    "seeking", "responsible", "responsibilities", "experience", "knowledge",
    "strong", "excellent", "proficient", "familiarity", "understanding",
    "ability", "skills", "skill", "plus", "preferred", "bonus", "etc"
}

FILLER_WORDS = {
    "innovative", "passionate", "dynamic", "growing", "growth",
    "environment", "opportunity", "opportunities", "collaborative",
    "collaboration", "culture", "mission", "vision", "values",
    "diverse", "diversity", "inclusive", "inclusion", "equity",
    "benefits", "compensation", "salary", "competitive", "package",
    "remote", "hybrid", "onsite", "office", "flexible", "flexibility",
    "global", "world", "industry", "leading", "leader", "client",
    "clients", "customer", "customers", "stakeholders", "thrive",
    "thriving", "exciting", "impactful", "impact", "drive", "driven",
    "motivated", "communication", "interpersonal", "organization",
    "organizational", "mindset", "attitude", "year", "years", "month",
    "months", "level", "levels", "type", "types", "kind", "kinds",
    "various", "multiple", "wide", "range", "variety", "different",
    "current", "future", "term", "full", "part", "based", "across",
    "within", "into", "onto", "upon", "through", "throughout", "during",
    "while", "such", "regarding", "related", "relevant", "appropriate",
    "applicable", "potential", "possible", "additional", "overall",
    "general", "specific", "particular", "certain", "highly", "extremely",
    "deeply", "truly", "really", "currently", "previously", "recently",
    "please", "apply", "submit", "send", "contact", "email", "address",
    "great", "amazing", "fun", "love", "loves", "enjoy", "enjoys"
}

STRONG_ACTION_VERBS = {
    "achieved", "built", "created", "delivered", "designed", "developed",
    "engineered", "established", "implemented", "improved", "increased",
    "launched", "led", "managed", "optimized", "reduced", "scaled",
    "shipped", "solved", "spearheaded", "streamlined", "transformed",
    "automated", "architected", "deployed", "migrated", "integrated",
    "accelerated", "collaborated", "contributed", "generated", "published",
    "researched", "trained", "fine-tuned", "monitored", "maintained",
    "orchestrated", "refactored", "formulated", "pioneered", "upgraded"
}

WEAK_PHRASES = [
    "responsible for", "helped with", "assisted in", "worked on",
    "involved in", "participated in", "was part of", "duties included",
    "tasked with", "handled", "worked with"
]

REQUIRED_SECTIONS = [
    ("experience", ["experience", "work history", "employment", "professional experience"]),
    ("education", ["education", "academic", "degree", "university", "college"]),
    ("skills", ["skills", "technical skills", "technologies", "core competencies"]),
    ("projects", ["projects", "project experience", "portfolio"]),
    ("contact", ["email", "phone", "linkedin", "github", "@"]),
    ("summary", ["summary", "objective", "profile", "about me", "professional summary"]),
    ("certifications", ["certifications", "certificates", "licenses"]),
    ("achievements", ["achievements", "awards", "honors", "accomplishments"])
]

# ─── NLP Helpers ─────────────────────────────────────────────────────────────

def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.lower().strip())

def stem(word: str) -> str:
    if len(word) <= 4:
        return word
    if word.endswith("ies"):
        return word[:-3] + "y"
    if word.endswith("ied"):
        return word[:-3] + "y"
    if word.endswith("ing"):
        s = word[:-3]
        if len(s) > 2 and s[-1] == s[-2] and s[-1] not in "aeiou":
            s = s[:-1]
        return s
    if word.endswith("ed") and not word.endswith("eed"):
        s = word[:-2]
        if len(s) > 2 and s[-1] == s[-2] and s[-1] not in "aeiou":
            s = s[:-1]
        return s
    if word.endswith("es") and not word.endswith("ses"):
        return word[:-2]
    if word.endswith("s") and not word.endswith("ss") and not word.endswith("us"):
        return word[:-1]
    return word

def _build_tech_skill_stems() -> Set[str]:
    stems = set()
    for skill in TECH_SKILLS:
        for word in re.split(r"[^a-z0-9]+", skill):
            if word:
                stems.add(stem(word))
    return stems

TECH_SKILL_STEMS = _build_tech_skill_stems()

def extract_tech_skills(text: str) -> Set[str]:
    text_lower = normalize(text)
    found = set()
    for skill in TECH_SKILLS:
        pattern = r'\b' + re.escape(skill) + r'\b'
        if re.search(pattern, text_lower):
            found.add(skill)
    return found

def extract_role_keywords(text: str) -> Dict[str, str]:
    text_lower = normalize(text)
    clean = re.sub(r"[^\w\s]", " ", text_lower)
    tokens = clean.split()

    keywords: Dict[str, str] = {}
    for token in tokens:
        if (
            token in STOPWORDS
            or token in FILLER_WORDS
            or len(token) <= 3
            or token.isdigit()
        ):
            continue
        s = stem(token)
        if s in TECH_SKILL_STEMS:
            continue
        if s not in keywords:
            keywords[s] = token
    return keywords

def count_syllables(word: str) -> int:
    word = word.lower().strip()
    if not word:
        return 0
    if len(word) <= 3:
        return 1
    word = re.sub(r'(?:[^laeiouy]|ed|es|e)$', '', word)
    word = re.sub(r'^y', '', word)
    syllables = len(re.findall(r'[aeiouy]{1,2}', word))
    return max(1, syllables)

def calculate_readability(text: str) -> Dict[str, Any]:
    """
    Calculate Flesch Reading Ease score with zero-division safety and technical text tolerance.
    Formula: 206.835 - 1.015 * (words/sentences) - 84.6 * (syllables/words)
    """
    if not text or not text.strip():
        return {
            "score": 60,
            "level": "Standard",
            "interpretation": "Standard readability for professional resumes.",
            "words": 0,
            "sentences": 0
        }

    # Extract words
    words = re.findall(r'\b[a-zA-Z]{2,}\b', text)
    word_count = len(words)
    if word_count < 10:
        return {
            "score": 60,
            "level": "Standard",
            "interpretation": "Document is too brief to accurately assess readability.",
            "words": word_count,
            "sentences": 1
        }

    # Extract sentences
    sentences = re.split(r'[.!?\n]+', text)
    sentence_count = len([s for s in sentences if len(s.strip()) > 3])
    if sentence_count == 0:
        sentence_count = max(1, word_count // 15)

    # Count syllables
    total_syllables = sum(count_syllables(w) for w in words)

    asl = word_count / float(sentence_count)
    asw = total_syllables / float(word_count)

    flesch = 206.835 - (1.015 * asl) - (84.6 * asw)
    score = round(max(0.0, min(100.0, flesch)))

    if score >= 80:
        level = "Easy to Read"
        interp = "Clear, concise sentence structure. Easily parsed by recruiters and ATS."
    elif score >= 60:
        level = "Standard / Professional"
        interp = "Optimal professional balance. Appropriate vocabulary and technical depth."
    elif score >= 40:
        level = "Technical / Complex"
        interp = "Dense technical prose. Consider breaking lengthy bullet points into concise action statements."
    else:
        level = "Very Dense"
        interp = "Sentences are very long or heavy. Shorten bullets and use bulleted action items."

    return {
        "score": score,
        "level": level,
        "interpretation": interp,
        "words": word_count,
        "sentences": sentence_count
    }

# ─── Scorers ─────────────────────────────────────────────────────────────────

def score_tech_skills(resume: str, jd: str) -> Dict[str, Any]:
    resume_skills = extract_tech_skills(resume)
    jd_skills = extract_tech_skills(jd)

    if not jd_skills:
        return {
            "score": 80,
            "matched": sorted(resume_skills),
            "missing": [],
            "jd_total": len(resume_skills),
            "matched_total": len(resume_skills),
        }

    matched = resume_skills & jd_skills
    missing = jd_skills - resume_skills

    score = round((len(matched) / max(1, len(jd_skills))) * 100)
    score = min(score, 100)

    return {
        "score": score,
        "matched": sorted(matched),
        "missing": sorted(missing),
        "jd_total": len(jd_skills),
        "matched_total": len(matched),
    }

def score_role_keywords(resume: str, jd: str) -> Dict[str, Any]:
    resume_kw = extract_role_keywords(resume)
    jd_kw = extract_role_keywords(jd)

    if not jd_kw:
        return {"score": 80, "matched": [], "missing": []}

    resume_stems = set(resume_kw.keys())
    jd_stems = set(jd_kw.keys())

    matched_stems = resume_stems & jd_stems
    missing_stems = jd_stems - resume_stems

    score = round((len(matched_stems) / max(1, len(jd_stems))) * 100)
    score = min(score, 100)

    top_matched = sorted(
        (jd_kw[s] for s in matched_stems if len(jd_kw[s]) > 3),
        key=len, reverse=True
    )[:12]

    top_missing = sorted(
        (jd_kw[s] for s in missing_stems if len(jd_kw[s]) > 3),
        key=len, reverse=True
    )[:12]

    return {
        "score": score,
        "matched": top_matched,
        "missing": top_missing,
    }

def score_resume_quality(resume: str) -> Dict[str, Any]:
    issues = []
    strengths = []
    resume_lower = resume.lower()

    words = resume.split()
    word_count = len(words)

    if word_count < 200:
        issues.append("Resume is too short — add more detail to experience and projects")
    elif word_count > 900:
        issues.append("Resume may be too long — aim for 1-2 focused pages (under 800 words)")
    else:
        strengths.append(f"Ideal document length ({word_count} words)")

    # Numbers & metrics detection (%, $, x multipliers, metrics)
    numbers = re.findall(r"\b\d+(?:[\.,]\d+)?\s*(?:%|\$|k|m|x|ms|s|gb|tb|users|clients)?\b", resume, re.IGNORECASE)
    meaningful_metrics = [n for n in numbers if n.strip() not in {"0", "1", "2", "3", "2020", "2021", "2022", "2023", "2024", "2025", "2026"} and len(n.strip()) > 1]

    if len(meaningful_metrics) >= 4:
        strengths.append(f"Strong use of metrics ({len(meaningful_metrics)} data points found)")
    elif len(meaningful_metrics) >= 1:
        issues.append("Add more quantifiable results (%, $, x improvement, latency reduction)")
    else:
        issues.append("No quantifiable metrics found — add numbers to demonstrate impact (e.g. 'reduced latency by 40%')")

    # Action verbs
    found_verbs = [v for v in STRONG_ACTION_VERBS if re.search(r'\b' + re.escape(v) + r'\b', resume_lower)]
    if len(found_verbs) >= 6:
        strengths.append(f"Strong action verbs ({len(found_verbs)} unique power verbs found)")
    elif len(found_verbs) >= 3:
        issues.append("Incorporate more strong action verbs (architected, built, optimized, scaled...)")
    else:
        issues.append("Start bullet points with powerful action verbs (engineered, deployed, streamlined...)")

    # Weak phrases
    found_weak = [p for p in WEAK_PHRASES if p in resume_lower]
    if found_weak:
        issues.append(f"Weak phrase found: \"{found_weak[0]}\" — replace with a strong action verb")

    # Score components
    score_parts = []
    score_parts.append(35 if 200 <= word_count <= 900 else (20 if word_count > 100 else 5))
    score_parts.append(35 if len(meaningful_metrics) >= 4 else (20 if len(meaningful_metrics) >= 1 else 5))
    score_parts.append(30 if len(found_verbs) >= 6 else (20 if len(found_verbs) >= 3 else 10))

    score = min(100, sum(score_parts))

    return {
        "score": score,
        "word_count": word_count,
        "strengths": strengths,
        "issues": issues,
        "metrics_count": len(meaningful_metrics),
        "action_verbs_count": len(found_verbs),
        "weak_phrases_found": found_weak
    }

def score_ats_essentials(resume: str) -> Dict[str, Any]:
    resume_lower = resume.lower()
    checks = []

    has_email = bool(re.search(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}", resume))
    checks.append({"label": "Email Address", "pass": has_email})

    has_phone = bool(re.search(r"[\+\(]?[\d\s\-\(\)]{7,16}", resume))
    checks.append({"label": "Phone Number", "pass": has_phone})

    has_linkedin = "linkedin" in resume_lower
    checks.append({"label": "LinkedIn Profile", "pass": has_linkedin})

    has_github = "github" in resume_lower
    checks.append({"label": "GitHub / Portfolio", "pass": has_github})

    pipe_count = resume.count("|")
    checks.append({"label": "Clean ATS Layout (No complex table pipes)", "pass": pipe_count <= 15})

    special = len(re.findall(r"[★●■▶◆]", resume))
    checks.append({"label": "Standard Characters (No parsing-breaking icons)", "pass": special == 0})

    passed = sum(1 for c in checks if c["pass"])
    score = round((passed / len(checks)) * 100)

    return {"score": score, "checks": checks}

def score_sections(resume: str) -> Dict[str, Any]:
    resume_lower = resume.lower()
    found = []
    missing = []

    for section_name, patterns in REQUIRED_SECTIONS:
        if any(re.search(r'\b' + re.escape(p) + r'\b', resume_lower) for p in patterns):
            found.append(section_name)
        else:
            missing.append(section_name)

    # Contact, experience, education, skills, projects are core
    core_sections = {"experience", "education", "skills", "projects", "contact"}
    found_core = [s for s in found if s in core_sections]
    score = round((len(found_core) / len(core_sections)) * 100)

    return {"score": score, "found": found, "missing": missing}

def generate_placement_suggestions(missing_skills: List[str], resume_text: str) -> List[Dict[str, str]]:
    """
    Generate actionable suggestions for naturally highlighting missing technical skills
    based on the candidate's existing sections.
    """
    suggestions = []
    resume_lower = resume_text.lower()

    for skill in missing_skills[:4]:
        if "project" in resume_lower:
            suggestions.append({
                "skill": skill,
                "suggestion": f"If you utilized {skill} in any previous project, highlight the specific module or integration in your Projects section."
            })
        elif "experience" in resume_lower:
            suggestions.append({
                "skill": skill,
                "suggestion": f"Add {skill} to relevant bullet points under Experience where you applied related tools or architectures."
            })
        else:
            suggestions.append({
                "skill": skill,
                "suggestion": f"Add {skill} to your Technical Skills section if you have foundational knowledge or hands-on practice."
            })

    return suggestions

def run_analysis(resume_text: str, jd_text: str) -> Dict[str, Any]:
    tech = score_tech_skills(resume_text, jd_text)
    role = score_role_keywords(resume_text, jd_text)
    quality = score_resume_quality(resume_text)
    ats = score_ats_essentials(resume_text)
    sections = score_sections(resume_text)
    readability = calculate_readability(resume_text)
    suggestions = generate_placement_suggestions(tech["missing"], resume_text)

    # Overall Score formula (deterministic)
    # Structure (15%), Language Quality (20%), Impact (20%), ATS Essentials (15%), Tech Skills Match (30%)
    structure_score = sections["score"]
    language_score = quality["score"]
    impact_score = min(100, int((quality["metrics_count"] / 4.0) * 100))
    contact_score = ats["score"]
    tech_score = tech["score"]
    role_score = role["score"]

    total = round(
        (0.35 * tech_score) +
        (0.20 * role_score) +
        (0.15 * structure_score) +
        (0.15 * language_score) +
        (0.15 * contact_score)
    )
    total = max(10, min(100, total))

    return {
        "overall_score": total,
        "breakdown": {
            "tech_skills_match": tech_score,
            "role_keywords": role_score,
            "structure": structure_score,
            "language_quality": language_score,
            "resume_quality": language_score,
            "impact": impact_score,
            "ats_essentials": contact_score,
        },
        "tech_skills": {
            "matched": tech["matched"],
            "missing": tech["missing"],
            "jd_total": tech["jd_total"],
            "matched_total": tech["matched_total"],
        },
        "role_keywords": {
            "matched": role["matched"],
            "missing": role["missing"],
        },
        "quality": quality,
        "ats": ats,
        "sections": sections,
        "readability": readability,
        "placement_suggestions": suggestions,
        "action_verb_suggestions": [v for v in list(STRONG_ACTION_VERBS)[:8] if v not in resume_text.lower()]
    }

# ─── API Routes ───────────────────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    resume_text: str
    job_description: str

@router.post("/analyze-text")
def analyze_text(request: AnalyzeRequest):
    if not request.resume_text.strip() or not request.job_description.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Both resume text and job description are required"
        )
    return run_analysis(request.resume_text, request.job_description)

@router.post("/analyze-file")
async def analyze_file(
    file: UploadFile = File(...),
    job_description: str = Form(...)
):
    from app.services.file_extraction import extract_text_from_file

    if not job_description or not job_description.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Job description is required"
        )

    resume_text = extract_text_from_file(file)
    if not resume_text or not resume_text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not extract text from the uploaded file"
        )

    return run_analysis(resume_text, job_description)

@router.post("/extract-text")
async def extract_text_endpoint(file: UploadFile = File(...)):
    from app.services.file_extraction import extract_text_from_file
    text = extract_text_from_file(file)
    if not text or not text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not extract text from file"
        )
    return {"text": text}

@router.post("/analyze")
def analyze_legacy(request: AnalyzeRequest):
    return run_analysis(request.resume_text, request.job_description)