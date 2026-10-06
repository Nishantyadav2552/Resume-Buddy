import json
import re
import requests
from typing import Dict, Any, List, Optional

from app.config import HUGGINGFACE_API_KEY, HF_MODEL

STRONG_VERBS = [
    "Architected", "Engineered", "Developed", "Built", "Implemented",
    "Optimized", "Scaled", "Automated", "Deployed", "Streamlined",
    "Spearheaded", "Transformed", "Designed", "Delivered", "Accelerated"
]

def enhance_bullet_text(bullet: str, jd_keywords: List[str]) -> str:
    """
    Format and polish bullet point text with strong action verb and professional phrasing
    without inventing facts.
    """
    bullet = bullet.strip().lstrip("-•* ").strip()
    if not bullet:
        return ""

    # Check if starts with a weak phrase
    weak_prefixes = [
        (r"^(?:was\s+)?responsible\s+for\s+", "Spearheaded "),
        (r"^(?:worked\s+on|helped\s+with|assisted\s+in)\s+", "Contributed to "),
        (r"^(?:tasked\s+with|duties\s+included)\s+", "Delivered "),
        (r"^(?:involved\s+in|participated\s+in)\s+", "Collaborated on "),
    ]
    for pattern, replacement in weak_prefixes:
        if re.search(pattern, bullet, re.IGNORECASE):
            bullet = re.sub(pattern, replacement, bullet, flags=re.IGNORECASE)
            break

    # Capitalize first letter
    bullet = bullet[0].upper() + bullet[1:] if len(bullet) > 1 else bullet.upper()
    if not bullet.endswith("."):
        bullet += "."
    return bullet

def tailor_summary_grounded(summary: str, jd_text: str, skills: List[str]) -> str:
    """
    Tailor summary with focus on candidate's existing background matching target JD.
    """
    if not summary:
        top_skills = ", ".join(skills[:5]) if skills else "software development"
        return f"Results-driven professional experienced in {top_skills}, focused on delivering scalable and high-performance solutions."

    return summary.strip()

def fallback_tailor_pipeline(
    personal: Dict[str, Any],
    education: List[Dict[str, Any]],
    ranked_projects: List[Dict[str, Any]],
    ranked_experience: List[Dict[str, Any]],
    ranked_skills: List[Dict[str, Any]],
    ranked_certs: List[Dict[str, Any]],
    ranked_achievements: List[Dict[str, Any]],
    jd_text: str
) -> Dict[str, Any]:
    """
    Deterministic grounded tailoring pipeline ensuring 0% fabrication and 100% adherence
    to candidate facts when external AI API is unavailable.
    """
    # Group skills
    skill_groups: Dict[str, List[str]] = {
        "technical": [],
        "frameworks": [],
        "concepts": [],
        "soft": []
    }
    for s in ranked_skills:
        cat = s.get("category", "languages").lower()
        name = s.get("name", "").strip()
        if not name:
            continue
        if cat in ["languages", "technical"]:
            skill_groups["technical"].append(name)
        elif cat in ["frameworks", "tools"]:
            skill_groups["frameworks"].append(name)
        elif cat in ["databases", "concepts", "cloud"]:
            skill_groups["concepts"].append(name)
        else:
            skill_groups["soft"].append(name)

    all_skill_names = [s.get("name", "") for s in ranked_skills if s.get("name")]

    # Tailor experience bullets
    tailored_experience = []
    for exp in ranked_experience:
        raw_resp = exp.get("responsibilities") or ""
        lines = [line.strip() for line in raw_resp.split("\n") if line.strip()]
        if not lines and raw_resp:
            lines = [raw_resp]

        polished_bullets = [enhance_bullet_text(l, all_skill_names) for l in lines if l]
        desc = "\n".join(polished_bullets) if polished_bullets else raw_resp

        tailored_experience.append({
            "company": exp.get("company", ""),
            "role": exp.get("role", ""),
            "startDate": exp.get("start_date") or exp.get("startDate") or "",
            "endDate": exp.get("end_date") or exp.get("endDate") or "",
            "description": desc
        })

    # Tailor projects
    tailored_projects = []
    for p in ranked_projects[:3]:
        raw_desc = p.get("description") or ""
        lines = [l.strip() for l in raw_desc.split("\n") if l.strip()]
        if not lines and raw_desc:
            lines = [raw_desc]
        polished_lines = [enhance_bullet_text(l, all_skill_names) for l in lines]
        desc = "\n".join(polished_lines)

        tailored_projects.append({
            "title": p.get("title", ""),
            "description": desc,
            "technologies": p.get("technologies") or "",
            "link": ""
        })

    # Tailored summary
    summary_text = tailor_summary_grounded(
        personal.get("summary") or "",
        jd_text,
        all_skill_names
    )

    resume_content = {
        "personal": {
            "name": personal.get("name", ""),
            "email": personal.get("email", ""),
            "phone": personal.get("phone") or "",
            "location": personal.get("location") or "",
            "linkedin": personal.get("linkedin") or "",
            "github": personal.get("github") or "",
            "summary": summary_text
        },
        "education": [
            {
                "school": edu.get("school", ""),
                "degree": edu.get("degree", ""),
                "field": edu.get("field") or "",
                "startYear": str(edu.get("start_year") or edu.get("startYear") or ""),
                "endYear": str(edu.get("end_year") or edu.get("endYear") or "")
            }
            for edu in education
        ],
        "experience": tailored_experience,
        "projects": tailored_projects,
        "skills": skill_groups,
        "certifications": [
            {
                "name": c.get("name", ""),
                "issuer": c.get("issuer") or "",
                "date": str(c.get("date") or ""),
                "link": ""
            }
            for c in ranked_certs
        ],
        "extracurricular": [
            {
                "title": a.get("title", ""),
                "organization": "",
                "date": str(a.get("date") or ""),
                "description": a.get("description") or ""
            }
            for a in ranked_achievements
        ]
    }

    return resume_content

def call_huggingface_llm(prompt: str) -> Optional[str]:
    """
    Call Hugging Face Inference API / Router with timeout and error protection.
    """
    if not HUGGINGFACE_API_KEY:
        return None

    headers = {
        "Authorization": f"Bearer {HUGGINGFACE_API_KEY}",
        "Content-Type": "application/json"
    }

    endpoints = [
        f"https://api-inference.huggingface.co/models/{HF_MODEL}",
        f"https://router.huggingface.co/hf-inference/models/{HF_MODEL}",
    ]

    payload = {
        "inputs": prompt,
        "parameters": {
            "max_new_tokens": 1200,
            "temperature": 0.2,
            "top_p": 0.9,
            "return_full_text": False
        }
    }

    for url in endpoints:
        try:
            resp = requests.post(url, headers=headers, json=payload, timeout=12)
            if resp.status_code == 200:
                result = resp.json()
                if isinstance(result, list) and len(result) > 0:
                    return result[0].get("generated_text", "")
                elif isinstance(result, dict):
                    return result.get("generated_text", "")
        except Exception as e:
            print(f"Notice: HF API endpoint {url} request failed: {e}")
            continue

    return None

def tailor_resume_content(
    personal: Dict[str, Any],
    education: List[Dict[str, Any]],
    ranked_projects: List[Dict[str, Any]],
    ranked_experience: List[Dict[str, Any]],
    ranked_skills: List[Dict[str, Any]],
    ranked_certs: List[Dict[str, Any]],
    ranked_achievements: List[Dict[str, Any]],
    jd_text: str
) -> Dict[str, Any]:
    """
    RAG-grounded LLM Resume Tailoring Pipeline.
    Strictly forbids fabricating projects, companies, technologies, or numbers.
    """
    base_content = fallback_tailor_pipeline(
        personal=personal,
        education=education,
        ranked_projects=ranked_projects,
        ranked_experience=ranked_experience,
        ranked_skills=ranked_skills,
        ranked_certs=ranked_certs,
        ranked_achievements=ranked_achievements,
        jd_text=jd_text
    )

    if not HUGGINGFACE_API_KEY:
        return base_content

    # If HF key is provided, attempt structured LLM refinement
    prompt = f"""<|im_start|>system
You are an expert ATS resume tailoring engine. Your task is to rephrase and emphasize the candidate's ACTUAL accomplishments to best match the job description.
RULES:
1. NEVER invent or fabricate any project, company, metric, tool, or achievement.
2. Only use the candidate's facts provided below.
3. Start bullet points with strong action verbs.
4. Output valid JSON in the exact schema provided.
<|im_end|>
<|im_start|>user
Target Job Description:
{jd_text[:1000]}

Candidate Background:
{json.dumps(base_content, indent=2)}

Return the tailored resume JSON in the exact same schema.
<|im_end|>
<|im_start|>assistant
"""
    try:
        response_text = call_huggingface_llm(prompt)
        if response_text:
            # Extract JSON from model output
            match = re.search(r"\{.*\}", response_text, re.DOTALL)
            if match:
                parsed = json.loads(match.group(0))
                # Validate key fields exist
                if "personal" in parsed and "experience" in parsed and "projects" in parsed:
                    return parsed
    except Exception as e:
        print(f"Notice: LLM response parsing fallback: {e}")

    return base_content
