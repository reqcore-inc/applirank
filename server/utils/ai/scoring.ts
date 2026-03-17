/**
 * AI Scoring Engine
 *
 * Evaluates candidates against job-specific scoring criteria using LLMs.
 * Produces structured, evidence-based scores with confidence ratings.
 */
import { z } from 'zod'
import { generateStructuredOutput, type ProviderConfig } from './provider'

// ─── Scoring Output Schema ────────────────────────────────────────

/** Schema for a single criterion evaluation from the LLM */
const criterionEvaluationSchema = z.object({
  criterionKey: z.string(),
  maxScore: z.number().int().min(0),
  applicantScore: z.number().int().min(0),
  confidence: z.number().min(0).max(100).int(),
  evidence: z.string(),
  strengths: z.array(z.string()),
  gaps: z.array(z.string()),
})

/** Full scoring response from the LLM */
const scoringResponseSchema = z.object({
  evaluations: z.array(criterionEvaluationSchema),
  summary: z.string(),
})

export type CriterionEvaluation = z.infer<typeof criterionEvaluationSchema>
export type ScoringResponse = z.infer<typeof scoringResponseSchema>

// ─── Criterion Definition ─────────────────────────────────────────

export interface CriterionDefinition {
  key: string
  name: string
  description: string | null
  category: string
  maxScore: number
  weight: number
}

// ─── Pre-made Criteria Templates ──────────────────────────────────

export const PREMADE_CRITERIA: Record<string, CriterionDefinition[]> = {
  standard: [
    {
      key: 'technical_skills',
      name: 'Technical Skills',
      description: 'Evaluate the candidate\'s technical competencies, tools, programming languages, and frameworks mentioned in their resume against the job requirements.',
      category: 'technical',
      maxScore: 10,
      weight: 50,
    },
    {
      key: 'relevant_experience',
      name: 'Relevant Experience',
      description: 'Assess years and quality of experience directly relevant to the role. Consider industry, company size, and scope of responsibilities.',
      category: 'experience',
      maxScore: 10,
      weight: 50,
    },
    {
      key: 'education_fit',
      name: 'Education & Certifications',
      description: 'Evaluate educational background and professional certifications relevant to the position requirements.',
      category: 'education',
      maxScore: 10,
      weight: 30,
    },
  ],
  technical: [
    {
      key: 'core_tech_stack',
      name: 'Core Tech Stack Match',
      description: 'How well the candidate\'s technical skills match the primary technologies required for this role.',
      category: 'technical',
      maxScore: 10,
      weight: 70,
    },
    {
      key: 'system_design',
      name: 'System Design & Architecture',
      description: 'Evidence of system design experience, scalability thinking, and architectural decision-making.',
      category: 'technical',
      maxScore: 10,
      weight: 50,
    },
    {
      key: 'engineering_practices',
      name: 'Engineering Practices',
      description: 'Testing, CI/CD, code review, documentation, and software development lifecycle experience.',
      category: 'technical',
      maxScore: 10,
      weight: 40,
    },
    {
      key: 'relevant_experience',
      name: 'Relevant Experience',
      description: 'Years and depth of experience in similar roles, projects, or domains.',
      category: 'experience',
      maxScore: 10,
      weight: 50,
    },
    {
      key: 'leadership_collab',
      name: 'Leadership & Collaboration',
      description: 'Evidence of mentoring, tech leadership, cross-team collaboration, and communication skills.',
      category: 'soft_skills',
      maxScore: 10,
      weight: 30,
    },
  ],
  non_technical: [
    {
      key: 'relevant_experience',
      name: 'Relevant Experience',
      description: 'Depth and breadth of experience directly applicable to the role responsibilities.',
      category: 'experience',
      maxScore: 10,
      weight: 60,
    },
    {
      key: 'communication',
      name: 'Communication Skills',
      description: 'Evidence of written and verbal communication ability from resume quality, cover letter, and described accomplishments.',
      category: 'soft_skills',
      maxScore: 10,
      weight: 50,
    },
    {
      key: 'domain_knowledge',
      name: 'Domain Knowledge',
      description: 'Relevant industry or domain expertise that demonstrates understanding of the business context.',
      category: 'experience',
      maxScore: 10,
      weight: 40,
    },
    {
      key: 'education_fit',
      name: 'Education & Certifications',
      description: 'Educational background and certifications relevant to the position.',
      category: 'education',
      maxScore: 10,
      weight: 30,
    },
    {
      key: 'culture_fit',
      name: 'Culture & Values Alignment',
      description: 'Indicators of alignment with company values, work style, and team culture based on career trajectory and interests.',
      category: 'culture',
      maxScore: 10,
      weight: 30,
    },
  ],
}

// ─── Rubric Generation from Job Description ───────────────────────

const generatedCriteriaSchema = z.object({
  criteria: z.array(z.object({
    key: z.string(),
    name: z.string(),
    description: z.string(),
    category: z.enum(['technical', 'experience', 'soft_skills', 'education', 'culture', 'custom']),
    maxScore: z.number().int().min(1).max(10).describe('Always use 10'),
    suggestedWeight: z.number().int().min(10).max(100),
  })),
})

/**
 * Use AI to generate scoring criteria from a job description.
 * Returns 4–6 criteria tailored to the specific role.
 */
export async function generateCriteriaFromDescription(
  config: ProviderConfig,
  jobTitle: string,
  jobDescription: string,
): Promise<CriterionDefinition[]> {
  const result = await generateStructuredOutput(config, {
    system: `You are an expert HR analyst specializing in creating objective, unbiased candidate evaluation criteria.
Your task is to analyze a job description and create 4–6 measurable scoring criteria.

Rules:
- Each criterion must be specific and measurable from a resume/CV
- Avoid criteria that could introduce bias (age, gender, ethnicity, disability)
- Focus on skills, experience, and qualifications that are directly relevant to the role
- Use clear, professional language
- Each key must be unique, lowercase, and use underscores (e.g. "react_expertise")
- Set suggestedWeight higher for more critical criteria (10–100 scale)`,
    prompt: `Job Title: ${jobTitle}\n\nJob Description:\n${jobDescription}`,
    schema: generatedCriteriaSchema,
    schemaName: 'GeneratedCriteria',
    schemaDescription: 'Scoring criteria generated from job description',
  })

  return result.object.criteria.map((c, i) => ({
    key: c.key,
    name: c.name,
    description: c.description,
    category: c.category,
    maxScore: c.maxScore,
    weight: c.suggestedWeight,
  }))
}

// ─── Score Application ────────────────────────────────────────────

/**
 * Score a single application against the job's scoring criteria.
 * Returns structured evaluations for each criterion.
 */
export async function scoreApplication(
  config: ProviderConfig,
  params: {
    jobTitle: string
    jobDescription: string
    criteria: CriterionDefinition[]
    resumeText: string
    coverLetterText?: string | null
    applicationNotes?: string | null
  },
): Promise<{ scoring: ScoringResponse; usage: { promptTokens: number; completionTokens: number } }> {
  const criteriaBlock = params.criteria
    .map((c, i) => `${i + 1}. **${c.name}** (key: "${c.key}", max: ${c.maxScore})\n   ${c.description ?? 'No description provided.'}`)
    .join('\n\n')

  const candidateInfo = [
    `RESUME:\n${params.resumeText}`,
    params.coverLetterText ? `\nCOVER LETTER:\n${params.coverLetterText}` : '',
    params.applicationNotes ? `\nAPPLICATION NOTES:\n${params.applicationNotes}` : '',
  ].filter(Boolean).join('\n')

  const result = await generateStructuredOutput(config, {
    system: `You are an expert, unbiased candidate evaluator for an applicant tracking system.
Your task is to objectively evaluate a candidate against specific scoring criteria for a job.

IMPORTANT RULES:
- Score ONLY based on evidence found in the provided materials (resume, cover letter, notes)
- If information for a criterion is missing, give a low score and note it in gaps
- Be fair and consistent — avoid bias based on name, gender, age, or background
- Confidence reflects how much relevant information was available (0–100)
- Evidence must cite specific details from the candidate's materials
- Each strength and gap must be a single, specific statement
- applicantScore must not exceed maxScore for each criterion
- Provide a brief summary of the overall evaluation`,
    prompt: `JOB TITLE: ${params.jobTitle}

JOB DESCRIPTION:
${params.jobDescription}

SCORING CRITERIA:
${criteriaBlock}

CANDIDATE MATERIALS:
${candidateInfo}

Evaluate this candidate against each criterion. Return your evaluation.`,
    schema: scoringResponseSchema,
    schemaName: 'CandidateScoring',
    schemaDescription: 'Structured candidate evaluation with per-criterion scores',
  })

  // Clamp applicantScore to maxScore — LLMs may occasionally exceed the maximum
  for (const evaluation of result.object.evaluations) {
    evaluation.applicantScore = Math.min(evaluation.applicantScore, evaluation.maxScore)
  }

  return {
    scoring: result.object,
    usage: result.usage,
  }
}

/**
 * Compute a weighted composite score (0–100) from individual criterion scores.
 */
export function computeCompositeScore(
  criteria: CriterionDefinition[],
  evaluations: CriterionEvaluation[],
): number {
  let totalWeightedScore = 0
  let totalWeight = 0

  for (const criterion of criteria) {
    const evaluation = evaluations.find(e => e.criterionKey === criterion.key)
    if (!evaluation) continue

    const normalizedScore = (evaluation.applicantScore / evaluation.maxScore) * 100
    totalWeightedScore += normalizedScore * criterion.weight
    totalWeight += criterion.weight
  }

  if (totalWeight === 0) return 0
  return Math.round(totalWeightedScore / totalWeight)
}
