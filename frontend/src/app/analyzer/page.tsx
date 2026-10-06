"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import AppNav from "@/components/AppNav"
import { API_URL } from "@/lib/api"

export default function AnalyzerPage() {
    const [jobDescription, setJobDescription] = useState("")
    const [resumeText, setResumeText] = useState("")
    const [file, setFile] = useState<File | null>(null)
    const [mode, setMode] = useState<"upload" | "paste">("upload")
    const [loading, setLoading] = useState(false)
    const [results, setResults] = useState<any>(null)
    const [error, setError] = useState("")

    const analyze = async () => {
        setError("")
        if (!jobDescription.trim()) {
            setError("Please enter or paste a job description.")
            return
        }

        if (mode === "paste" && !resumeText.trim()) {
            setError("Please paste your resume text.")
            return
        }

        if (mode === "upload" && !file) {
            setError("Please select a PDF or DOCX resume file to upload.")
            return
        }

        setLoading(true)
        try {
            let data: any
            const token = localStorage.getItem("token") || ""
            const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}

            if (mode === "upload" && file) {
                const formData = new FormData()
                formData.append("file", file)
                formData.append("job_description", jobDescription)
                const res = await fetch(`${API_URL}/analyzer/analyze-file`, {
                    method: "POST",
                    headers: authHeaders,
                    body: formData,
                })
                data = await res.json()
                if (!res.ok) {
                    throw new Error(data.detail || "Analysis failed")
                }
            } else {
                const res = await fetch(`${API_URL}/analyzer/analyze-text`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...authHeaders
                    },
                    body: JSON.stringify({ resume_text: resumeText, job_description: jobDescription }),
                })
                data = await res.json()
                if (!res.ok) {
                    throw new Error(data.detail || "Analysis failed")
                }
            }

            setResults(data)
        } catch (e: any) {
            setError(e.message || "Something went wrong. Please check your inputs and try again.")
        } finally {
            setLoading(false)
        }
    }

    const scoreColor = (score: number) => {
        if (score >= 75) return "text-emerald-600"
        if (score >= 50) return "text-amber-600"
        return "text-rose-500"
    }

    const scoreBarColor = (score: number) => {
        if (score >= 75) return "bg-emerald-500"
        if (score >= 50) return "bg-amber-400"
        return "bg-rose-400"
    }

    const scoreLabel = (score: number) => {
        if (score >= 85) return "Excellent — High ATS compatibility & skill match"
        if (score >= 70) return "Good — High potential with a few minor keyword enhancements"
        if (score >= 50) return "Fair — Missing key technical keywords and metrics"
        return "Needs Attention — Significant skill and formatting gaps found"
    }

    return (
        <div className="min-h-screen bg-[#fafaf7]">
            <AppNav />

            <main className="max-w-5xl mx-auto px-6 py-10">
                <div className="mb-8">
                    <p className="text-xs font-mono uppercase tracking-widest text-[#6e7682] mb-1">ATS Intelligence</p>
                    <h2 className="text-3xl font-bold text-gray-900 mb-1" style={{ fontFamily: "var(--font-display)" }}>
                        Resume & ATS Analyzer
                    </h2>
                    <p className="text-gray-500 text-sm">
                        Evaluate your resume against any target Job Description to receive deep ATS scoring, keyword match rate, bullet point metrics, and placement suggestions.
                    </p>
                </div>

                {error && (
                    <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-700 mb-6 flex items-center justify-between">
                        <span>{error}</span>
                        <button onClick={() => setError("")} className="text-rose-400 hover:text-rose-700">×</button>
                    </div>
                )}

                {/* Input Section */}
                {!results && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Resume Input */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <label className="text-sm font-semibold text-gray-800">Your Resume</label>
                                    <div className="flex gap-1 bg-[#f1f0eb] rounded-lg p-1">
                                        <button
                                            onClick={() => { setMode("upload"); setError("") }}
                                            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${mode === "upload" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
                                        >
                                            Upload File
                                        </button>
                                        <button
                                            onClick={() => { setMode("paste"); setError("") }}
                                            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${mode === "paste" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
                                        >
                                            Paste Text
                                        </button>
                                    </div>
                                </div>

                                {mode === "upload" ? (
                                    <div
                                        className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center cursor-pointer hover:border-gray-400 bg-white transition-colors min-h-[300px] flex flex-col items-center justify-center"
                                        onClick={() => document.getElementById("resume-file")?.click()}
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={(e) => {
                                            e.preventDefault()
                                            const f = e.dataTransfer.files[0]
                                            if (f) setFile(f)
                                        }}
                                    >
                                        <input
                                            id="resume-file"
                                            type="file"
                                            accept=".pdf,.docx"
                                            className="hidden"
                                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                                        />
                                        {file ? (
                                            <div>
                                                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-2 text-emerald-600 text-xl font-bold">
                                                    ✓
                                                </div>
                                                <p className="text-emerald-700 font-semibold text-sm">{file.name}</p>
                                                <p className="text-gray-400 text-xs mt-1">Click to select a different file</p>
                                            </div>
                                        ) : (
                                            <div>
                                                <p className="text-3xl mb-3">📄</p>
                                                <p className="text-gray-700 font-medium text-sm mb-1">Click or drag & drop your resume</p>
                                                <p className="text-gray-400 text-xs">PDF or DOCX supported</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <textarea
                                        value={resumeText}
                                        onChange={(e) => setResumeText(e.target.value)}
                                        placeholder="Paste your raw resume text here (experience, education, skills, projects)..."
                                        rows={14}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none bg-white min-h-[300px]"
                                    />
                                )}
                            </div>

                            {/* JD Input */}
                            <div>
                                <label className="text-sm font-semibold text-gray-800 mb-3 block">Target Job Description</label>
                                <textarea
                                    value={jobDescription}
                                    onChange={(e) => setJobDescription(e.target.value)}
                                    placeholder="Paste the target job description requirements, responsibilities, and qualifications..."
                                    rows={14}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none bg-white min-h-[300px]"
                                />
                            </div>
                        </div>

                        <Button
                            onClick={analyze}
                            disabled={loading}
                            className="w-full bg-[#16191d] hover:bg-[#2a2d32] text-white py-6 rounded-xl font-medium text-base shadow-sm"
                        >
                            {loading ? "Analyzing resume structure, skills, and readability..." : "🔍 Run ATS Resume Analysis"}
                        </Button>
                    </div>
                )}

                {/* Results */}
                {results && (
                    <div className="space-y-6">

                        {/* Top bar */}
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">Analysis Complete</span>
                            <Button variant="outline" size="sm" onClick={() => setResults(null)} className="rounded-xl">
                                ← Analyze Another Document
                            </Button>
                        </div>

                        {/* Overall Score Card */}
                        <div className="bg-white border border-gray-200 rounded-2xl p-8 flex flex-col md:flex-row items-center gap-8 shadow-sm">
                            {/* Circle Indicator */}
                            <div className="relative w-36 h-36 flex-shrink-0">
                                <svg className="w-36 h-36 -rotate-90" viewBox="0 0 120 120">
                                    <circle cx="60" cy="60" r="50" fill="none" stroke="#f3f4f6" strokeWidth="10" />
                                    <circle
                                        cx="60" cy="60" r="50" fill="none"
                                        stroke={results.overall_score >= 75 ? "#10b981" : results.overall_score >= 50 ? "#f59e0b" : "#ef4444"}
                                        strokeWidth="10"
                                        strokeDasharray={`${(results.overall_score / 100) * 314} 314`}
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className={`text-4xl font-bold ${scoreColor(results.overall_score)}`}>
                                        {results.overall_score}
                                    </span>
                                    <span className="text-xs text-gray-400 font-mono">/ 100</span>
                                </div>
                            </div>

                            {/* Breakdown Bars */}
                            <div className="flex-1 w-full">
                                <h3 className="text-xl font-bold text-gray-900 mb-1">Overall ATS Compatibility Score</h3>
                                <p className="text-gray-500 text-sm mb-5">{scoreLabel(results.overall_score)}</p>
                                <div className="space-y-3">
                                    {[
                                        { label: "Technical Skills Match", score: results.breakdown.tech_skills_match },
                                        { label: "Role & Domain Keywords", score: results.breakdown.role_keywords },
                                        { label: "Resume Quality & Language", score: results.breakdown.language_quality || results.breakdown.resume_quality },
                                        { label: "Impact & Metrics", score: results.breakdown.impact || 75 },
                                        { label: "ATS Essentials & Formatting", score: results.breakdown.ats_essentials },
                                    ].map(({ label, score }) => (
                                        <div key={label}>
                                            <div className="flex justify-between text-xs text-gray-600 mb-1">
                                                <span className="font-medium">{label}</span>
                                                <span className={`font-semibold ${scoreColor(score)}`}>{score}%</span>
                                            </div>
                                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all ${scoreBarColor(score)}`}
                                                    style={{ width: `${score}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Readability & Bullet Quality Card */}
                        {results.readability && (
                            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                                <h3 className="font-semibold text-gray-900 mb-2">📖 Readability & Tone Analysis</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                    <div className="bg-gray-50 border rounded-xl p-4">
                                        <p className="text-xs text-gray-500 mb-1">Flesch Reading Ease</p>
                                        <p className="text-2xl font-bold text-gray-900">{results.readability.score} <span className="text-xs text-gray-400 font-normal">/ 100</span></p>
                                        <p className="text-xs text-emerald-600 font-medium mt-1">{results.readability.level}</p>
                                    </div>
                                    <div className="bg-gray-50 border rounded-xl p-4">
                                        <p className="text-xs text-gray-500 mb-1">Total Words</p>
                                        <p className="text-2xl font-bold text-gray-900">{results.readability.words}</p>
                                        <p className="text-xs text-gray-400 mt-1">Ideal: 350 - 750 words</p>
                                    </div>
                                    <div className="bg-gray-50 border rounded-xl p-4">
                                        <p className="text-xs text-gray-500 mb-1">Total Sentences</p>
                                        <p className="text-2xl font-bold text-gray-900">{results.readability.sentences}</p>
                                        <p className="text-xs text-gray-400 mt-1">Average bullet length balanced</p>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-600 italic bg-amber-50/50 border border-amber-100 rounded-lg p-3">
                                    💡 {results.readability.interpretation}
                                </p>
                            </div>
                        )}

                        {/* Placement Suggestions */}
                        {results.placement_suggestions && results.placement_suggestions.length > 0 && (
                            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                                <h3 className="font-semibold text-gray-900 mb-3">🎯 Tailoring & Skill Placement Recommendations</h3>
                                <div className="space-y-2.5">
                                    {results.placement_suggestions.map((item: any, i: number) => (
                                        <div key={i} className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-xs text-gray-700 flex gap-3 items-start">
                                            <span className="font-semibold text-gray-900 bg-white border border-gray-200 px-2 py-1 rounded">
                                                {item.skill}
                                            </span>
                                            <p className="mt-0.5 leading-relaxed flex-1">{item.suggestion}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Tech Skills */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-semibold text-gray-900">✅ Matched Technical Skills</h3>
                                    <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full font-medium">
                                        {results.tech_skills.matched_total}/{results.tech_skills.jd_total} required
                                    </span>
                                </div>
                                {results.tech_skills.matched.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {results.tech_skills.matched.map((skill: string) => (
                                            <span key={skill} className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full text-xs font-medium">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-400 text-sm">No matching technical skills found.</p>
                                )}
                            </div>

                            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-semibold text-gray-900">❌ Missing Technical Skills</h3>
                                    <span className="text-xs bg-rose-50 text-rose-600 border border-rose-200 px-2.5 py-1 rounded-full font-medium">
                                        {results.tech_skills.missing.length} skill gaps
                                    </span>
                                </div>
                                {results.tech_skills.missing.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {results.tech_skills.missing.map((skill: string) => (
                                            <span key={skill} className="bg-rose-50 text-rose-600 border border-rose-200 px-3 py-1 rounded-full text-xs font-medium">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-emerald-600 text-sm font-medium">All required job skills matched! 🎉</p>
                                )}
                            </div>
                        </div>

                        {/* Role Keywords */}
                        {(results.role_keywords.matched.length > 0 || results.role_keywords.missing.length > 0) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                                    <h3 className="font-semibold text-gray-900 mb-4">✅ Matched Domain & Role Keywords</h3>
                                    {results.role_keywords.matched.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {results.role_keywords.matched.map((kw: string) => (
                                                <span key={kw} className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full text-xs capitalize font-medium">
                                                    {kw}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-400 text-sm">No matching role keywords found.</p>
                                    )}
                                </div>

                                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                                    <h3 className="font-semibold text-gray-900 mb-4">❌ Missing Domain Keywords</h3>
                                    {results.role_keywords.missing.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {results.role_keywords.missing.map((kw: string) => (
                                                <span key={kw} className="bg-rose-50 text-rose-600 border border-rose-200 px-3 py-1 rounded-full text-xs capitalize font-medium">
                                                    {kw}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-emerald-600 text-sm font-medium">Excellent keyword coverage! 🎉</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Resume Content Quality */}
                        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                            <h3 className="font-semibold text-gray-900 mb-4">📝 Bullet Point Quality & Metrics</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {results.quality.strengths.length > 0 && (
                                    <div>
                                        <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-2">Strengths</p>
                                        <ul className="space-y-2">
                                            {results.quality.strengths.map((s: string, i: number) => (
                                                <li key={i} className="text-xs text-gray-700 flex gap-2">
                                                    <span className="text-emerald-500 font-bold">✓</span>
                                                    <span>{s}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {results.quality.issues.length > 0 && (
                                    <div>
                                        <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider mb-2">Areas for Improvement</p>
                                        <ul className="space-y-2">
                                            {results.quality.issues.map((s: string, i: number) => (
                                                <li key={i} className="text-xs text-gray-700 flex gap-2">
                                                    <span className="text-rose-400 font-bold">✗</span>
                                                    <span>{s}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-6 mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
                                <span>Word Count: <strong className="text-gray-900">{results.quality.word_count}</strong></span>
                                <span>Impact Metrics: <strong className="text-gray-900">{results.quality.metrics_count}</strong></span>
                                <span>Power Verbs: <strong className="text-gray-900">{results.quality.action_verbs_count}</strong></span>
                            </div>
                        </div>

                        {/* ATS Essentials */}
                        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                            <h3 className="font-semibold text-gray-900 mb-4">🤖 ATS Essential Elements</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {results.ats.checks.map((check: any, i: number) => (
                                    <div key={i} className={`flex items-center gap-2 text-xs px-3 py-2.5 rounded-xl border ${check.pass ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-rose-50 border-rose-200 text-rose-600"}`}>
                                        <span className="font-bold">{check.pass ? "✓" : "✗"}</span>
                                        <span>{check.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Sections */}
                        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                            <h3 className="font-semibold text-gray-900 mb-4">📋 Resume Sections Check</h3>
                            <div className="flex flex-wrap gap-2">
                                {results.sections.found.map((s: string) => (
                                    <span key={s} className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full text-xs capitalize font-medium">
                                        ✓ {s}
                                    </span>
                                ))}
                                {results.sections.missing.map((s: string) => (
                                    <span key={s} className="bg-gray-50 text-gray-400 border border-gray-200 px-3 py-1 rounded-full text-xs capitalize">
                                        ✗ {s}
                                    </span>
                                ))}
                            </div>
                        </div>

                    </div>
                )}
            </main>
        </div>
    )
}