from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

from app.database import get_db
from app.models.knowledge_base import (
    KBPersonal, KBEducation, KBProject,
    KBExperience, KBSkill, KBCertification, KBAchievement
)
from app.models.user import User
from app.api.deps import get_current_user
from app.services.embeddings import (
    generate_embedding,
    build_project_text,
    build_experience_text,
    build_certification_text,
    build_achievement_text
)

router = APIRouter()

def exclude_embedding(obj) -> dict:
    if obj is None:
        return {}
    return {c.name: getattr(obj, c.name) for c in obj.__table__.columns if c.name != "embedding"}

# ─── Schemas ──────────────────────────────────────────────────────────────────

class PersonalIn(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None
    summary: Optional[str] = None

class EducationIn(BaseModel):
    school: str
    degree: str
    field: Optional[str] = None
    start_year: Optional[str] = None
    end_year: Optional[str] = None
    grade: Optional[str] = None

class ProjectIn(BaseModel):
    title: str
    description: str
    technologies: Optional[str] = None
    role: Optional[str] = None
    outcomes: Optional[str] = None
    domain: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None

class ExperienceIn(BaseModel):
    company: str
    role: str
    responsibilities: Optional[str] = None
    technologies: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None

class SkillIn(BaseModel):
    category: str
    name: str

class CertificationIn(BaseModel):
    name: str
    issuer: Optional[str] = None
    skills_covered: Optional[str] = None
    date: Optional[str] = None

class AchievementIn(BaseModel):
    title: str
    description: Optional[str] = None
    date: Optional[str] = None

# ─── Personal ─────────────────────────────────────────────────────────────────

@router.get("/personal")
def get_personal(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    personal = db.query(KBPersonal).filter(KBPersonal.user_id == current_user.id).first()
    return personal or {}

@router.post("/personal")
def save_personal(
    data: PersonalIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    existing = db.query(KBPersonal).filter(KBPersonal.user_id == current_user.id).first()
    if existing:
        for key, value in data.model_dump().items():
            setattr(existing, key, value)
        db.commit()
        db.refresh(existing)
        return existing

    new = KBPersonal(user_id=current_user.id, **data.model_dump())
    db.add(new)
    db.commit()
    db.refresh(new)
    return new

# ─── Education ────────────────────────────────────────────────────────────────

@router.get("/education")
def get_education(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(KBEducation).filter(KBEducation.user_id == current_user.id).all()

@router.post("/education", status_code=status.HTTP_201_CREATED)
def add_education(
    data: EducationIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    new = KBEducation(user_id=current_user.id, **data.model_dump())
    db.add(new)
    db.commit()
    db.refresh(new)
    return new

@router.put("/education/{id}")
def update_education(
    id: int,
    data: EducationIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    item = db.query(KBEducation).filter(KBEducation.id == id, KBEducation.user_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Education entry not found")
    for key, value in data.model_dump().items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item

@router.delete("/education/{id}")
def delete_education(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    item = db.query(KBEducation).filter(KBEducation.id == id, KBEducation.user_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Education entry not found")
    db.delete(item)
    db.commit()
    return {"message": "Education entry deleted", "id": id}

# ─── Projects ─────────────────────────────────────────────────────────────────

@router.get("/projects")
def get_projects(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    items = db.query(KBProject).filter(KBProject.user_id == current_user.id).all()
    return [exclude_embedding(i) for i in items]

@router.post("/projects", status_code=status.HTTP_201_CREATED)
def add_project(
    data: ProjectIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    text = build_project_text(
        title=data.title,
        description=data.description,
        technologies=data.technologies or "",
        role=data.role or "",
        outcomes=data.outcomes or "",
        domain=data.domain or ""
    )
    embedding = generate_embedding(text)

    new = KBProject(user_id=current_user.id, embedding=embedding, **data.model_dump())
    db.add(new)
    db.commit()
    db.refresh(new)
    return exclude_embedding(new)

@router.put("/projects/{id}")
def update_project(
    id: int,
    data: ProjectIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    item = db.query(KBProject).filter(KBProject.id == id, KBProject.user_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Project entry not found")

    for key, value in data.model_dump().items():
        setattr(item, key, value)

    text = build_project_text(
        title=item.title,
        description=item.description,
        technologies=item.technologies or "",
        role=item.role or "",
        outcomes=item.outcomes or "",
        domain=item.domain or ""
    )
    item.embedding = generate_embedding(text)

    db.commit()
    db.refresh(item)
    return exclude_embedding(item)

@router.delete("/projects/{id}")
def delete_project(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    item = db.query(KBProject).filter(KBProject.id == id, KBProject.user_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Project entry not found")
    db.delete(item)
    db.commit()
    return {"message": "Project deleted", "id": id}

# ─── Experience ───────────────────────────────────────────────────────────────

@router.get("/experience")
def get_experience(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    items = db.query(KBExperience).filter(KBExperience.user_id == current_user.id).all()
    return [exclude_embedding(i) for i in items]

@router.post("/experience", status_code=status.HTTP_201_CREATED)
def add_experience(
    data: ExperienceIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    text = build_experience_text(
        company=data.company,
        role=data.role,
        responsibilities=data.responsibilities or "",
        technologies=data.technologies or ""
    )
    embedding = generate_embedding(text)

    new = KBExperience(user_id=current_user.id, embedding=embedding, **data.model_dump())
    db.add(new)
    db.commit()
    db.refresh(new)
    return exclude_embedding(new)

@router.put("/experience/{id}")
def update_experience(
    id: int,
    data: ExperienceIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    item = db.query(KBExperience).filter(KBExperience.id == id, KBExperience.user_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Experience entry not found")

    for key, value in data.model_dump().items():
        setattr(item, key, value)

    text = build_experience_text(
        company=item.company,
        role=item.role,
        responsibilities=item.responsibilities or "",
        technologies=item.technologies or ""
    )
    item.embedding = generate_embedding(text)

    db.commit()
    db.refresh(item)
    return exclude_embedding(item)

@router.delete("/experience/{id}")
def delete_experience(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    item = db.query(KBExperience).filter(KBExperience.id == id, KBExperience.user_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Experience entry not found")
    db.delete(item)
    db.commit()
    return {"message": "Experience deleted", "id": id}

# ─── Skills ───────────────────────────────────────────────────────────────────

@router.get("/skills")
def get_skills(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(KBSkill).filter(KBSkill.user_id == current_user.id).all()

@router.post("/skills", status_code=status.HTTP_201_CREATED)
def add_skill(
    data: SkillIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    new = KBSkill(user_id=current_user.id, **data.model_dump())
    db.add(new)
    db.commit()
    db.refresh(new)
    return new

@router.put("/skills/{id}")
def update_skill(
    id: int,
    data: SkillIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    item = db.query(KBSkill).filter(KBSkill.id == id, KBSkill.user_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Skill entry not found")
    for key, value in data.model_dump().items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item

@router.delete("/skills/{id}")
def delete_skill(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    item = db.query(KBSkill).filter(KBSkill.id == id, KBSkill.user_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Skill entry not found")
    db.delete(item)
    db.commit()
    return {"message": "Skill deleted", "id": id}

# ─── Certifications ───────────────────────────────────────────────────────────

@router.get("/certifications")
def get_certifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    items = db.query(KBCertification).filter(KBCertification.user_id == current_user.id).all()
    return [exclude_embedding(i) for i in items]

@router.post("/certifications", status_code=status.HTTP_201_CREATED)
def add_certification(
    data: CertificationIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    text = build_certification_text(
        name=data.name,
        issuer=data.issuer or "",
        skills_covered=data.skills_covered or ""
    )
    embedding = generate_embedding(text)

    new = KBCertification(user_id=current_user.id, embedding=embedding, **data.model_dump())
    db.add(new)
    db.commit()
    db.refresh(new)
    return exclude_embedding(new)

@router.put("/certifications/{id}")
def update_certification(
    id: int,
    data: CertificationIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    item = db.query(KBCertification).filter(KBCertification.id == id, KBCertification.user_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Certification entry not found")

    for key, value in data.model_dump().items():
        setattr(item, key, value)

    text = build_certification_text(
        name=item.name,
        issuer=item.issuer or "",
        skills_covered=item.skills_covered or ""
    )
    item.embedding = generate_embedding(text)

    db.commit()
    db.refresh(item)
    return exclude_embedding(item)

@router.delete("/certifications/{id}")
def delete_certification(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    item = db.query(KBCertification).filter(KBCertification.id == id, KBCertification.user_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Certification not found")
    db.delete(item)
    db.commit()
    return {"message": "Certification deleted", "id": id}

# ─── Achievements ─────────────────────────────────────────────────────────────

@router.get("/achievements")
def get_achievements(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    items = db.query(KBAchievement).filter(KBAchievement.user_id == current_user.id).all()
    return [exclude_embedding(i) for i in items]

@router.post("/achievements", status_code=status.HTTP_201_CREATED)
def add_achievement(
    data: AchievementIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    text = build_achievement_text(
        title=data.title,
        description=data.description or ""
    )
    embedding = generate_embedding(text)

    new = KBAchievement(user_id=current_user.id, embedding=embedding, **data.model_dump())
    db.add(new)
    db.commit()
    db.refresh(new)
    return exclude_embedding(new)

@router.put("/achievements/{id}")
def update_achievement(
    id: int,
    data: AchievementIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    item = db.query(KBAchievement).filter(KBAchievement.id == id, KBAchievement.user_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Achievement entry not found")

    for key, value in data.model_dump().items():
        setattr(item, key, value)

    text = build_achievement_text(
        title=item.title,
        description=item.description or ""
    )
    item.embedding = generate_embedding(text)

    db.commit()
    db.refresh(item)
    return exclude_embedding(item)

@router.delete("/achievements/{id}")
def delete_achievement(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    item = db.query(KBAchievement).filter(KBAchievement.id == id, KBAchievement.user_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Achievement not found")
    db.delete(item)
    db.commit()
    return {"message": "Achievement deleted", "id": id}