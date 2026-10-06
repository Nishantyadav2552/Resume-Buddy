from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Dict, Any, List

from app.database import get_db
from app.models.knowledge_base import (
    KBPersonal, KBEducation, KBSkill,
    KBProject, KBExperience, KBCertification, KBAchievement
)
from app.models.user import User
from app.api.deps import get_current_user
from app.services.retrieval import retrieve_and_rank
from app.services.file_extraction import extract_text_from_file
from app.services.llm import tailor_resume_content

router = APIRouter()

class GenerateRequest(BaseModel):
    job_description: str
    template: str = "classic"

@router.post("/generate")
def generate_resume(
    request: GenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not request.job_description.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Job description cannot be empty"
        )

    # --- Validate minimum requirements ---
    personal = db.query(KBPersonal).filter(KBPersonal.user_id == current_user.id).first()
    if not personal:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please complete your personal information first in the Knowledge Base"
        )

    education = db.query(KBEducation).filter(KBEducation.user_id == current_user.id).all()
    if len(education) < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please add at least 1 education entry to your Knowledge Base"
        )

    projects = db.query(KBProject).filter(KBProject.user_id == current_user.id).all()
    if len(projects) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please add at least 2 projects to your Knowledge Base"
        )

    skills = db.query(KBSkill).filter(KBSkill.user_id == current_user.id).all()
    if len(skills) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please add at least 3 skills to your Knowledge Base"
        )

    # --- Retrieve and rank items using Hybrid RAG ---
    try:
        ranked = retrieve_and_rank(current_user.id, request.job_description, db)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Hybrid retrieval error: {str(e)}"
        )

    if not ranked:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Retrieval returned empty results"
        )

    # Convert personal object to dict
    personal_dict = {
        "name": personal.name,
        "email": personal.email,
        "phone": personal.phone or "",
        "location": personal.location or "",
        "linkedin": personal.linkedin or "",
        "github": personal.github or "",
        "summary": personal.summary or ""
    }

    education_list = [
        {
            "school": edu.school,
            "degree": edu.degree,
            "field": edu.field or "",
            "start_year": edu.start_year or "",
            "end_year": edu.end_year or ""
        }
        for edu in education
    ]

    # --- LLM-grounded Tailoring Pipeline ---
    resume_content = tailor_resume_content(
        personal=personal_dict,
        education=education_list,
        ranked_projects=ranked.get("projects", []),
        ranked_experience=ranked.get("experience", []),
        ranked_skills=ranked.get("skills", []),
        ranked_certs=ranked.get("certifications", []),
        ranked_achievements=ranked.get("achievements", []),
        jd_text=request.job_description
    )

    return {
        "resume_content": resume_content,
        "template": request.template,
        "all_ranked_projects": ranked.get("projects", []),
        "ranking_info": {
            "projects_selected": min(len(ranked.get("projects", [])), 3),
            "experience_selected": len(ranked.get("experience", [])),
            "certifications_selected": len(ranked.get("certifications", [])),
            "achievements_selected": len(ranked.get("achievements", [])),
            "skills_selected": len(ranked.get("skills", []))
        }
    }

@router.get("/status")
def get_kb_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    personal = db.query(KBPersonal).filter(KBPersonal.user_id == current_user.id).first()
    education = db.query(KBEducation).filter(KBEducation.user_id == current_user.id).all()
    skills = db.query(KBSkill).filter(KBSkill.user_id == current_user.id).all()
    projects = db.query(KBProject).filter(KBProject.user_id == current_user.id).all()

    return {
        "personal": personal is not None,
        "education_count": len(education),
        "skills_count": len(skills),
        "projects_count": len(projects),
        "ready": (
            personal is not None and
            len(education) >= 1 and
            len(skills) >= 3 and
            len(projects) >= 2
        )
    }

@router.post("/extract-jd")
def extract_jd(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    text = extract_text_from_file(file)
    if not text or not text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not extract text from this file. Please ensure it is a valid PDF or DOCX file."
        )
    return {"text": text}