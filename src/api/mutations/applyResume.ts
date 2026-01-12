import { GoogleGenAI } from "@google/genai";
import { TRPCError } from "@trpc/server";
import pdfParse from "pdf-parse";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { prismaClient } from "~/utils/prisma";
import { authedProcedure } from "~/utils/trpcServer";

const ApplySchema = z.object({
	fileName: z.string().min(1),
	mimeType: z.string().regex(/^application\/pdf$/i),
	contentBase64: z.string().min(20),
	jobId: z.string().min(1),
	orgId: z.string().optional(),
});

export const InterviewQuestionSchema = z.object({
	text: z.string(),
	topic: z.string().optional(),
	confidence: z.number().min(0).max(1).optional(),
	correctAnswer: z.string().optional(),
});

export const EducationSchema = z.object({
	institution: z.string(),
	degree: z.string().optional(),
	field: z.string().optional(),
	startDate: z.string().optional(),
	endDate: z.string().optional(),
	location: z.string().optional(),
});

export const ExperienceSchema = z.object({
	company: z.string(),
	title: z.string().optional(),
	startDate: z.string().optional(),
	endDate: z.string().optional(),
	summary: z.string().optional(),
	location: z.string().optional(),
});

export const ProjectSchema = z.object({
	name: z.string(),
	description: z.string().optional(),
	technologies: z.array(z.string()).optional(),
});

export const SkillSchema = z.object({
	name: z.string(),
	level: z.enum(["beginner", "intermediate", "expert"]).optional(),
});

const GeminiStructuredSchema = z.object({
	score: z.number().min(0).max(100),
	scoreJustification: z.string(),
	interviewQuestions: z.array(InterviewQuestionSchema).optional(),
	education: z.array(EducationSchema).optional(),
	experience: z.array(ExperienceSchema).optional(),
	projects: z.array(ProjectSchema).optional(),
	skills: z.array(SkillSchema).optional(),
	currentLocation: z.string().optional(),
	totalExperienceMonths: z.number().int().min(0).optional(),
	email: z.string().email().optional(),
	phone: z.string().optional(),
});

export type InterviewQuestion = z.infer<typeof InterviewQuestionSchema>;
export type Education = z.infer<typeof EducationSchema>;
export type Experience = z.infer<typeof ExperienceSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type Skill = z.infer<typeof SkillSchema>;

async function generateMatchAndQuestionsWithGemini(
	resumeText: string,
	jobDescription: string,
	additionalInstructions?: string,
	suggestedQuestions?: string,
) {
	if (!process.env.GEMINI_API_KEY) {
		throw new Error("GEMINI_API_KEY must be set to call Gemini.");
	}

	const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

	const additionalContext = additionalInstructions
		? `<additional-instructions>\n${additionalInstructions}\n</additional-instructions>`
		: "";

	const suggestedQuestionsContext = suggestedQuestions
		? `<suggested-questions>\n${suggestedQuestions}\n</suggested-questions>`
		: "";

	const prompt = `
	Based on the following resume and job description, return a JSON object containing:
	- score (0-100)
	- scoreJustification (2-3 sentences)
	- interviewQuestions (array of ~5 short questions with optional topic, confidence [0-1], and optional correctAnswer)
	- education (array of entries: institution, optional degree, field, startDate, endDate, location, do not change or paraphrase - use exact text from resume)
	- experience (array of entries: company, optional title, startDate, endDate, summary, location,  do not change or paraphrase - use exact text from resume)
	- projects (array of entries: name, optional description, technologies[], these are side projects, don't mention projects done in experience, do not change or paraphrase - use exact text from resume)
	- skills (array of entries: name, optional level one of beginner|intermediate|expert)
	- currentLocation (optional, if no location mentioned explicitly - use the ast job's location)
	- totalExperienceMonths (optional integer)
	- email (optional, extracted candidate email address)
	- phone (optional, extracted candidate phone number)

	<resume>\n${resumeText}\n</resume>
	<job-description>\n${jobDescription}\n</job-description>
	${additionalContext}
	${suggestedQuestionsContext}
	`.trim();

	try {
		const resp = await ai.models.generateContent({
			model: "gemini-flash-lite-latest",
			contents: prompt,
			config: {
				responseMimeType: "application/json",
				responseJsonSchema: zodToJsonSchema(GeminiStructuredSchema),
			},
		});

		const out =
			resp?.text || resp?.candidates?.map((c) => c?.content).join("\n") || "";

		if (!out) throw new Error("@google/genai returned empty output.");

		const validated = GeminiStructuredSchema.parse(JSON.parse(out));

		const interviewQuestions = (validated.interviewQuestions ?? []).map(
			(q) => ({
				text: String(q.text),
				topic: q.topic ? String(q.topic) : undefined,
				confidence: typeof q.confidence === "number" ? q.confidence : undefined,
				correctAnswer: q.correctAnswer ? String(q.correctAnswer) : undefined,
			}),
		);

		return {
			score: Math.round(validated.score),
			scoreJustification: validated.scoreJustification,
			interviewQuestions,
			education: validated.education ?? [],
			experience: validated.experience ?? [],
			projects: validated.projects ?? [],
			skills: validated.skills ?? [],
			currentLocation: validated.currentLocation,
			totalExperienceMonths: validated.totalExperienceMonths,
			email: validated.email,
			phone: validated.phone,
		};
	} catch (e) {
		throw new Error(
			`@google/genai invocation/parse failed: ${(e as Error)?.message || String(e)}`,
		);
	}
}

export const applyResume = authedProcedure
	.input(ApplySchema)
	.mutation(async ({ ctx, input }) => {
		try {
			const { fileName, contentBase64, jobId, orgId } = input;

			const user = ctx.user;

			// Fetch the job to get description and additional fields
			const job = await prismaClient.job.findUnique({
				where: { id: jobId },
			});

			if (!job) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Job not found",
				});
			}

			const buf = Buffer.from(contentBase64, "base64");
			const pdf = await pdfParse(buf);
			const text = (pdf.text || "").replace(/\s+/g, " ").trim();

			const geminiOut = await generateMatchAndQuestionsWithGemini(
				text,
				job.description,
				job.additionalInstructions ?? undefined,
				job.suggestedQuestions ?? undefined,
			);

			const id = crypto.randomUUID();

			let resumeRecord = null;
			try {
				// Persist resume and normalized data in one go
				resumeRecord = await prismaClient.resume.create({
					data: {
						fileName,
						score: geminiOut.score,
						scoreJustification: geminiOut.scoreJustification,
						education: geminiOut.education,
						experience: geminiOut.experience,
						projects: geminiOut.projects,
						currentLocation: geminiOut.currentLocation ?? undefined,
						totalExperienceMonths: geminiOut.totalExperienceMonths ?? undefined,
						email: geminiOut.email ?? undefined,
						phone: geminiOut.phone ?? undefined,
						userId: user.id,
						jobId: jobId ?? undefined,
						organizationId: orgId ?? undefined,
						// Create initial questions as QuestionAnswer rows (answer left null)
						questionAnswers: {
							create: (geminiOut.interviewQuestions ?? []).map((q) => ({
								question: q.text,
								answer: null,
							})),
						},
						// Link skills via normalized Skill / ResumeSkill tables
						resumeSkills: {
							create: Array.from(
								new Set(
									(geminiOut.skills ?? [])
										.map((s) => (s.name || "").trim())
										.filter((name) => name.length > 0),
								),
							).map((name) => ({
								// Create or connect Skill by unique name
								skill: {
									connectOrCreate: {
										where: { name },
										create: { name },
									},
								},
							})),
						},
					},
				});
			} catch (e) {
				console.warn(
					"Failed to persist resume record:",
					(e as Error)?.message || e,
				);
			}

			return {
				id,
				score: geminiOut.score,
				scoreJustification: geminiOut.scoreJustification,
				questions: geminiOut.interviewQuestions, // keep response stable
				jobId: jobId ?? null,
				orgId: orgId ?? null,
				resumeId: resumeRecord?.id ?? null,
				// expose structured fields optionally for UI/inspections
				education: geminiOut.education,
				experience: geminiOut.experience,
				projects: geminiOut.projects,
				skills: geminiOut.skills,
				currentLocation: geminiOut.currentLocation ?? null,
				totalExperienceMonths: geminiOut.totalExperienceMonths ?? null,
				email: geminiOut.email ?? null,
				phone: geminiOut.phone ?? null,
			};
		} catch (err) {
			const message = (err as Error)?.message || String(err) || "Unknown error";
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message,
			});
		}
	});
