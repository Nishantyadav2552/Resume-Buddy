"use client"

import React, { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { useReactToPrint } from "react-to-print"
import ResumePreview from "@/components/ResumePreview"
import AppNav from "@/components/AppNav"
import { RESUME_TEMPLATES } from "@/components/resume-templates"
import { API_URL } from "@/lib/api"

export default function BuddyGeneratePage() {
  const router = useRouter()
  const [token, setToken] = useState("")
  const [jd, setJd] = useState("")
  const [template, setTemplate] = useState("classic")
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<any>(null)
  const [resumeContent, setResumeContent] = useState<any>(null)
  const [rankingInfo, setRankingInfo] = useState<any>(null)
  const [error, setError] = useState("")
  const [inputMode, setInputMode] = useState<"paste" | "upload">("paste")
  const [fileName, setFileName] = useState("")
  const [extracting, setExtracting] = useState(false)
  const [savingToBuilder, setSavingToBuilder] = useState(false)

  // --- Project swap state ---
  const [allRankedProjects, setAllRankedProjects] = useState<any[]>([])
  const [selectedProjectIds, setSelectedProjectIds] = useState<number[]>([])
  const [swapSlotIndex, setSwapSlotIndex] = useState<number | null>(null)

  const previewRef = useRef<HTMLDivElement>(null)

  const handlePrint = useReactToPrint({
    contentRef: previewRef,
    documentTitle: "Generated Resume",
  })

  useEffect(() => {
    const t = localStorage.getItem("token")
    if (!t) {
      router.push("/login")
      return
    }
    setToken(t)
    fetchStatus(t)
  }, [])

  const fetchStatus = async (t: string) => {
    try {
      const res = await fetch(`${API_URL}/buddy/status?token=${t}`, {
        headers: { Authorization: `Bearer ${t}` }
      })
      const data = await res.json()
      setStatus(data)
    } catch {
      setStatus(null)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setError("")
    setExtracting(true)
    setJd("")
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch(`${API_URL}/buddy/extract-jd?token=${token}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      })
      const data = await res.json()
      if (!res.ok || data.detail) {
        setError(data.detail || "Failed to extract text from file.")
      } else {
        setJd(data.text || "")
      }
    } catch {
      setError("Failed to extract text. Please try pasting instead.")
    } finally {
      setExtracting(false)
    }
  }

  const generate = async () => {
    if (!jd.trim()) {
      setError("Please paste or upload a job description")
      return
    }
    setError("")
    setLoading(true)
    setSwapSlotIndex(null)
    try {
      const res = await fetch(`${API_URL}/buddy/generate?token=${token}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ job_description: jd, template })
      })
      const data = await res.json()
      if (!res.ok || data.detail) {
        setError(data.detail || "Generation failed. Please verify your knowledge base.")
      } else {
        setResumeContent(data.resume_content)
        setRankingInfo(data.ranking_info)
        const ranked = data.all_ranked_projects || []
        setAllRankedProjects(ranked)
        setSelectedProjectIds(ranked.slice(0, 3).map((p: any) => p.id))
      }
    } catch {
      setError("Something went wrong with the AI tailoring engine. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const saveToBuilder = async () => {
    if (!resumeContent) return
    setSavingToBuilder(true)
    try {
      const res = await fetch(`${API_URL}/resumes/?token=${token}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: `Tailored Resume - ${new Date().toLocaleDateString()}`,
          template: template,
          content: resumeContent
        })
      })
      const data = await res.json()
      if (data.id) {
        router.push(`/builder/${data.id}`)
      } else {
        alert("Failed to save resume.")
      }
    } catch {
      alert("Could not open in builder.")
    } finally {
      setSavingToBuilder(false)
    }
  }

  const projectToResumeFormat = (p: any) => ({
    title: p.title,
    description: p.description || "",
    technologies: p.technologies || "",
    link: ""
  })

  const swapProject = (slotIndex: number, newProjectId: number) => {
    setSelectedProjectIds(prev => {
      const updated = [...prev]
      updated[slotIndex] = newProjectId
      return updated
    })
    setSwapSlotIndex(null)
  }

  useEffect(() => {
    if (!resumeContent || allRankedProjects.length === 0) return
    const selectedProjects = selectedProjectIds
      .map(id => allRankedProjects.find(p => p.id === id))
      .filter(Boolean)
      .map(projectToResumeFormat)

    setResumeContent((prev: any) => ({
      ...prev,
      projects: selectedProjects
    }))
  }, [selectedProjectIds])

  const availableForSlot = (slotIndex: number) => {
    const otherSelected = selectedProjectIds.filter((_, i) => i !== slotIndex)
    return allRankedProjects.filter(p => !otherSelected.includes(p.id))
  }

  return (
    <div className="min-h-screen bg-[#fafaf7]">
      <AppNav />

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-10">
          <p className="text-xs font-mono uppercase tracking-widest text-[#6e7682] mb-2">Resume Buddy</p>
          <div className="flex items-end justify-between">
            <h2 className="text-3xl font-bold text-[#16191d]" style={{ fontFamily: "var(--font-display)" }}>
              AI Resume Tailor & Generator
            </h2>
            <button
              onClick={() => router.push("/buddy")}
              className="text-sm border border-[#e3e1da] px-3 py-1.5 rounded-lg hover:border-[#6e7682] transition-colors text-[#6e7682]"
            >
              ← Knowledge Base
            </button>
          </div>
          <p className="text-[#6e7682] text-sm mt-1">
            Provide a target job description and our hybrid RAG engine will select, rank, and tailor your background into a high-scoring ATS resume.
          </p>
        </div>

        {/* KB Status */}
        {status && (
          <div className={`border rounded-2xl p-4 mb-8 ${status.ready ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-sm font-semibold ${status.ready ? "text-green-700" : "text-yellow-700"}`}>
                {status.ready ? "✅ Career Knowledge Base Ready" : "⚠️ Knowledge Base Incomplete"}
              </span>
            </div>
            <div className="flex gap-4 text-xs text-[#6e7682] flex-wrap">
              <span className={status.personal ? "text-green-600" : "text-red-500"}>
                {status.personal ? "✓" : "✗"} Personal Info
              </span>
              <span className={status.education_count >= 1 ? "text-green-600" : "text-red-500"}>
                {status.education_count >= 1 ? "✓" : "✗"} Education ({status.education_count})
              </span>
              <span className={status.projects_count >= 2 ? "text-green-600" : "text-red-500"}>
                {status.projects_count >= 2 ? "✓" : "✗"} Projects ({status.projects_count}/2 min)
              </span>
              <span className={status.skills_count >= 3 ? "text-green-600" : "text-red-500"}>
                {status.skills_count >= 3 ? "✓" : "✗"} Skills ({status.skills_count}/3 min)
              </span>
            </div>
            {!status.ready && (
              <button
                onClick={() => router.push("/buddy")}
                className="mt-3 text-sm border border-yellow-300 px-3 py-1.5 rounded-lg text-yellow-700 hover:bg-yellow-100 transition-colors"
              >
                Complete Knowledge Base Entries →
              </button>
            )}
          </div>
        )}

        <div className={`grid gap-6 ${resumeContent ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1 max-w-2xl"}`}>

          {/* Left: Input + Project Selection */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-[#16191d]">Target Job Description</label>
                <div className="flex gap-1 bg-[#f1f0eb] rounded-lg p-1">
                  <button
                    onClick={() => { setInputMode("paste"); setError("") }}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${inputMode === "paste" ? "bg-white text-[#16191d] shadow-sm" : "text-[#6e7682]"}`}
                  >
                    Paste Text
                  </button>
                  <button
                    onClick={() => { setInputMode("upload"); setError("") }}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${inputMode === "upload" ? "bg-white text-[#16191d] shadow-sm" : "text-[#6e7682]"}`}
                  >
                    Upload File
                  </button>
                </div>
              </div>

              {inputMode === "paste" ? (
                <textarea
                  value={jd}
                  onChange={(e) => setJd(e.target.value)}
                  placeholder="Paste the job requirements, responsibilities, and qualifications here..."
                  rows={12}
                  className="w-full px-3 py-2 border border-[#e3e1da] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#16191d] resize-none bg-white"
                />
              ) : (
                <div className="space-y-3">
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#e3e1da] rounded-xl py-8 cursor-pointer hover:border-[#6e7682] transition-colors bg-white">
                    <input type="file" accept=".pdf,.docx" onChange={handleFileUpload} className="hidden" />
                    <span className="text-sm text-[#6e7682] font-medium">
                      {extracting ? "Extracting text with parser..." : fileName || "Click to upload JD (.pdf or .docx)"}
                    </span>
                    <span className="text-xs text-[#6e7682] mt-1">Job description document</span>
                  </label>
                  {jd && !extracting && (
                    <div>
                      <label className="text-xs font-medium text-[#6e7682] mb-1 block">Extracted Job Description Text</label>
                      <textarea
                        value={jd}
                        onChange={(e) => setJd(e.target.value)}
                        rows={8}
                        className="w-full px-3 py-2 border border-[#e3e1da] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#16191d] resize-none bg-white"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-[#16191d] mb-2 block">Resume Design Template</label>
              <select
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                className="w-full px-3 py-2 border border-[#e3e1da] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#16191d] bg-white"
              >
                {RESUME_TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            <button
              onClick={generate}
              disabled={loading || extracting || (status && !status.ready)}
              className="w-full bg-[#16191d] text-white py-3 rounded-xl font-medium hover:bg-[#2a2d32] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {loading ? "RAG Retrieval & Tailoring in progress..." : "⚡ Generate Tailored Resume"}
            </button>

            {rankingInfo && (
              <div className="bg-[#f1f0eb] border border-[#e3e1da] rounded-xl p-4 text-xs text-[#6e7682] space-y-1">
                <p className="font-semibold text-[#16191d] mb-2">Hybrid Retrieval Selections:</p>
                <p>📁 Top Projects Selected: {rankingInfo.projects_selected}</p>
                <p>💼 Work Experiences Ranked: {rankingInfo.experience_selected}</p>
                <p>🏆 Certifications Matched: {rankingInfo.certifications_selected}</p>
                <p>⭐ Achievements Included: {rankingInfo.achievements_selected}</p>
                <p>🛠 Relevant Skills Matched: {rankingInfo.skills_selected}</p>
              </div>
            )}

            {/* --- Project Selection Panel --- */}
            {allRankedProjects.length > 0 && (
              <div className="bg-white border border-[#e3e1da] rounded-xl p-4 shadow-sm">
                <p className="font-semibold text-[#16191d] text-sm mb-1">Projects Selected for Resume</p>
                <p className="text-xs text-[#6e7682] mb-3">Ranked by dense semantic + BM25 relevance score</p>
                <div className="space-y-2">
                  {selectedProjectIds.map((pid, slotIndex) => {
                    const project = allRankedProjects.find(p => p.id === pid)
                    if (!project) return null
                    return (
                      <div key={slotIndex} className="border border-[#e3e1da] rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#16191d] truncate">{project.title}</p>
                            <p className="text-xs text-[#6e7682] truncate">{project.technologies}</p>
                            {project.score && (
                              <span className="text-[10px] font-mono text-green-700 bg-green-50 px-2 py-0.5 rounded mt-1 inline-block">
                                Relevance score: {project.score}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => setSwapSlotIndex(swapSlotIndex === slotIndex ? null : slotIndex)}
                            className="text-xs border border-[#e3e1da] px-2 py-1 rounded-lg hover:border-[#6e7682] text-[#6e7682] transition-colors flex-shrink-0 ml-2"
                          >
                            {swapSlotIndex === slotIndex ? "Cancel" : "⇄ Swap"}
                          </button>
                        </div>

                        {/* Swap picker */}
                        {swapSlotIndex === slotIndex && (
                          <div className="mt-3 pt-3 border-t border-[#e3e1da] space-y-1.5">
                            <p className="text-xs text-[#6e7682] mb-2">Choose alternative project from Knowledge Base:</p>
                            {availableForSlot(slotIndex).map((alt) => (
                              <button
                                key={alt.id}
                                onClick={() => swapProject(slotIndex, alt.id)}
                                disabled={alt.id === pid}
                                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${alt.id === pid
                                  ? "bg-[#f1f0eb] text-[#16191d] font-medium cursor-default"
                                  : "hover:bg-[#f1f0eb] text-[#6e7682]"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="truncate">{alt.title}</span>
                                  <span className="text-[10px] text-[#6e7682] ml-2 flex-shrink-0">
                                    score {alt.score || "—"}
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right: Preview */}
          {resumeContent && (
            <div className="border border-[#e3e1da] rounded-2xl overflow-hidden bg-white shadow-sm flex flex-col">
              <div className="bg-[#f1f0eb] border-b border-[#e3e1da] px-4 py-3 flex items-center justify-between">
                <span className="text-xs text-[#6e7682] font-semibold uppercase tracking-wider">Tailored Preview</span>
                <div className="flex gap-2">
                  <button
                    onClick={saveToBuilder}
                    disabled={savingToBuilder}
                    className="text-xs bg-[#16191d] text-white px-3 py-1.5 rounded-lg hover:bg-[#2a2d32] transition-colors font-medium"
                  >
                    {savingToBuilder ? "Opening..." : "✏️ Open in Builder"}
                  </button>
                  <button
                    onClick={() => handlePrint()}
                    className="text-xs border border-[#e3e1da] px-3 py-1.5 rounded-lg hover:border-[#6e7682] transition-colors text-[#6e7682] bg-white font-medium"
                  >
                    Download PDF
                  </button>
                </div>
              </div>
              <div className="overflow-y-auto max-h-[800px] p-4" ref={previewRef}>
                <ResumePreview content={resumeContent} templateId={template} />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}