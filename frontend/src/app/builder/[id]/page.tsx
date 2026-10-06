"use client"

import React, { useEffect, useState, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import ResumePreview from "@/components/ResumePreview"
import AppNav from "@/components/AppNav"
import { useReactToPrint } from "react-to-print"
import { RESUME_TEMPLATES } from "@/components/resume-templates"
import { API_URL } from "@/lib/api"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

interface ResumeContent {
  personal: {
    name: string
    email: string
    phone: string
    location: string
    linkedin: string
    github: string
    summary: string
  }
  experience: {
    company: string
    role: string
    startDate: string
    endDate: string
    description: string
  }[]
  projects: {
    title: string
    description: string
    technologies: string
    link: string
  }[]
  skills: {
    technical: string[]
    frameworks: string[]
    concepts: string[]
    soft: string[]
  }
  education: {
    school: string
    degree: string
    field: string
    startYear: string
    endYear: string
  }[]
  certifications: {
    name: string
    issuer: string
    date: string
    link: string
  }[]
  extracurricular: {
    title: string
    organization: string
    date: string
    description: string
  }[]
}

const defaultContent: ResumeContent = {
  personal: { name: "", email: "", phone: "", location: "", linkedin: "", github: "", summary: "" },
  experience: [],
  projects: [],
  skills: { technical: [], frameworks: [], concepts: [], soft: [] },
  education: [],
  certifications: [],
  extracurricular: []
}

const defaultSectionOrder = ["personal", "education", "experience", "projects", "skills", "certifications", "extracurricular"]

function SortableSection({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  return (
    <div ref={setNodeRef} style={style} className="mb-6" suppressHydrationWarning>
      <div className="flex items-center gap-2 mb-1">
        <button
          {...attributes}
          {...listeners}
          className="text-[#e3e1da] hover:text-[#6e7682] cursor-grab active:cursor-grabbing px-1"
          title="Drag to reorder section"
          suppressHydrationWarning
        >
          ⠿
        </button>
        <span className="text-xs text-[#6e7682] uppercase tracking-wider font-medium font-mono">
          {id === "personal" ? "Personal Information" : id === "extracurricular" ? "Extracurricular & Achievements" : id.charAt(0).toUpperCase() + id.slice(1)}
        </span>
      </div>
      {children}
    </div>
  )
}

export default function ResumeEditorPage() {
  const router = useRouter()
  const params = useParams()
  const [content, setContent] = useState<ResumeContent>(defaultContent)
  const [title, setTitle] = useState("")
  const [token, setToken] = useState("")
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sectionOrder, setSectionOrder] = useState<string[]>(defaultSectionOrder)
  const [template, setTemplate] = useState("classic")
  const [skillInputs, setSkillInputs] = useState({ technical: "", frameworks: "", concepts: "", soft: "" })

  const previewRef = useRef<HTMLDivElement>(null)

  const handlePrint = useReactToPrint({
    contentRef: previewRef,
    documentTitle: title || "Resume",
  })

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  useEffect(() => {
    const t = localStorage.getItem("token")
    if (!t) {
      router.push("/login")
      return
    }
    setToken(t)
    fetchResume(t)
  }, [])

  const fetchResume = async (t: string) => {
    try {
      setLoading(true)
      const res = await fetch(`${API_URL}/resumes/${params.id}?token=${t}`, {
        headers: { Authorization: `Bearer ${t}` }
      })
      if (!res.ok) {
        alert("Resume not found or access denied.")
        router.push("/builder")
        return
      }
      const data = await res.json()
      setTitle(data.title || "Untitled Resume")
      setTemplate(data.template || "classic")
      setContent({
        personal: {
          name: data.content?.personal?.name || "",
          email: data.content?.personal?.email || "",
          phone: data.content?.personal?.phone || "",
          location: data.content?.personal?.location || "",
          linkedin: data.content?.personal?.linkedin || "",
          github: data.content?.personal?.github || "",
          summary: data.content?.personal?.summary || ""
        },
        experience: Array.isArray(data.content?.experience) ? data.content.experience : [],
        projects: Array.isArray(data.content?.projects) ? data.content.projects : [],
        skills: {
          technical: data.content?.skills?.technical || [],
          frameworks: data.content?.skills?.frameworks || [],
          concepts: data.content?.skills?.concepts || [],
          soft: data.content?.skills?.soft || []
        },
        education: Array.isArray(data.content?.education) ? data.content.education : [],
        certifications: Array.isArray(data.content?.certifications) ? data.content.certifications : [],
        extracurricular: Array.isArray(data.content?.extracurricular) ? data.content.extracurricular : []
      })
      if (data.content?.sectionOrder && Array.isArray(data.content.sectionOrder)) {
        setSectionOrder(data.content.sectionOrder)
      }
    } catch {
      alert("Failed to load resume.")
    } finally {
      setLoading(false)
    }
  }

  const saveResume = async () => {
    setSaving(true)
    try {
      await fetch(`${API_URL}/resumes/${params.id}?token=${token}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          template,
          content: { ...content, sectionOrder }
        })
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      alert("Error saving resume.")
    } finally {
      setSaving(false)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setSectionOrder((items) => {
        const oldIndex = items.indexOf(active.id as string)
        const newIndex = items.indexOf(over.id as string)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  const updatePersonal = (field: string, value: string) => {
    setContent(prev => ({ ...prev, personal: { ...prev.personal, [field]: value } }))
  }

  const addSkill = (category: keyof ResumeContent["skills"]) => {
    if (!skillInputs[category].trim()) return
    setContent(prev => ({
      ...prev,
      skills: {
        ...prev.skills,
        [category]: [...prev.skills[category], skillInputs[category].trim()]
      }
    }))
    setSkillInputs(prev => ({ ...prev, [category]: "" }))
  }

  const removeSkill = (category: keyof ResumeContent["skills"], index: number) => {
    setContent(prev => ({
      ...prev,
      skills: {
        ...prev.skills,
        [category]: prev.skills[category].filter((_, i) => i !== index)
      }
    }))
  }

  const addExperience = () => setContent(prev => ({ ...prev, experience: [...prev.experience, { company: "", role: "", startDate: "", endDate: "", description: "" }] }))
  const updateExperience = (index: number, field: string, value: string) => setContent(prev => ({ ...prev, experience: prev.experience.map((e, i) => i === index ? { ...e, [field]: value } : e) }))
  const removeExperience = (index: number) => setContent(prev => ({ ...prev, experience: prev.experience.filter((_, i) => i !== index) }))

  const addProject = () => setContent(prev => ({ ...prev, projects: [...prev.projects, { title: "", description: "", technologies: "", link: "" }] }))
  const updateProject = (index: number, field: string, value: string) => setContent(prev => ({ ...prev, projects: prev.projects.map((p, i) => i === index ? { ...p, [field]: value } : p) }))
  const removeProject = (index: number) => setContent(prev => ({ ...prev, projects: prev.projects.filter((_, i) => i !== index) }))

  const addEducation = () => setContent(prev => ({ ...prev, education: [...prev.education, { school: "", degree: "", field: "", startYear: "", endYear: "" }] }))
  const updateEducation = (index: number, field: string, value: string) => setContent(prev => ({ ...prev, education: prev.education.map((e, i) => i === index ? { ...e, [field]: value } : e) }))
  const removeEducation = (index: number) => setContent(prev => ({ ...prev, education: prev.education.filter((_, i) => i !== index) }))

  const addCertification = () => setContent(prev => ({ ...prev, certifications: [...prev.certifications, { name: "", issuer: "", date: "", link: "" }] }))
  const updateCertification = (index: number, field: string, value: string) => setContent(prev => ({ ...prev, certifications: prev.certifications.map((c, i) => i === index ? { ...c, [field]: value } : c) }))
  const removeCertification = (index: number) => setContent(prev => ({ ...prev, certifications: prev.certifications.filter((_, i) => i !== index) }))

  const addExtra = () => setContent(prev => ({ ...prev, extracurricular: [...prev.extracurricular, { title: "", organization: "", date: "", description: "" }] }))
  const updateExtra = (index: number, field: string, value: string) => setContent(prev => ({ ...prev, extracurricular: prev.extracurricular.map((e, i) => i === index ? { ...e, [field]: value } : e) }))
  const removeExtra = (index: number) => setContent(prev => ({ ...prev, extracurricular: prev.extracurricular.filter((_, i) => i !== index) }))

  const skillCategories = [
    { key: "technical" as const, label: "Technical & Programming Skills" },
    { key: "frameworks" as const, label: "Frameworks & Libraries" },
    { key: "concepts" as const, label: "Databases & Cloud Concepts" },
    { key: "soft" as const, label: "Tools & Methodologies" },
  ]

  const inputCls = "mt-1 w-full px-3 py-2 border border-[#e3e1da] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#16191d] bg-white"

  const renderSection = (sectionId: string) => {
    switch (sectionId) {
      case "personal":
        return (
          <div className="bg-white border border-[#e3e1da] rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold text-[#16191d] mb-4">Personal Information</h3>
            <div className="space-y-4">
              {[
                { label: "Full Name", field: "name", type: "text" },
                { label: "Email Address", field: "email", type: "email" },
                { label: "Phone Number", field: "phone", type: "text" },
                { label: "Location", field: "location", type: "text" },
                { label: "LinkedIn URL", field: "linkedin", type: "text" },
                { label: "GitHub URL", field: "github", type: "text" },
              ].map(({ label, field, type }) => (
                <div key={field}>
                  <label className="text-sm font-medium text-[#16191d]">{label}</label>
                  <input
                    type={type}
                    value={content.personal[field as keyof typeof content.personal]}
                    onChange={(e) => updatePersonal(field, e.target.value)}
                    className={inputCls}
                  />
                </div>
              ))}
              <div>
                <label className="text-sm font-medium text-[#16191d]">Professional Summary</label>
                <textarea
                  value={content.personal.summary}
                  onChange={(e) => updatePersonal("summary", e.target.value)}
                  rows={4}
                  className={inputCls}
                />
              </div>
            </div>
          </div>
        )

      case "experience":
        return (
          <div className="bg-white border border-[#e3e1da] rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[#16191d]">Work Experience</h3>
              <button
                onClick={addExperience}
                className="text-xs border border-[#e3e1da] px-3 py-1.5 rounded-lg hover:border-[#6e7682] text-[#6e7682] transition-colors font-medium"
              >
                + Add Experience
              </button>
            </div>
            {content.experience.map((exp, index) => (
              <div key={index} className="border border-[#e3e1da] rounded-xl p-4 mb-4 space-y-3 bg-[#fafaf7]">
                {[{ label: "Company", field: "company" }, { label: "Role", field: "role" }, { label: "Start Date", field: "startDate" }, { label: "End Date", field: "endDate" }].map(({ label, field }) => (
                  <div key={field}>
                    <label className="text-sm font-medium text-[#16191d]">{label}</label>
                    <input
                      type="text"
                      value={exp[field as keyof typeof exp]}
                      onChange={(e) => updateExperience(index, field, e.target.value)}
                      className={inputCls}
                    />
                  </div>
                ))}
                <div>
                  <label className="text-sm font-medium text-[#16191d]">Key Responsibilities & Achievements</label>
                  <textarea
                    value={exp.description}
                    onChange={(e) => updateExperience(index, "description", e.target.value)}
                    rows={3}
                    placeholder="Describe impact, metrics, and technologies used (separate lines for bullets)..."
                    className={inputCls}
                  />
                </div>
                <button onClick={() => removeExperience(index)} className="text-xs text-[#ff6b47] hover:underline font-medium">Remove Entry</button>
              </div>
            ))}
          </div>
        )

      case "projects":
        return (
          <div className="bg-white border border-[#e3e1da] rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[#16191d]">Projects</h3>
              <button
                onClick={addProject}
                className="text-xs border border-[#e3e1da] px-3 py-1.5 rounded-lg hover:border-[#6e7682] text-[#6e7682] transition-colors font-medium"
              >
                + Add Project
              </button>
            </div>
            {content.projects.map((project, index) => (
              <div key={index} className="border border-[#e3e1da] rounded-xl p-4 mb-4 space-y-3 bg-[#fafaf7]">
                {[{ label: "Project Title", field: "title" }, { label: "Technologies Used", field: "technologies" }, { label: "Project Link / Demo", field: "link" }].map(({ label, field }) => (
                  <div key={field}>
                    <label className="text-sm font-medium text-[#16191d]">{label}</label>
                    <input
                      type="text"
                      value={project[field as keyof typeof project]}
                      onChange={(e) => updateProject(index, field, e.target.value)}
                      className={inputCls}
                    />
                  </div>
                ))}
                <div>
                  <label className="text-sm font-medium text-[#16191d]">Description & Outcomes</label>
                  <textarea
                    value={project.description}
                    onChange={(e) => updateProject(index, "description", e.target.value)}
                    rows={3}
                    placeholder="Describe architecture, accomplishments, and quantifiable outcomes..."
                    className={inputCls}
                  />
                </div>
                <button onClick={() => removeProject(index)} className="text-xs text-[#ff6b47] hover:underline font-medium">Remove Project</button>
              </div>
            ))}
          </div>
        )

      case "skills":
        return (
          <div className="bg-white border border-[#e3e1da] rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold text-[#16191d] mb-4">Skills</h3>
            {skillCategories.map(({ key, label }) => (
              <div key={key} className="mb-6">
                <label className="text-sm font-medium text-[#16191d] mb-2 block">{label}</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={skillInputs[key]}
                    onChange={(e) => setSkillInputs(prev => ({ ...prev, [key]: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && addSkill(key)}
                    placeholder={`Add ${label.toLowerCase()} and press Enter`}
                    className={inputCls + " mt-0"}
                  />
                  <button
                    onClick={() => addSkill(key)}
                    className="text-xs bg-[#16191d] text-white px-4 py-2 rounded-xl hover:bg-[#2a2d32] transition-colors font-medium shadow-sm"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {content.skills[key].map((skill, index) => (
                    <span key={index} className="bg-[#f1f0eb] text-[#16191d] px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2">
                      {skill}
                      <button onClick={() => removeSkill(key, index)} className="text-[#6e7682] hover:text-[#ff6b47] font-bold">×</button>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )

      case "education":
        return (
          <div className="bg-white border border-[#e3e1da] rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[#16191d]">Education</h3>
              <button
                onClick={addEducation}
                className="text-xs border border-[#e3e1da] px-3 py-1.5 rounded-lg hover:border-[#6e7682] text-[#6e7682] transition-colors font-medium"
              >
                + Add Education
              </button>
            </div>
            {content.education.map((edu, index) => (
              <div key={index} className="border border-[#e3e1da] rounded-xl p-4 mb-4 space-y-3 bg-[#fafaf7]">
                {[{ label: "School / Institution", field: "school" }, { label: "Degree", field: "degree" }, { label: "Field of Study", field: "field" }, { label: "Start Year", field: "startYear" }, { label: "End Year", field: "endYear" }].map(({ label, field }) => (
                  <div key={field}>
                    <label className="text-sm font-medium text-[#16191d]">{label}</label>
                    <input
                      type="text"
                      value={edu[field as keyof typeof edu]}
                      onChange={(e) => updateEducation(index, field, e.target.value)}
                      className={inputCls}
                    />
                  </div>
                ))}
                <button onClick={() => removeEducation(index)} className="text-xs text-[#ff6b47] hover:underline font-medium">Remove Entry</button>
              </div>
            ))}
          </div>
        )

      case "certifications":
        return (
          <div className="bg-white border border-[#e3e1da] rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[#16191d]">Certifications</h3>
              <button
                onClick={addCertification}
                className="text-xs border border-[#e3e1da] px-3 py-1.5 rounded-lg hover:border-[#6e7682] text-[#6e7682] transition-colors font-medium"
              >
                + Add Certification
              </button>
            </div>
            {content.certifications.map((cert, index) => (
              <div key={index} className="border border-[#e3e1da] rounded-xl p-4 mb-4 space-y-3 bg-[#fafaf7]">
                {[{ label: "Certificate Name", field: "name" }, { label: "Issuer", field: "issuer" }, { label: "Date Earned", field: "date" }, { label: "Credential Link", field: "link" }].map(({ label, field }) => (
                  <div key={field}>
                    <label className="text-sm font-medium text-[#16191d]">{label}</label>
                    <input
                      type="text"
                      value={cert[field as keyof typeof cert]}
                      onChange={(e) => updateCertification(index, field, e.target.value)}
                      className={inputCls}
                    />
                  </div>
                ))}
                <button onClick={() => removeCertification(index)} className="text-xs text-[#ff6b47] hover:underline font-medium">Remove Entry</button>
              </div>
            ))}
          </div>
        )

      case "extracurricular":
        return (
          <div className="bg-white border border-[#e3e1da] rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[#16191d]">Extracurricular & Achievements</h3>
              <button
                onClick={addExtra}
                className="text-xs border border-[#e3e1da] px-3 py-1.5 rounded-lg hover:border-[#6e7682] text-[#6e7682] transition-colors font-medium"
              >
                + Add Activity
              </button>
            </div>
            {content.extracurricular.map((extra, index) => (
              <div key={index} className="border border-[#e3e1da] rounded-xl p-4 mb-4 space-y-3 bg-[#fafaf7]">
                {[{ label: "Title / Honor", field: "title" }, { label: "Organization", field: "organization" }, { label: "Date", field: "date" }].map(({ label, field }) => (
                  <div key={field}>
                    <label className="text-sm font-medium text-[#16191d]">{label}</label>
                    <input
                      type="text"
                      value={extra[field as keyof typeof extra]}
                      onChange={(e) => updateExtra(index, field, e.target.value)}
                      className={inputCls}
                    />
                  </div>
                ))}
                <div>
                  <label className="text-sm font-medium text-[#16191d]">Description</label>
                  <textarea
                    value={extra.description}
                    onChange={(e) => updateExtra(index, "description", e.target.value)}
                    rows={3}
                    className={inputCls}
                  />
                </div>
                <button onClick={() => removeExtra(index)} className="text-xs text-[#ff6b47] hover:underline font-medium">Remove Entry</button>
              </div>
            ))}
          </div>
        )

      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="h-screen bg-[#fafaf7] flex flex-col">
        <AppNav />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[#6e7682] text-sm">Loading resume editor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-[#fafaf7] flex flex-col">
      <AppNav />

      {/* Toolbar */}
      <div className="bg-white border-b border-[#e3e1da] px-6 py-3 flex items-center justify-between shrink-0 shadow-xs">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Resume title..."
          className="text-lg font-bold text-[#16191d] bg-transparent border-none outline-none max-w-sm"
          style={{ fontFamily: "var(--font-display)" }}
        />
        <div className="flex gap-3 items-center">
          <select
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            className="text-sm border border-[#e3e1da] rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#16191d] bg-white font-medium"
          >
            {RESUME_TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>{t.name} Template</option>
            ))}
          </select>
          <button
            onClick={() => handlePrint()}
            className="text-sm border border-[#e3e1da] px-3.5 py-1.5 rounded-xl hover:border-[#6e7682] transition-colors text-[#6e7682] font-medium"
          >
            Download PDF
          </button>
          <button
            onClick={saveResume}
            disabled={saving}
            className="text-sm bg-[#16191d] text-white px-4 py-1.5 rounded-xl hover:bg-[#2a2d32] transition-colors font-medium shadow-sm disabled:opacity-50"
          >
            {saving ? "Saving..." : saved ? "✓ Saved!" : "Save"}
          </button>
        </div>
      </div>

      {/* Side-by-side layout */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT: Editor */}
        <div className="w-1/2 overflow-y-auto px-6 py-6 border-r bg-[#fafaf7]">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
              {sectionOrder.map((sectionId) => (
                <SortableSection key={sectionId} id={sectionId}>
                  {renderSection(sectionId)}
                </SortableSection>
              ))}
            </SortableContext>
          </DndContext>

          <button
            onClick={saveResume}
            disabled={saving}
            className="w-full mb-8 mt-2 bg-[#16191d] text-white py-3 rounded-xl font-medium hover:bg-[#2a2d32] transition-colors shadow-sm"
          >
            {saving ? "Saving changes..." : saved ? "✓ Changes Saved!" : "Save Resume Changes"}
          </button>
        </div>

        {/* RIGHT: Preview */}
        <div className="w-1/2 overflow-y-auto bg-[#f1f0eb]">
          <div className="sticky top-0 bg-[#e3e1da] border-b border-[#d4d2cb] px-4 py-2 text-xs text-[#6e7682] font-mono uppercase tracking-wider z-10 flex justify-between items-center">
            <span>Live Vector Preview</span>
            <span className="capitalize">{template} template</span>
          </div>
          <div className="p-6">
            <div className="bg-white shadow-sm rounded-lg overflow-hidden" ref={previewRef}>
              <ResumePreview content={content} sectionOrder={sectionOrder} templateId={template} />
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}