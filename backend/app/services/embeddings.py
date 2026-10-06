from typing import List, Optional, Any
import math
import hashlib
import re

_model = None
_model_failed = False

def get_model():
    global _model, _model_failed
    if _model is None and not _model_failed:
        try:
            from sentence_transformers import SentenceTransformer
            _model = SentenceTransformer('all-MiniLM-L6-v2')
        except Exception as e:
            print(f"Notice: SentenceTransformer local model load fallback active: {e}")
            _model_failed = True
            return None
    return _model

def _fallback_embedding(text: str, dim: int = 384) -> List[float]:
    """
    Deterministic pseudo-semantic dense vector fallback (384-dim)
    when sentence-transformers model is unavailable offline.
    Uses n-gram character and word hash buckets with L2 normalization.
    """
    vec = [0.0] * dim
    clean = text.lower().strip()
    words = re.findall(r"\w+", clean)
    if not words:
        vec[0] = 1.0
        return vec

    # Word unigrams
    for w in words:
        h = int(hashlib.md5(w.encode("utf-8")).hexdigest(), 16)
        idx = h % dim
        sign = 1.0 if ((h >> 8) & 1) == 1 else -1.0
        vec[idx] += sign * (1.0 + len(w) * 0.1)

    # Word bigrams
    for i in range(len(words) - 1):
        bg = f"{words[i]}_{words[i+1]}"
        h = int(hashlib.sha256(bg.encode("utf-8")).hexdigest(), 16)
        idx = h % dim
        sign = 1.0 if ((h >> 8) & 1) == 1 else -1.0
        vec[idx] += sign * 1.5

    # L2 normalize
    norm = math.sqrt(sum(x * x for x in vec))
    if norm > 1e-9:
        vec = [x / norm for x in vec]
    else:
        vec[0] = 1.0
    return vec

def generate_embedding(text: str) -> List[float]:
    if not text or not text.strip():
        return [0.0] * 384

    model = get_model()
    if model is not None:
        try:
            emb = model.encode(text, normalize_embeddings=True)
            if hasattr(emb, "tolist"):
                return emb.tolist()
            return list(emb)
        except Exception as e:
            print(f"Notice: Error encoding with model, using fallback: {e}")

    return _fallback_embedding(text, dim=384)

def cosine_similarity(v1: Any, v2: Any) -> float:
    if v1 is None or v2 is None:
        return 0.0
    try:
        if hasattr(v1, "tolist"):
            v1 = v1.tolist()
        if hasattr(v2, "tolist"):
            v2 = v2.tolist()
        if len(v1) == 0 or len(v2) == 0 or len(v1) != len(v2):
            return 0.0
        dot = sum(float(a) * float(b) for a, b in zip(v1, v2))
        norm1 = math.sqrt(sum(float(a) * float(a) for a in v1))
        norm2 = math.sqrt(sum(float(b) * float(b) for b in v2))
        if norm1 < 1e-9 or norm2 < 1e-9:
            return 0.0
        return max(0.0, min(1.0, dot / (norm1 * norm2)))
    except Exception:
        return 0.0

def build_project_text(
    title: str,
    description: str,
    technologies: str = "",
    role: str = "",
    outcomes: str = "",
    domain: str = ""
) -> str:
    parts = [f"Project: {title}"]
    if role:
        parts.append(f"Role: {role}")
    if domain:
        parts.append(f"Domain: {domain}")
    if technologies:
        parts.append(f"Technologies: {technologies}")
    if description:
        parts.append(f"Description: {description}")
    if outcomes:
        parts.append(f"Outcomes: {outcomes}")
    return " | ".join(parts)

def build_experience_text(
    company: str,
    role: str,
    responsibilities: str = "",
    technologies: str = ""
) -> str:
    parts = [f"Company: {company}", f"Role: {role}"]
    if technologies:
        parts.append(f"Technologies: {technologies}")
    if responsibilities:
        parts.append(f"Responsibilities: {responsibilities}")
    return " | ".join(parts)

def build_certification_text(
    name: str,
    issuer: str = "",
    skills_covered: str = ""
) -> str:
    parts = [f"Certification: {name}"]
    if issuer:
        parts.append(f"Issuer: {issuer}")
    if skills_covered:
        parts.append(f"Skills: {skills_covered}")
    return " | ".join(parts)

def build_achievement_text(
    title: str,
    description: str = ""
) -> str:
    parts = [f"Achievement: {title}"]
    if description:
        parts.append(f"Description: {description}")
    return " | ".join(parts)

def build_skill_text(category: str, name: str) -> str:
    return f"Skill Category: {category} | Skill: {name}"