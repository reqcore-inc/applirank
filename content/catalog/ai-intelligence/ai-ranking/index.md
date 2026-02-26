---
title: AI Candidate Ranking (Glass Box)
status: planned
priority: high
complexity: XL
competitors:
  greenhouse: okay
  lever: okay
  ashby: good
  workable: okay
  opencats: poor
---

AI-powered candidate ranking that matches job requirements against candidate skills — and shows its reasoning for every score. This is the **Glass Box** principle: no black-box algorithms making decisions about people.

## What it solves

Recruiters reviewing 200+ applications for a single role need help identifying the best candidates quickly. AI ranking can do this — but only if the recruiter can trust the results. Today's commercial ATS platforms rank candidates with proprietary algorithms that provide no explanation. Applirank gives you the score **and** the proof.

## Planned implementation

1. **Ranking criteria schema** — Configurable per-job criteria that define what "good" looks like (required skills, experience years, education, certifications)
2. **AI matching engine** — Compare job requirements against parsed candidate data, producing a match score
3. **Matching Logic summary** — A visible, per-candidate explanation showing which criteria matched, which didn't, and why
4. **Highlighted skill matches** — Visual indicators on pipeline cards showing matched vs. missing skills
5. **Sort and filter by AI score** — Rank the pipeline by match quality with one click

## Glass Box vs. Black Box

| Aspect | Glass Box (Applirank) | Black Box (Incumbents) |
|--------|----------------------|----------------------|
| Score visible | ✅ Always | ✅ Usually |
| Reasoning shown | ✅ Per-criterion breakdown | ❌ "AI confidence score" |
| Criteria editable | ✅ Per-job configuration | ❌ Fixed algorithm |
| Bias auditable | ✅ Full logic exposed | ❌ Trust the vendor |
| EU AI Act compliant | ✅ By design | ⚠️ Unclear |

## Design notes

The matching logic summary will appear in the candidate detail sidebar, directly below the candidate's parsed resume data. Each criterion shows a green/yellow/red indicator with a one-line explanation (e.g., "5+ years Python — candidate has 7 years").
