import pytest
import os
import io
import json
from fastapi.testclient import TestClient

# Set test environment
os.environ["DATABASE_URL"] = "sqlite:///./test_resumex.db"
os.environ["SECRET_KEY"] = "test-secret-key-12345"

from main import app
from app.database import engine, Base
from app.services.embeddings import generate_embedding, cosine_similarity, build_project_text
from app.services.retrieval import retrieve_and_rank, tokenize, extract_jd_keywords
from app.services.llm import fallback_tailor_pipeline, enhance_bullet_text
from app.api.analyzer import (
    calculate_readability, score_tech_skills, score_role_keywords,
    score_resume_quality, score_ats_essentials, run_analysis
)

# Recreate test database
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

client = TestClient(app)

def test_1_user_registration():
    res = client.post("/auth/register", json={
        "name": "Alice Developer",
        "email": "alice@example.com",
        "password": "Password123!"
    })
    assert res.status_code == 200, res.text
    data = res.json()
    assert "access_token" in data
    assert data["user"]["email"] == "alice@example.com"

def test_2_user_login():
    res = client.post("/auth/login", json={
        "email": "alice@example.com",
        "password": "Password123!"
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    global alice_token
    alice_token = data["access_token"]

def test_3_protected_endpoint():
    # Unauthenticated request
    res = client.get("/resumes/")
    assert res.status_code == 401

    # Authenticated request via Bearer header
    res = client.get("/resumes/", headers={"Authorization": f"Bearer {alice_token}"})
    assert res.status_code == 200
    assert isinstance(res.json(), list)

def test_4_5_6_7_resume_crud_and_ownership():
    # Register second user Bob
    res_bob = client.post("/auth/register", json={
        "name": "Bob Engineer",
        "email": "bob@example.com",
        "password": "Password456!"
    })
    bob_token = res_bob.json()["access_token"]

    # 4. Create resume as Alice
    create_res = client.post(
        "/resumes/",
        headers={"Authorization": f"Bearer {alice_token}"},
        json={
            "title": "Alice FullStack Resume",
            "template": "modern",
            "content": {"personal": {"name": "Alice Developer"}}
        }
    )
    assert create_res.status_code == 201
    resume_id = create_res.json()["id"]
    assert create_res.json()["template"] == "modern"

    # 5. Retrieve resume
    get_res = client.get(
        f"/resumes/{resume_id}",
        headers={"Authorization": f"Bearer {alice_token}"}
    )
    assert get_res.status_code == 200
    assert get_res.json()["title"] == "Alice FullStack Resume"

    # 6. Update resume (including template change)
    update_res = client.put(
        f"/resumes/{resume_id}",
        headers={"Authorization": f"Bearer {alice_token}"},
        json={
            "title": "Alice Senior Resume",
            "template": "minimal",
            "content": {"personal": {"name": "Alice Senior Dev"}}
        }
    )
    assert update_res.status_code == 200
    assert update_res.json()["title"] == "Alice Senior Resume"
    assert update_res.json()["template"] == "minimal"

    # 7. Ownership check: Bob should NOT be able to access Alice's resume
    bob_get = client.get(
        f"/resumes/{resume_id}",
        headers={"Authorization": f"Bearer {bob_token}"}
    )
    assert bob_get.status_code == 404

    bob_update = client.put(
        f"/resumes/{resume_id}",
        headers={"Authorization": f"Bearer {bob_token}"},
        json={"title": "Hacked Title", "template": "classic", "content": {}}
    )
    assert bob_update.status_code == 404

    # Alice can delete her resume
    del_res = client.delete(
        f"/resumes/{resume_id}",
        headers={"Authorization": f"Bearer {alice_token}"}
    )
    assert del_res.status_code == 200

def test_8_pdf_extraction():
    import fitz
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 72), "Python Developer with FastAPI and PostgreSQL experience.")
    pdf_bytes = doc.write()
    doc.close()

    res = client.post(
        "/analyzer/extract-text",
        files={"file": ("test.pdf", pdf_bytes, "application/pdf")}
    )
    assert res.status_code == 200
    assert "FastAPI" in res.json()["text"]

def test_9_docx_extraction():
    from docx import Document
    doc = Document()
    doc.add_paragraph("React and TypeScript frontend engineer with Docker knowledge.")
    doc_io = io.BytesIO()
    doc.save(doc_io)
    docx_bytes = doc_io.getvalue()

    res = client.post(
        "/analyzer/extract-text",
        files={"file": ("test.docx", docx_bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
    )
    assert res.status_code == 200
    assert "TypeScript" in res.json()["text"]

def test_10_resume_analysis_and_readability():
    sample_resume = """
    Alice Developer
    alice@example.com | +1 555-0199 | linkedin.com/in/alicedev | github.com/alicedev

    Summary
    Full-stack developer with 5+ years experience building scalable web applications.

    Experience
    Senior Software Engineer | TechCorp | 2021 - Present
    - Architected high-throughput microservices using Python, FastAPI, and PostgreSQL.
    - Optimized database queries, reducing response latency by 45% for 500k daily users.
    - Automated CI/CD deployment pipelines using Docker and Kubernetes.

    Projects
    ResumeBuddy RAG Platform
    - Engineered semantic vector search using pgvector and Sentence Transformers.
    - Scaled system throughput by 3x and reduced operational costs by $20k annually.

    Skills
    Python, FastAPI, PostgreSQL, Docker, Kubernetes, React, TypeScript, Redis

    Education
    B.S. Computer Science | University of Technology | 2020
    """

    sample_jd = """
    Looking for a Senior Python / FastAPI Developer with Docker, Kubernetes, and PostgreSQL skills.
    Must have experience with microservices architecture, performance optimization, and vector search.
    """

    analysis = run_analysis(sample_resume, sample_jd)
    assert analysis["overall_score"] >= 70
    assert "python" in analysis["tech_skills"]["matched"]
    assert "fastapi" in analysis["tech_skills"]["matched"]
    assert analysis["readability"]["score"] > 0
    assert analysis["quality"]["metrics_count"] >= 3
    assert analysis["quality"]["action_verbs_count"] >= 4

def test_11_readability_edge_cases():
    # Empty text
    r0 = calculate_readability("")
    assert r0["score"] >= 0

    # 1 word
    r1 = calculate_readability("Hello")
    assert r1["score"] >= 0

    # Technical jargon
    r_tech = calculate_readability("Microservices orchestration containerization hyperparameterization.")
    assert 0 <= r_tech["score"] <= 100

def test_12_embeddings_generation():
    text = "Building machine learning pipelines with Python and PyTorch"
    emb = generate_embedding(text)
    assert len(emb) == 384
    sim = cosine_similarity(emb, emb)
    assert abs(sim - 1.0) < 1e-4

def test_13_knowledge_base_crud():
    headers = {"Authorization": f"Bearer {alice_token}"}

    # Save personal
    p_res = client.post("/kb/personal", headers=headers, json={
        "name": "Alice Developer",
        "email": "alice@example.com",
        "phone": "+1 555-0199",
        "location": "San Francisco, CA",
        "linkedin": "https://linkedin.com/in/alice",
        "github": "https://github.com/alice",
        "summary": "Experienced Full Stack and AI Engineer."
    })
    assert p_res.status_code == 200

    # Add education
    edu_res = client.post("/kb/education", headers=headers, json={
        "school": "MIT",
        "degree": "B.S. Computer Science",
        "field": "AI & Software Systems",
        "start_year": "2018",
        "end_year": "2022",
        "grade": "3.9 GPA"
    })
    assert edu_res.status_code == 201
    edu_id = edu_res.json()["id"]

    # Add skills
    for skill_data in [
        {"category": "languages", "name": "Python"},
        {"category": "languages", "name": "TypeScript"},
        {"category": "frameworks", "name": "FastAPI"},
        {"category": "frameworks", "name": "React"},
        {"category": "databases", "name": "PostgreSQL"},
        {"category": "tools", "name": "Docker"},
        {"category": "cloud", "name": "AWS"}
    ]:
        s_res = client.post("/kb/skills", headers=headers, json=skill_data)
        assert s_res.status_code == 201

    # Add projects
    p1 = client.post("/kb/projects", headers=headers, json={
        "title": "Cloud Resume AI",
        "description": "Architected an intelligent resume scoring engine using pgvector and FastAPI.",
        "technologies": "Python, FastAPI, pgvector, PostgreSQL, Docker",
        "role": "Lead Engineer",
        "outcomes": "Achieved 99.9% uptime and sub-50ms latency.",
        "domain": "HR Tech"
    })
    assert p1.status_code == 201

    p2 = client.post("/kb/projects", headers=headers, json={
        "title": "E-Commerce Microservices",
        "description": "Built event-driven checkout services with Kafka and Redis.",
        "technologies": "Go, Python, Redis, Kafka, Kubernetes",
        "role": "Backend Developer",
        "outcomes": "Handled 10k orders per minute during peak sales.",
        "domain": "Fintech"
    })
    assert p2.status_code == 201

    # Add experience
    exp_res = client.post("/kb/experience", headers=headers, json={
        "company": "Apex Software",
        "role": "Senior Software Engineer",
        "responsibilities": "Engineered distributed APIs in Python.\nScaled database query performance by 40%.\nMentored junior developers.",
        "technologies": "Python, FastAPI, PostgreSQL, Docker",
        "start_date": "2022-01",
        "end_date": "Present"
    })
    assert exp_res.status_code == 201

    # Check KB status
    status_res = client.get("/buddy/status", headers=headers)
    assert status_res.status_code == 200
    assert status_res.json()["ready"] is True

def test_14_15_hybrid_retrieval_and_rrf():
    headers = {"Authorization": f"Bearer {alice_token}"}
    jd = "Seeking Python FastAPI Engineer with PostgreSQL and Docker expertise for building AI vector search applications."

    gen_res = client.post("/buddy/generate", headers=headers, json={
        "job_description": jd,
        "template": "modern"
    })
    assert gen_res.status_code == 200
    data = gen_res.json()
    assert "resume_content" in data
    assert len(data["all_ranked_projects"]) >= 2
    # Cloud Resume AI should rank highest due to pgvector, FastAPI, PostgreSQL match
    assert data["all_ranked_projects"][0]["title"] == "Cloud Resume AI"

def test_16_ai_tailoring_grounded():
    headers = {"Authorization": f"Bearer {alice_token}"}
    jd = "Need a Python developer to build high performance APIs."

    gen_res = client.post("/buddy/generate", headers=headers, json={
        "job_description": jd,
        "template": "classic"
    })
    content = gen_res.json()["resume_content"]
    assert "personal" in content
    assert content["personal"]["name"] == "Alice Developer"
    assert len(content["experience"]) >= 1
    assert len(content["projects"]) >= 2

def test_17_invalid_file_handling():
    res = client.post(
        "/analyzer/extract-text",
        files={"file": ("malformed.exe", b"NOT_A_VALID_DOC_OR_PDF", "application/octet-stream")}
    )
    assert res.status_code == 400

def test_18_authentication_failure():
    res = client.post("/auth/login", json={
        "email": "nonexistent@example.com",
        "password": "wrongpassword"
    })
    assert res.status_code == 401

def test_19_database_rollback_on_failure():
    # Attempting to add duplicate email should fail gracefully
    res = client.post("/auth/register", json={
        "name": "Alice Duplicate",
        "email": "alice@example.com",
        "password": "Password123!"
    })
    assert res.status_code == 400

def test_20_cleanup():
    # Clean up test database file if created
    if os.path.exists("test_resumex.db"):
        try:
            os.remove("test_resumex.db")
        except Exception:
            pass

if __name__ == "__main__":
    pytest.main(["-v", "test_full_system.py"])
