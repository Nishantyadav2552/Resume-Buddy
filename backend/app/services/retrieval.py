from typing import List, Dict, Any, Set, Tuple
from sqlalchemy.orm import Session
import re
import math

from app.models.knowledge_base import (
    KBProject, KBExperience, KBSkill,
    KBCertification, KBAchievement
)
from app.services.embeddings import (
    generate_embedding,
    cosine_similarity,
    build_project_text,
    build_experience_text,
    build_certification_text,
    build_achievement_text,
    build_skill_text
)
from rank_bm25 import BM25Okapi

def tokenize(text: str) -> List[str]:
    if not text:
        return []
    text = text.lower()
    text = re.sub(r'[^\w\s]', ' ', text)
    return [w for w in text.split() if len(w) > 2]

def normalize_bm25(raw_score: float) -> float:
    k = 6.0
    return max(0.0, 1.0 - math.exp(-max(0.0, raw_score) / k))

def extract_jd_keywords(jd_text: str) -> Set[str]:
    tokens = tokenize(jd_text)
    stopwords = {
        "and", "or", "the", "a", "an", "in", "on", "at", "to", "for",
        "of", "with", "by", "from", "is", "are", "was", "were", "be",
        "have", "has", "had", "will", "would", "could", "should", "you",
        "we", "our", "your", "they", "this", "that", "these", "those",
        "must", "able", "work", "good", "also", "well", "can", "not",
        "using", "real", "world", "into", "them", "design", "build",
        "develop", "solve", "solutions", "applications", "environments",
        "capabilities", "problems", "platforms", "candidate", "team"
    }
    return {t for t in tokens if t not in stopwords and len(t) > 2}

def rule_based_boost(item_text: str, jd_keywords: Set[str], technologies: str = "") -> float:
    boost = 0.0
    item_tokens = set(tokenize(item_text))
    tech_tokens = set(tokenize(technologies)) if technologies else set()

    exact_matches = item_tokens & jd_keywords
    boost += min(len(exact_matches) * 0.03, 0.15)

    tech_matches = tech_tokens & jd_keywords
    boost += min(len(tech_matches) * 0.10, 0.40)

    return min(boost, 0.60)

def hybrid_rank_items(
    items: list,
    build_text_fn,
    get_tech_fn,
    jd_text: str,
    jd_embedding: List[float],
    jd_keywords: Set[str]
) -> List[Tuple[float, Any, Dict[str, float]]]:
    """
    Perform hybrid retrieval combining dense vector similarity + sparse BM25 + Reciprocal Rank Fusion (RRF).
    """
    if not items:
        return []

    # 1. Sparse BM25 scoring
    item_tokens = [tokenize(build_text_fn(i)) for i in items]
    jd_tokens = tokenize(jd_text)

    bm25_raw = [0.0] * len(items)
    if any(item_tokens) and jd_tokens:
        try:
            bm25 = BM25Okapi(item_tokens)
            bm25_raw = bm25.get_scores(jd_tokens)
        except Exception:
            pass

    sparse_scores = []
    for i, item in enumerate(items):
        norm_bm25 = normalize_bm25(bm25_raw[i])
        boost = rule_based_boost(
            build_text_fn(item),
            jd_keywords,
            get_tech_fn(item)
        )
        total_sparse = min(1.0, (0.65 * norm_bm25) + (0.35 * boost))
        sparse_scores.append((total_sparse, i))

    # 2. Dense Semantic Vector scoring
    dense_scores = []
    for i, item in enumerate(items):
        emb = getattr(item, "embedding", None)
        if emb is None:
            # Generate on the fly if not yet in database
            text = build_text_fn(item)
            emb = generate_embedding(text)
        sim = cosine_similarity(jd_embedding, emb)
        dense_scores.append((sim, i))

    # Sort ranks for RRF
    sparse_sorted = sorted(sparse_scores, key=lambda x: x[0], reverse=True)
    dense_sorted = sorted(dense_scores, key=lambda x: x[0], reverse=True)

    sparse_ranks = {item_idx: rank + 1 for rank, (_, item_idx) in enumerate(sparse_sorted)}
    dense_ranks = {item_idx: rank + 1 for rank, (_, item_idx) in enumerate(dense_sorted)}

    # 3. Reciprocal Rank Fusion (RRF) + Hybrid Score
    k = 60.0
    scored_items = []
    for i, item in enumerate(items):
        r_sparse = sparse_ranks[i]
        r_dense = dense_ranks[i]
        rrf = (1.0 / (k + r_sparse)) + (1.0 / (k + r_dense))
        # Max theoretical RRF with k=60 is 2/61 ~ 0.03278
        norm_rrf = rrf / (2.0 / (k + 1.0))

        dense_sim = dense_scores[i][0]
        sparse_sc = sparse_scores[i][0]

        # Hybrid composite score (0 to 1)
        final_score = (0.45 * dense_sim) + (0.35 * sparse_sc) + (0.20 * norm_rrf)
        scored_items.append((
            final_score,
            item,
            {
                "dense_similarity": round(dense_sim, 3),
                "sparse_score": round(sparse_sc, 3),
                "rrf_score": round(norm_rrf, 3),
            }
        ))

    scored_items.sort(key=lambda x: x[0], reverse=True)
    return scored_items

def retrieve_and_rank(user_id: int, jd_text: str, db: Session) -> dict:
    """
    Retrieve and rank all candidate career items against the target job description
    using hybrid dense + sparse vector search.
    """
    jd_keywords = extract_jd_keywords(jd_text)
    jd_embedding = generate_embedding(jd_text)

    results = {
        "projects": [],
        "experience": [],
        "certifications": [],
        "achievements": [],
        "skills": []
    }

    # --- Projects ---
    projects = db.query(KBProject).filter(KBProject.user_id == user_id).all()
    if projects:
        scored = hybrid_rank_items(
            projects,
            lambda p: build_project_text(p.title, p.description or "", p.technologies or "", p.role or "", p.outcomes or "", p.domain or ""),
            lambda p: p.technologies or "",
            jd_text,
            jd_embedding,
            jd_keywords
        )
        results["projects"] = [
            {
                **{c.name: getattr(p, c.name) for c in p.__table__.columns if c.name != "embedding"},
                "score": round(score, 3),
                "metrics": meta
            }
            for score, p, meta in scored
        ]

    # --- Experience ---
    experiences = db.query(KBExperience).filter(KBExperience.user_id == user_id).all()
    if experiences:
        scored = hybrid_rank_items(
            experiences,
            lambda e: build_experience_text(e.company, e.role, e.responsibilities or "", e.technologies or ""),
            lambda e: e.technologies or "",
            jd_text,
            jd_embedding,
            jd_keywords
        )
        results["experience"] = [
            {
                **{c.name: getattr(e, c.name) for c in e.__table__.columns if c.name != "embedding"},
                "score": round(score, 3),
                "metrics": meta
            }
            for score, e, meta in scored
        ]

    # --- Certifications ---
    certifications = db.query(KBCertification).filter(KBCertification.user_id == user_id).all()
    if certifications:
        scored = hybrid_rank_items(
            certifications,
            lambda c: build_certification_text(c.name, c.issuer or "", c.skills_covered or ""),
            lambda c: c.skills_covered or "",
            jd_text,
            jd_embedding,
            jd_keywords
        )
        results["certifications"] = [
            {
                **{c.name: getattr(item, c.name) for c in item.__table__.columns if c.name != "embedding"},
                "score": round(score, 3)
            }
            for score, item, _ in scored
        ]

    # --- Achievements ---
    achievements = db.query(KBAchievement).filter(KBAchievement.user_id == user_id).all()
    if achievements:
        scored = hybrid_rank_items(
            achievements,
            lambda a: build_achievement_text(a.title, a.description or ""),
            lambda a: "",
            jd_text,
            jd_embedding,
            jd_keywords
        )
        results["achievements"] = [
            {
                **{c.name: getattr(item, c.name) for c in item.__table__.columns if c.name != "embedding"},
                "score": round(score, 3)
            }
            for score, item, _ in scored
        ]

    # --- Skills ---
    skills = db.query(KBSkill).filter(KBSkill.user_id == user_id).all()
    jd_text_lower = jd_text.lower()
    jd_tokens = set(tokenize(jd_text))

    def skill_relevance(skill):
        name_lower = skill.name.lower()
        name_tokens = set(tokenize(skill.name))
        if name_lower in jd_text_lower:
            return 0  # Exact match in JD text
        if name_tokens & jd_tokens:
            return 1  # Token overlap
        return 2

    skills_sorted = sorted(skills, key=skill_relevance)
    results["skills"] = [
        {"id": s.id, "category": s.category, "name": s.name}
        for s in skills_sorted
    ]

    return results