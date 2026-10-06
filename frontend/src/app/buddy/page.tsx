"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import AppNav from "@/components/AppNav"
import { API_URL } from "@/lib/api"

export default function BuddyPage() {
  const router = useRouter()
  const [token, setToken] = useState("")
  const [activeTab, setActiveTab] = useState("personal")

  useEffect(() => {
    const t = localStorage.getItem("token")
    if (!t) {
      router.push("/login")
      return
    }
    setToken(t)
  }, [])

  const tabs = [
    { id: "personal", label: "Personal Info" },
    { id: "education", label: "Education" },
    { id: "projects", label: "Projects" },
    { id: "experience", label: "Experience" },
    { id: "skills", label: "Skills" },
    { id: "certifications", label: "Certifications" },
    { id: "achievements", label: "Achievements" },
  ]

  return (
    <div className="min-h-screen bg-[#fafaf7]">
      <AppNav />

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-10">
          <p className="text-xs font-mono uppercase tracking-widest text-[#6e7682] mb-2">Resume Buddy</p>
          <div className="flex items-end justify-between">
            <h2 className="text-3xl font-bold text-[#16191d]" style={{ fontFamily: "var(--font-display)" }}>
              Career Knowledge Base
            </h2>
            <button
              onClick={() => router.push("/buddy/generate")}
              className="bg-[#16191d] text-white font-medium text-sm px-4 py-2.5 rounded-xl hover:bg-[#2a2d32] transition-colors shadow-sm"
            >
              ⚡ Tailor Resume for JD →
            </button>
          </div>
          <p className="text-[#6e7682] text-sm mt-1">
            Store your complete career portfolio once. Our AI will automatically select, rank, and tailor items for target roles.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 flex-wrap mb-6 bg-[#f1f0eb] p-1.5 rounded-xl">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === tab.id
                  ? "bg-white text-[#16191d] shadow-sm font-semibold"
                  : "text-[#6e7682] hover:text-[#16191d]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content Card */}
        <div className="bg-white border border-[#e3e1da] rounded-2xl p-6 shadow-sm">
          {activeTab === "personal" && <PersonalTab token={token} />}
          {activeTab === "education" && <EducationTab token={token} />}
          {activeTab === "projects" && <ProjectsTab token={token} />}
          {activeTab === "experience" && <ExperienceTab token={token} />}
          {activeTab === "skills" && <SkillsTab token={token} />}
          {activeTab === "certifications" && <CertificationsTab token={token} />}
          {activeTab === "achievements" && <AchievementsTab token={token} />}
        </div>
      </main>
    </div>
  )
}

const inputClass = "mt-1 w-full px-3 py-2 border border-[#e3e1da] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#16191d] bg-white"
const labelClass = "text-sm font-medium text-[#16191d]"
const cardClass = "border border-[#e3e1da] rounded-xl p-4 mb-3 bg-white hover:border-[#6e7682] transition-colors"

// --- Personal Tab ---
function PersonalTab({ token }: { token: string }) {
  const [form, setForm] = useState({
    name: "", email: "", phone: "", location: "",
    linkedin: "", github: "", summary: ""
  })
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!token) return
    fetch(`${API_URL}/kb/personal?token=${token}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        if (data && data.name) {
          setForm({
            name: data.name || "",
            email: data.email || "",
            phone: data.phone || "",
            location: data.location || "",
            linkedin: data.linkedin || "",
            github: data.github || "",
            summary: data.summary || ""
          })
        }
      })
      .catch(() => {})
  }, [token])

  const save = async () => {
    setLoading(true)
    try {
      await fetch(`${API_URL}/kb/personal?token=${token}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(form)
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-[#16191d]">Personal Information</h3>
        {saved && <span className="text-xs text-emerald-600 font-medium">✓ Saved successfully</span>}
      </div>
      {[
        { label: "Full Name", field: "name", type: "text" },
        { label: "Email Address", field: "email", type: "email" },
        { label: "Phone Number", field: "phone", type: "text" },
        { label: "Location (City, Country)", field: "location", type: "text" },
        { label: "LinkedIn Profile URL", field: "linkedin", type: "text" },
        { label: "GitHub Profile URL", field: "github", type: "text" },
      ].map(({ label, field, type }) => (
        <div key={field}>
          <label className={labelClass}>{label}</label>
          <input
            type={type}
            value={form[field as keyof typeof form]}
            onChange={(e) => setForm(prev => ({ ...prev, [field]: e.target.value }))}
            className={inputClass}
          />
        </div>
      ))}
      <div>
        <label className={labelClass}>Executive Professional Summary</label>
        <textarea
          value={form.summary}
          onChange={(e) => setForm(prev => ({ ...prev, summary: e.target.value }))}
          rows={4}
          placeholder="Brief 2-3 sentence overview of your domain expertise, core skills, and achievements..."
          className={inputClass}
        />
      </div>
      <button
        onClick={save}
        disabled={loading}
        className="w-full bg-[#16191d] text-white py-3 rounded-xl font-medium hover:bg-[#2a2d32] transition-colors text-sm shadow-sm"
      >
        {loading ? "Saving..." : saved ? "✓ Saved!" : "Save Personal Info"}
      </button>
    </div>
  )
}

// --- Education Tab ---
function EducationTab({ token }: { token: string }) {
  const [list, setList] = useState<any[]>([])
  const [form, setForm] = useState({ school: "", degree: "", field: "", start_year: "", end_year: "", grade: "" })
  const [editingId, setEditingId] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)

  const fetchList = async () => {
    try {
      const res = await fetch(`${API_URL}/kb/education?token=${token}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setList(data || [])
    } catch {}
  }

  useEffect(() => { if (token) fetchList() }, [token])

  const save = async () => {
    if (!form.school.trim() || !form.degree.trim()) return
    const url = editingId ? `${API_URL}/kb/education/${editingId}?token=${token}` : `${API_URL}/kb/education?token=${token}`
    const method = editingId ? "PUT" : "POST"

    await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(form)
    })
    setForm({ school: "", degree: "", field: "", start_year: "", end_year: "", grade: "" })
    setEditingId(null)
    setShowForm(false)
    fetchList()
  }

  const startEdit = (edu: any) => {
    setForm({
      school: edu.school,
      degree: edu.degree,
      field: edu.field || "",
      start_year: edu.start_year || "",
      end_year: edu.end_year || "",
      grade: edu.grade || ""
    })
    setEditingId(edu.id)
    setShowForm(true)
  }

  const remove = async (id: number) => {
    await fetch(`${API_URL}/kb/education/${id}?token=${token}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    })
    fetchList()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[#16191d]">Education</h3>
        <button
          onClick={() => {
            if (showForm) {
              setShowForm(false)
              setEditingId(null)
            } else {
              setForm({ school: "", degree: "", field: "", start_year: "", end_year: "", grade: "" })
              setShowForm(true)
            }
          }}
          className="text-xs border border-[#e3e1da] px-3 py-1.5 rounded-lg hover:border-[#6e7682] transition-colors text-[#6e7682]"
        >
          {showForm ? "Cancel" : "+ Add Education"}
        </button>
      </div>

      {showForm && (
        <div className="border border-[#e3e1da] rounded-xl p-4 mb-4 space-y-3 bg-[#fafaf7]">
          <p className="text-xs font-semibold text-gray-700">{editingId ? "Edit Education" : "Add Education Entry"}</p>
          {[
            { label: "Institution / School", field: "school" },
            { label: "Degree", field: "degree" },
            { label: "Field of Study", field: "field" },
            { label: "Start Year", field: "start_year" },
            { label: "End Year (or Expected)", field: "end_year" },
            { label: "Grade / GPA (optional)", field: "grade" },
          ].map(({ label, field }) => (
            <div key={field}>
              <label className={labelClass}>{label}</label>
              <input
                type="text"
                value={form[field as keyof typeof form]}
                onChange={(e) => setForm(prev => ({ ...prev, [field]: e.target.value }))}
                className={inputClass}
              />
            </div>
          ))}
          <button
            onClick={save}
            className="w-full bg-[#16191d] text-white py-2.5 rounded-xl font-medium hover:bg-[#2a2d32] transition-colors text-sm shadow-sm"
          >
            {editingId ? "Update Education" : "Save Education"}
          </button>
        </div>
      )}

      {list.length === 0 && !showForm && (
        <p className="text-[#6e7682] text-sm text-center py-8">No education records added yet. Add at least 1.</p>
      )}

      {list.map((edu) => (
        <div key={edu.id} className={cardClass}>
          <div className="flex justify-between items-start">
            <div>
              <p className="font-semibold text-[#16191d]">{edu.school}</p>
              <p className="text-sm text-[#6e7682]">{edu.degree}{edu.field ? `, ${edu.field}` : ""}</p>
              <p className="text-xs text-[#6e7682] mt-0.5">{edu.start_year}{edu.end_year ? ` – ${edu.end_year}` : ""}{edu.grade ? ` • ${edu.grade}` : ""}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => startEdit(edu)} className="text-xs text-gray-500 hover:text-black font-medium">Edit</button>
              <button onClick={() => remove(edu.id)} className="text-[#e3e1da] hover:text-[#ff6b47] text-lg font-bold transition-colors">×</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// --- Projects Tab ---
function ProjectsTab({ token }: { token: string }) {
  const [list, setList] = useState<any[]>([])
  const [form, setForm] = useState({ title: "", description: "", technologies: "", role: "", outcomes: "", domain: "", start_date: "", end_date: "" })
  const [editingId, setEditingId] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)

  const fetchList = async () => {
    try {
      const res = await fetch(`${API_URL}/kb/projects?token=${token}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setList(data || [])
    } catch {}
  }

  useEffect(() => { if (token) fetchList() }, [token])

  const save = async () => {
    if (!form.title.trim() || !form.description.trim()) return
    const url = editingId ? `${API_URL}/kb/projects/${editingId}?token=${token}` : `${API_URL}/kb/projects?token=${token}`
    const method = editingId ? "PUT" : "POST"

    await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(form)
    })
    setForm({ title: "", description: "", technologies: "", role: "", outcomes: "", domain: "", start_date: "", end_date: "" })
    setEditingId(null)
    setShowForm(false)
    fetchList()
  }

  const startEdit = (p: any) => {
    setForm({
      title: p.title,
      description: p.description || "",
      technologies: p.technologies || "",
      role: p.role || "",
      outcomes: p.outcomes || "",
      domain: p.domain || "",
      start_date: p.start_date || "",
      end_date: p.end_date || ""
    })
    setEditingId(p.id)
    setShowForm(true)
  }

  const remove = async (id: number) => {
    await fetch(`${API_URL}/kb/projects/${id}?token=${token}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    })
    fetchList()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[#16191d]">Projects</h3>
        <button
          onClick={() => {
            if (showForm) {
              setShowForm(false)
              setEditingId(null)
            } else {
              setForm({ title: "", description: "", technologies: "", role: "", outcomes: "", domain: "", start_date: "", end_date: "" })
              setShowForm(true)
            }
          }}
          className="text-xs border border-[#e3e1da] px-3 py-1.5 rounded-lg hover:border-[#6e7682] transition-colors text-[#6e7682]"
        >
          {showForm ? "Cancel" : "+ Add Project"}
        </button>
      </div>

      {showForm && (
        <div className="border border-[#e3e1da] rounded-xl p-4 mb-4 space-y-3 bg-[#fafaf7]">
          <p className="text-xs font-semibold text-gray-700">{editingId ? "Edit Project Entry" : "Add Project Entry"}</p>
          {[
            { label: "Project Title", field: "title" },
            { label: "Technologies Used (comma separated)", field: "technologies" },
            { label: "Your Role / Contribution", field: "role" },
            { label: "Domain (e.g. Fintech, AI/ML, SaaS)", field: "domain" },
            { label: "Start Date", field: "start_date" },
            { label: "End Date", field: "end_date" },
          ].map(({ label, field }) => (
            <div key={field}>
              <label className={labelClass}>{label}</label>
              <input
                type="text"
                value={form[field as keyof typeof form]}
                onChange={(e) => setForm(prev => ({ ...prev, [field]: e.target.value }))}
                className={inputClass}
              />
            </div>
          ))}
          <div>
            <label className={labelClass}>Description & Architecture</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              placeholder="Describe what the project does, key features, and implementation details..."
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Quantifiable Outcomes / Results</label>
            <textarea
              value={form.outcomes}
              onChange={(e) => setForm(prev => ({ ...prev, outcomes: e.target.value }))}
              rows={2}
              placeholder="e.g., Reduced latency by 45%, scaled to 100k daily requests..."
              className={inputClass}
            />
          </div>
          <button
            onClick={save}
            className="w-full bg-[#16191d] text-white py-2.5 rounded-xl font-medium hover:bg-[#2a2d32] transition-colors text-sm shadow-sm"
          >
            {editingId ? "Update Project" : "Save Project"}
          </button>
        </div>
      )}

      {list.length === 0 && !showForm && (
        <p className="text-[#6e7682] text-sm text-center py-8">No projects added yet. Add at least 2 projects.</p>
      )}

      {list.map((project) => (
        <div key={project.id} className={cardClass}>
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0 pr-4">
              <p className="font-semibold text-[#16191d]">{project.title}</p>
              {project.technologies && <p className="text-xs text-[#6e7682] mt-1 font-mono">Tech: {project.technologies}</p>}
              {project.role && <p className="text-xs text-gray-700 mt-0.5 font-medium">Role: {project.role}</p>}
              {project.description && <p className="text-xs text-[#6e7682] mt-1 line-clamp-2">{project.description}</p>}
              {project.outcomes && <p className="text-xs text-emerald-700 mt-1 font-medium">Results: {project.outcomes}</p>}
            </div>
            <div className="flex gap-2 items-center flex-shrink-0">
              <button onClick={() => startEdit(project)} className="text-xs text-gray-500 hover:text-black font-medium">Edit</button>
              <button onClick={() => remove(project.id)} className="text-[#e3e1da] hover:text-[#ff6b47] text-lg font-bold transition-colors">×</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// --- Experience Tab ---
function ExperienceTab({ token }: { token: string }) {
  const [list, setList] = useState<any[]>([])
  const [form, setForm] = useState({ company: "", role: "", responsibilities: "", technologies: "", start_date: "", end_date: "" })
  const [editingId, setEditingId] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)

  const fetchList = async () => {
    try {
      const res = await fetch(`${API_URL}/kb/experience?token=${token}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setList(data || [])
    } catch {}
  }

  useEffect(() => { if (token) fetchList() }, [token])

  const save = async () => {
    if (!form.company.trim() || !form.role.trim()) return
    const url = editingId ? `${API_URL}/kb/experience/${editingId}?token=${token}` : `${API_URL}/kb/experience?token=${token}`
    const method = editingId ? "PUT" : "POST"

    await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(form)
    })
    setForm({ company: "", role: "", responsibilities: "", technologies: "", start_date: "", end_date: "" })
    setEditingId(null)
    setShowForm(false)
    fetchList()
  }

  const startEdit = (exp: any) => {
    setForm({
      company: exp.company,
      role: exp.role,
      responsibilities: exp.responsibilities || "",
      technologies: exp.technologies || "",
      start_date: exp.start_date || "",
      end_date: exp.end_date || ""
    })
    setEditingId(exp.id)
    setShowForm(true)
  }

  const remove = async (id: number) => {
    await fetch(`${API_URL}/kb/experience/${id}?token=${token}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    })
    fetchList()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[#16191d]">Work Experience</h3>
        <button
          onClick={() => {
            if (showForm) {
              setShowForm(false)
              setEditingId(null)
            } else {
              setForm({ company: "", role: "", responsibilities: "", technologies: "", start_date: "", end_date: "" })
              setShowForm(true)
            }
          }}
          className="text-xs border border-[#e3e1da] px-3 py-1.5 rounded-lg hover:border-[#6e7682] transition-colors text-[#6e7682]"
        >
          {showForm ? "Cancel" : "+ Add Experience"}
        </button>
      </div>

      {showForm && (
        <div className="border border-[#e3e1da] rounded-xl p-4 mb-4 space-y-3 bg-[#fafaf7]">
          <p className="text-xs font-semibold text-gray-700">{editingId ? "Edit Work Experience" : "Add Work Experience"}</p>
          {[
            { label: "Company / Organization", field: "company" },
            { label: "Job Title / Role", field: "role" },
            { label: "Technologies Used", field: "technologies" },
            { label: "Start Date (e.g. 2022-01)", field: "start_date" },
            { label: "End Date (or Present)", field: "end_date" },
          ].map(({ label, field }) => (
            <div key={field}>
              <label className={labelClass}>{label}</label>
              <input
                type="text"
                value={form[field as keyof typeof form]}
                onChange={(e) => setForm(prev => ({ ...prev, [field]: e.target.value }))}
                className={inputClass}
              />
            </div>
          ))}
          <div>
            <label className={labelClass}>Key Responsibilities & Bullet Points</label>
            <textarea
              value={form.responsibilities}
              onChange={(e) => setForm(prev => ({ ...prev, responsibilities: e.target.value }))}
              rows={4}
              placeholder="What were your accomplishments? (Enter bullet points on separate lines)"
              className={inputClass}
            />
          </div>
          <button
            onClick={save}
            className="w-full bg-[#16191d] text-white py-2.5 rounded-xl font-medium hover:bg-[#2a2d32] transition-colors text-sm shadow-sm"
          >
            {editingId ? "Update Experience" : "Save Experience"}
          </button>
        </div>
      )}

      {list.length === 0 && !showForm && (
        <p className="text-[#6e7682] text-sm text-center py-8">No experience entries added yet.</p>
      )}

      {list.map((exp) => (
        <div key={exp.id} className={cardClass}>
          <div className="flex justify-between items-start">
            <div className="flex-1 pr-4">
              <p className="font-semibold text-[#16191d]">{exp.role}</p>
              <p className="text-sm text-gray-700">{exp.company}</p>
              <p className="text-xs text-[#6e7682] mt-0.5">{exp.start_date}{exp.end_date ? ` – ${exp.end_date}` : ""}</p>
              {exp.technologies && <p className="text-xs text-[#6e7682] mt-1">Tech: {exp.technologies}</p>}
            </div>
            <div className="flex gap-2 items-center">
              <button onClick={() => startEdit(exp)} className="text-xs text-gray-500 hover:text-black font-medium">Edit</button>
              <button onClick={() => remove(exp.id)} className="text-[#e3e1da] hover:text-[#ff6b47] text-lg font-bold transition-colors">×</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// --- Skills Tab ---
function SkillsTab({ token }: { token: string }) {
  const [list, setList] = useState<any[]>([])
  const [inputs, setInputs] = useState<Record<string, string>>({
    languages: "", frameworks: "", tools: "", databases: "", cloud: ""
  })

  const categories = [
    { key: "languages", label: "Programming Languages" },
    { key: "frameworks", label: "Frameworks & Libraries" },
    { key: "tools", label: "Tools & DevOps" },
    { key: "databases", label: "Databases & Storage" },
    { key: "cloud", label: "Cloud & Concepts" },
  ]

  const fetchList = async () => {
    try {
      const res = await fetch(`${API_URL}/kb/skills?token=${token}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setList(data || [])
    } catch {}
  }

  useEffect(() => { if (token) fetchList() }, [token])

  const addSkill = async (category: string) => {
    const name = inputs[category].trim()
    if (!name) return
    await fetch(`${API_URL}/kb/skills?token=${token}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ category, name })
    })
    setInputs(prev => ({ ...prev, [category]: "" }))
    fetchList()
  }

  const remove = async (id: number) => {
    await fetch(`${API_URL}/kb/skills/${id}?token=${token}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    })
    fetchList()
  }

  const totalSkills = list.length

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[#16191d]">Technical & Professional Skills</h3>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${totalSkills >= 3 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
          {totalSkills} skill{totalSkills !== 1 ? "s" : ""} {totalSkills < 3 ? "(min 3 required)" : "✓ Ready"}
        </span>
      </div>
      {categories.map(({ key, label }) => {
        const categorySkills = list.filter(s => s.category === key)
        return (
          <div key={key} className="mb-5">
            <label className="text-sm font-medium text-[#16191d] mb-1.5 block">{label}</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={inputs[key]}
                onChange={(e) => setInputs(prev => ({ ...prev, [key]: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && addSkill(key)}
                placeholder={`Type ${label.toLowerCase()} and press Enter`}
                className={inputClass + " mt-0"}
              />
              <button
                onClick={() => addSkill(key)}
                className="text-xs bg-[#16191d] text-white px-4 py-2 rounded-xl hover:bg-[#2a2d32] transition-colors font-medium shadow-sm"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {categorySkills.map((skill) => (
                <span key={skill.id} className="bg-[#f1f0eb] text-[#16191d] px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2">
                  {skill.name}
                  <button onClick={() => remove(skill.id)} className="text-[#6e7682] hover:text-[#ff6b47] font-bold">×</button>
                </span>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// --- Certifications Tab ---
function CertificationsTab({ token }: { token: string }) {
  const [list, setList] = useState<any[]>([])
  const [form, setForm] = useState({ name: "", issuer: "", skills_covered: "", date: "" })
  const [showForm, setShowForm] = useState(false)

  const fetchList = async () => {
    try {
      const res = await fetch(`${API_URL}/kb/certifications?token=${token}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setList(data || [])
    } catch {}
  }

  useEffect(() => { if (token) fetchList() }, [token])

  const save = async () => {
    if (!form.name.trim()) return
    await fetch(`${API_URL}/kb/certifications?token=${token}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(form)
    })
    setForm({ name: "", issuer: "", skills_covered: "", date: "" })
    setShowForm(false)
    fetchList()
  }

  const remove = async (id: number) => {
    await fetch(`${API_URL}/kb/certifications/${id}?token=${token}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    })
    fetchList()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[#16191d]">Certifications</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs border border-[#e3e1da] px-3 py-1.5 rounded-lg hover:border-[#6e7682] transition-colors text-[#6e7682]"
        >
          {showForm ? "Cancel" : "+ Add Certification"}
        </button>
      </div>
      {showForm && (
        <div className="border border-[#e3e1da] rounded-xl p-4 mb-4 space-y-3 bg-[#fafaf7]">
          {[
            { label: "Certification Name", field: "name" },
            { label: "Issuing Organization (e.g. AWS, Coursera, Google)", field: "issuer" },
            { label: "Skills Covered", field: "skills_covered" },
            { label: "Date Earned", field: "date" },
          ].map(({ label, field }) => (
            <div key={field}>
              <label className={labelClass}>{label}</label>
              <input
                type="text"
                value={form[field as keyof typeof form]}
                onChange={(e) => setForm(prev => ({ ...prev, [field]: e.target.value }))}
                className={inputClass}
              />
            </div>
          ))}
          <button
            onClick={save}
            className="w-full bg-[#16191d] text-white py-2.5 rounded-xl font-medium hover:bg-[#2a2d32] transition-colors text-sm shadow-sm"
          >
            Save Certification
          </button>
        </div>
      )}
      {list.length === 0 && !showForm && (
        <p className="text-[#6e7682] text-sm text-center py-8">No certifications added yet.</p>
      )}
      {list.map((cert) => (
        <div key={cert.id} className={cardClass}>
          <div className="flex justify-between items-start">
            <div>
              <p className="font-semibold text-[#16191d]">{cert.name}</p>
              {cert.issuer && <p className="text-xs text-gray-700">{cert.issuer}</p>}
              {cert.skills_covered && <p className="text-xs text-[#6e7682]">Skills: {cert.skills_covered}</p>}
              {cert.date && <p className="text-xs text-[#6e7682] mt-0.5">{cert.date}</p>}
            </div>
            <button onClick={() => remove(cert.id)} className="text-[#e3e1da] hover:text-[#ff6b47] text-lg font-bold transition-colors">×</button>
          </div>
        </div>
      ))}
    </div>
  )
}

// --- Achievements Tab ---
function AchievementsTab({ token }: { token: string }) {
  const [list, setList] = useState<any[]>([])
  const [form, setForm] = useState({ title: "", description: "", date: "" })
  const [showForm, setShowForm] = useState(false)

  const fetchList = async () => {
    try {
      const res = await fetch(`${API_URL}/kb/achievements?token=${token}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setList(data || [])
    } catch {}
  }

  useEffect(() => { if (token) fetchList() }, [token])

  const save = async () => {
    if (!form.title.trim()) return
    await fetch(`${API_URL}/kb/achievements?token=${token}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(form)
    })
    setForm({ title: "", description: "", date: "" })
    setShowForm(false)
    fetchList()
  }

  const remove = async (id: number) => {
    await fetch(`${API_URL}/kb/achievements/${id}?token=${token}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    })
    fetchList()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[#16191d]">Achievements & Honors</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs border border-[#e3e1da] px-3 py-1.5 rounded-lg hover:border-[#6e7682] transition-colors text-[#6e7682]"
        >
          {showForm ? "Cancel" : "+ Add Achievement"}
        </button>
      </div>
      {showForm && (
        <div className="border border-[#e3e1da] rounded-xl p-4 mb-4 space-y-3 bg-[#fafaf7]">
          {[
            { label: "Award / Achievement Title", field: "title" },
            { label: "Date / Year", field: "date" },
          ].map(({ label, field }) => (
            <div key={field}>
              <label className={labelClass}>{label}</label>
              <input
                type="text"
                value={form[field as keyof typeof form]}
                onChange={(e) => setForm(prev => ({ ...prev, [field]: e.target.value }))}
                className={inputClass}
              />
            </div>
          ))}
          <div>
            <label className={labelClass}>Description & Impact</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              placeholder="Describe the recognition or context..."
              className={inputClass}
            />
          </div>
          <button
            onClick={save}
            className="w-full bg-[#16191d] text-white py-2.5 rounded-xl font-medium hover:bg-[#2a2d32] transition-colors text-sm shadow-sm"
          >
            Save Achievement
          </button>
        </div>
      )}
      {list.length === 0 && !showForm && (
        <p className="text-[#6e7682] text-sm text-center py-8">No achievements added yet.</p>
      )}
      {list.map((ach) => (
        <div key={ach.id} className={cardClass}>
          <div className="flex justify-between items-start">
            <div>
              <p className="font-semibold text-[#16191d]">{ach.title}</p>
              {ach.description && <p className="text-xs text-[#6e7682] mt-1">{ach.description}</p>}
              {ach.date && <p className="text-xs text-[#6e7682] mt-0.5">{ach.date}</p>}
            </div>
            <button onClick={() => remove(ach.id)} className="text-[#e3e1da] hover:text-[#ff6b47] text-lg font-bold transition-colors">×</button>
          </div>
        </div>
      ))}
    </div>
  )
}