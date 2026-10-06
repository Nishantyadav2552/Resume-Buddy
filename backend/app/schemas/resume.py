from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

class ResumeCreate(BaseModel):
    title: str = "Untitled Resume"
    template: str = "classic"
    content: Dict[str, Any] = {}

class ResumeUpdate(BaseModel):
    title: Optional[str] = None
    template: Optional[str] = None
    content: Optional[Dict[str, Any]] = None

class ResumeResponse(BaseModel):
    id: int
    user_id: int
    title: str
    template: str
    content: Dict[str, Any]
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True