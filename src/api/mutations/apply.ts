import { GoogleGenAI } from "@google/genai";
import { TRPCError } from "@trpc/server";
import pdfParse from "pdf-parse";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { Resume } from "~/prisma-generated/client";
import {
	educationSchema,
	experienceSchema,
	interviewQuestionSchema,
	projectSchema,
	skillSchema,
} from "~/schemas/resume";
import { prismaClient } from "~/utils/prisma";
import { authedProcedure, t } from "~/utils/trpcServer";

const ApplySchema = z.object({
	fileName: z.string().min(1),
	mimeType: z.string().regex(/^application\/pdf$/i),
	contentBase64: z.string().min(20),
	jobId: z.string().min(1),
	orgId: z.string().optional(),
});

const GeminiStructuredSchema = z.object({
	score: z.number().min(0).max(100),
	scoreJustification: z.string(),
	interviewQuestions: z.array(interviewQuestionSchema).optional(),
	education: z.array(educationSchema).optional(),
	experience: z.array(experienceSchema).optional(),
	projects: z.array(projectSchema).optional(),
	skills: z.array(skillSchema).optional(),
	currentLocation: z.string().optional(),
	totalExperienceMonths: z.number().int().min(0).optional(),
	email: z.string().email().optional(),
	phone: z.string().optional(),
});

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
	- education (array of entries: do not change or paraphrase - use exact text from resume)
	- experience (array of entries: do not change or paraphrase - use exact text from resume)
	- projects (array of entries: don't mention projects done in experience, instead side projects or personal projects, do not change or paraphrase - use exact text from resume)
	- skills (array of entries: name, optional level one of beginner|intermediate|expert)
	- currentLocation (optional, if no location mentioned explicitly - use the last experience/jobs's location)
	- totalExperienceMonths (optional integer)
	- email (optional, extracted candidate email address)
	- phone (optional, extracted candidate phone number)

	Make sure dates are in the format YYYY-MM-DD and are valid dates or is exactly "Present" for current. If no day is given, use the first day of the month. If dates are not available in the resume, omit them (do not include the field).

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

export const submitResume = authedProcedure
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

			let resumeRecord: Resume | null = null;
			try {
				// Persist resume first
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
						addedByUserId: user.id,
						jobId: jobId ?? undefined,
						organizationId: orgId ?? undefined,
					},
				});

				const resumeId = resumeRecord.id;

				// Create questions separately
				if (
					geminiOut.interviewQuestions &&
					geminiOut.interviewQuestions.length > 0
				) {
					await prismaClient.questionAnswer.createMany({
						data: geminiOut.interviewQuestions.map((q) => ({
							resumeId,
							question: q.text,
							answer: null,
						})),
					});
				}

				// Create skills separately
				const skillNames = Array.from(
					new Set(
						(geminiOut.skills ?? [])
							.map((s) => (s.name || "").trim())
							.filter((name) => name.length > 0),
					),
				);

				for (const skillName of skillNames) {
					const skill = await prismaClient.skill.upsert({
						where: { name: skillName },
						update: {},
						create: { name: skillName },
					});

					await prismaClient.resumeSkill.create({
						data: {
							resumeId,
							skillId: skill.id,
						},
					});
				}
			} catch (e) {
				const errMsg = (e as Error)?.message || String(e);
				console.error(
					"Failed to persist resume record:",
					errMsg,
					"\nFull error:",
					e,
				);
				// Re-throw so caller sees the error
				throw e;
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

// Public mutation to apply to a job (no auth required, evaluates immediately)
// Note: additionalInstructions and suggestedQuestions are used for AI evaluation but NOT returned to frontend
export const applyToJob = t.procedure
	.input(
		z.object({
			fileName: z.string().min(1),
			mimeType: z.string().regex(/^application\/pdf$/i),
			contentBase64: z.string().min(20),
			jobId: z.string().min(1),
		}),
	)
	.mutation(async ({ input }) => {
		try {
			const { fileName, contentBase64, jobId } = input;

			// Fetch the job to get description and AI evaluation fields
			const job = await prismaClient.job.findUnique({
				where: { id: jobId },
				select: {
					id: true,
					description: true,
					organizationId: true,
					additionalInstructions: true,
					suggestedQuestions: true,
				},
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

			// Call Gemini WITH additionalInstructions and suggestedQuestions for better evaluation
			const geminiOut = await generateMatchAndQuestionsWithGemini(
				text,
				job.description,
				job.additionalInstructions ?? undefined,
				job.suggestedQuestions ?? undefined,
			);

			const id = crypto.randomUUID();

			let resumeRecord: Resume | null = null;
			try {
				// Persist resume without a user (public application)
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
						addedByUserId: null, // Public application, no user
						jobId: jobId,
						organizationId: job.organizationId,
					},
				});

				const resumeId = resumeRecord.id;

				// Create questions separately
				if (
					geminiOut.interviewQuestions &&
					geminiOut.interviewQuestions.length > 0
				) {
					await prismaClient.questionAnswer.createMany({
						data: geminiOut.interviewQuestions.map((q) => ({
							resumeId,
							question: q.text,
							answer: null,
						})),
					});
				}

				// Create skills separately
				const skillNames = Array.from(
					new Set(
						(geminiOut.skills ?? [])
							.map((s) => (s.name || "").trim())
							.filter((name) => name.length > 0),
					),
				);

				for (const skillName of skillNames) {
					const skill = await prismaClient.skill.upsert({
						where: { name: skillName },
						update: {},
						create: { name: skillName },
					});

					await prismaClient.resumeSkill.create({
						data: {
							resumeId,
							skillId: skill.id,
						},
					});
				}

				// Create an invite for the candidate to complete their application
				const inviteCode = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
				const invite = await prismaClient.invite.create({
					data: {
						code: inviteCode,
						jobId,
						resumeId,
						// No expiration for public applications
						expiresAt: null,
					},
				});

				return {
					id,
					questions: geminiOut.interviewQuestions,
					jobId: jobId,
					orgId: job.organizationId,
					resumeId: resumeRecord?.id ?? null,
					inviteCode: invite.code,
					education: geminiOut.education,
					experience: geminiOut.experience,
					projects: geminiOut.projects,
					skills: geminiOut.skills,
					currentLocation: geminiOut.currentLocation ?? null,
					totalExperienceMonths: geminiOut.totalExperienceMonths ?? null,
					email: geminiOut.email ?? null,
					phone: geminiOut.phone ?? null,
				};
			} catch (e) {
				const errMsg = (e as Error)?.message || String(e);
				console.error(
					"Failed to persist resume record:",
					errMsg,
					"\nFull error:",
					e,
				);
				// Re-throw so caller sees the error
				throw e;
			}
		} catch (err) {
			const message = (err as Error)?.message || String(err) || "Unknown error";
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message,
			});
		}
	});
