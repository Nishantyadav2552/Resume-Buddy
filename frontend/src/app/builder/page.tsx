"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import AppNav from "@/components/AppNav"
import { API_URL } from "@/lib/api"

interface Resume {
  id: number
  title: string
  template: string
  created_at: string
}

export default function BuilderPage() {
  const router = useRouter()
  const [resumes, setResumes] = useState<Resume[]>([])
  const [token, setToken] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = localStorage.getItem("token")
    if (!t) {
      router.push("/login")
      return
    }
    setToken(t)
    fetchResumes(t)
  }, [])

  const fetchResumes = async (t: string) => {
    try {
      setLoading(true)
      const res = await fetch(`${API_URL}/resumes/?token=${t}`, {
        headers: { Authorization: `Bearer ${t}` }
      })
      const data = await res.json()
      setResumes(Array.isArray(data) ? data : [])
    } catch {
      setResumes([])
    } finally {
      setLoading(false)
    }
  }

  const createResume = async () => {
    try {
      const res = await fetch(`${API_URL}/resumes/?token=${token}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: "Untitled Resume",
          template: "classic",
          content: {
            personal: { name: "", email: "", phone: "", location: "", linkedin: "", github: "", summary: "" },
            experience: [],
            projects: [],
            skills: { technical: [], frameworks: [], concepts: [], soft: [] },
            education: [],
            certifications: [],
            extracurricular: []
          }
        })
      })
      const data = await res.json()
      if (data.id) {
        router.push(`/builder/${data.id}`)
      }
    } catch {
      alert("Failed to create new resume.")
    }
  }

  const deleteResume = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    if (!confirm("Are you sure you want to delete this resume?")) return
    try {
      await fetch(`${API_URL}/resumes/${id}?token=${token}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchResumes(token)
    } catch {
      alert("Failed to delete resume.")
    }
  }

  return (
    <div className="min-h-screen bg-[#fafaf7]">
      <AppNav />

      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-[#6e7682] mb-2">Resume Builder</p>
            <h2
              className="text-3xl font-bold text-[#16191d]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              My Resumes
            </h2>
          </div>
          <Button
            onClick={createResume}
            className="bg-[#16191d] text-white hover:bg-[#2a2d32] rounded-xl shadow-sm"
          >
            + New Resume
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-24 border border-dashed border-[#e3e1da] rounded-2xl bg-white">
            <p className="text-[#6e7682] text-sm">Loading your resumes...</p>
          </div>
        ) : resumes.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-[#e3e1da] rounded-2xl bg-white shadow-sm">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">
              📄
            </div>
            <p className="text-[#16191d] font-semibold mb-1">No resumes yet</p>
            <p className="text-[#6e7682] text-sm mb-6">Create a resume from scratch or generate one with AI Tailor.</p>
            <div className="flex justify-center gap-3">
              <Button
                onClick={createResume}
                className="bg-[#16191d] text-white hover:bg-[#2a2d32] rounded-xl"
              >
                + Create from Scratch
              </Button>
              <Button
                onClick={() => router.push("/buddy/generate")}
                variant="outline"
                className="rounded-xl border-[#e3e1da]"
              >
                ⚡ Generate with AI Buddy
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {resumes.map((resume) => (
              <div
                key={resume.id}
                className="bg-white border border-[#e3e1da] rounded-2xl p-6 hover:shadow-md cursor-pointer relative transition-all hover:border-[#6e7682] group"
                onClick={() => router.push(`/builder/${resume.id}`)}
              >
                <div className="w-9 h-9 rounded-xl bg-[#f1f0eb] flex items-center justify-center mb-4">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16191d" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                </div>
                <h3
                  className="font-bold text-[#16191d] mb-1 truncate pr-6"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {resume.title || "Untitled Resume"}
                </h3>
                <p className="text-xs text-[#6e7682] mb-1 capitalize font-medium">{resume.template || "classic"} template</p>
                <p className="text-xs text-[#6e7682]">
                  {resume.created_at ? new Date(resume.created_at).toLocaleDateString() : "Just now"}
                </p>
                <button
                  onClick={(e) => deleteResume(e, resume.id)}
                  className="absolute top-4 right-4 text-[#e3e1da] hover:text-[#ff6b47] text-xl font-bold transition-colors"
                  title="Delete Resume"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}