import { GoogleGenAI } from "@google/genai";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { Prisma } from "~/prisma-generated/client";
import {
	educationSchema,
	experienceSchema,
	projectSchema,
} from "~/schemas/resume";
import { prismaClient } from "~/utils/prisma";
import { authedProcedure, t } from "~/utils/trpcServer";

const ReEvaluationSchema = z.object({
	score: z.number().min(0).max(100),
	scoreJustification: z.string(),
});

type ResumeWithRelations = Prisma.ResumeGetPayload<{
	select: {
		education: true;
		experience: true;
		projects: true;
		email: true;
		phone: true;
		currentLocation: true;
		totalExperienceMonths: true;
		resumeSkills: {
			select: { skill: { select: { name: true } } };
		};
		questionAnswers: {
			select: { question: true; answer: true };
		};
		job: {
			select: {
				description: true;
				additionalInstructions: true;
			};
		};
	};
}>;

async function reEvaluateCandidateWithGemini(
	resumeData: Pick<
		ResumeWithRelations,
		| "education"
		| "experience"
		| "projects"
		| "email"
		| "phone"
		| "currentLocation"
		| "totalExperienceMonths"
	> & {
		skills: string[];
	},
	questionAnswers: Array<{ question: string; answer: string }>,
	jobDescription: string,
	additionalInstructions?: string | null,
) {
	if (!process.env.GEMINI_API_KEY) {
		throw new Error("GEMINI_API_KEY must be set to call Gemini.");
	}

	const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

	// Format resume data as text
	const educationText = Array.isArray(resumeData.education)
		? resumeData.education
				.map((e: unknown) => {
					if (
						typeof e === "object" &&
						e !== null &&
						"institution" in e
					) {
						const edu = e as {
							institution?: string;
							degree?: string;
							fieldOfStudy?: string;
							startDate?: string;
							endDate?: string;
						};
						return `${edu.institution || ""} - ${edu.degree || ""} ${edu.fieldOfStudy || ""} ${edu.startDate || ""} to ${edu.endDate || ""}`;
					}
					return null;
				})
				.filter((text): text is string => text !== null)
				.join("\n")
		: "";

	const experienceText = Array.isArray(resumeData.experience)
		? resumeData.experience
				.map((e: unknown) => {
					if (
						typeof e === "object" &&
						e !== null &&
						"company" in e
					) {
						const exp = e as {
							company?: string;
							title?: string;
							startDate?: string;
							endDate?: string;
							description?: string;
						};
						return `${exp.company || ""} - ${exp.title || ""} ${exp.startDate || ""} to ${exp.endDate || ""}\n${exp.description || ""}`;
					}
					return null;
				})
				.filter((text): text is string => text !== null)
				.join("\n\n")
		: "";

	const projectsText = Array.isArray(resumeData.projects)
		? resumeData.projects
				.map((p: unknown) => {
					if (typeof p === "object" && p !== null && "name" in p) {
						const proj = p as {
							name?: string;
							description?: string;
						};
						return `${proj.name || ""} - ${proj.description || ""}`;
					}
					return null;
				})
				.filter((text): text is string => text !== null)
				.join("\n\n")
		: "";

	const skillsText = resumeData.skills.join(", ");

	const resumeText = [
		educationText && `Education:\n${educationText}`,
		experienceText && `Experience:\n${experienceText}`,
		projectsText && `Projects:\n${projectsText}`,
		skillsText && `Skills: ${skillsText}`,
		resumeData.email && `Email: ${resumeData.email}`,
		resumeData.phone && `Phone: ${resumeData.phone}`,
		resumeData.currentLocation && `Location: ${resumeData.currentLocation}`,
	]
		.filter(Boolean)
		.join("\n\n");

	// Format question answers
	const answersText =
		questionAnswers.length > 0
			? questionAnswers
					.map((qa) => `Q: ${qa.question}\nA: ${qa.answer}`)
					.join("\n\n")
			: "";

	const additionalContext = additionalInstructions
		? `<additional-instructions>\n${additionalInstructions}\n</additional-instructions>`
		: "";

	const prompt = `
	Re-evaluate this candidate based on their updated resume information and their answers to interview questions.
	Return a JSON object containing:
	- score (0-100): Updated match score considering both the resume and their question answers
	- scoreJustification (2-3 sentences): Explain the score, highlighting how their answers and updated information affect their fit

	<resume>\n${resumeText}\n</resume>
	<job-description>\n${jobDescription}\n</job-description>
	${answersText ? `<candidate-answers>\n${answersText}\n</candidate-answers>` : ""}
	${additionalContext}
	`.trim();

	try {
		const resp = await ai.models.generateContent({
			model: "gemini-flash-lite-latest",
			contents: prompt,
			config: {
				responseMimeType: "application/json",
				responseJsonSchema: zodToJsonSchema(ReEvaluationSchema),
			},
		});

		const out =
			resp?.text || resp?.candidates?.map((c) => c?.content).join("\n") || "";

		if (!out) throw new Error("@google/genai returned empty output.");

		const validated = ReEvaluationSchema.parse(JSON.parse(out));

		return {
			score: Math.round(validated.score),
			scoreJustification: validated.scoreJustification,
		};
	} catch (e) {
		throw new Error(
			`@google/genai re-evaluation failed: ${(e as Error)?.message || String(e)}`,
		);
	}
}

export const createApplicationInvite = authedProcedure
	.input(
		z.object({
			resumeId: z.string().min(1),
			jobId: z.string().min(1),
			// optional expiration in hours
			expiresInHours: z.number().int().min(1).max(720).optional(),
		}),
	)
	.mutation(async ({ input }) => {
		const { resumeId, jobId, expiresInHours } = input;

		// Verify resume belongs to job & organization scope
		const resume = await prismaClient.resume.findUnique({
			where: { id: resumeId },
			select: { id: true, jobId: true, organizationId: true },
		});
		if (!resume) {
			throw new TRPCError({ code: "NOT_FOUND", message: "Resume not found" });
		}
		if (resume.jobId !== jobId) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Resume does not belong to job",
			});
		}

		// Reuse an existing active invite if present
		const existing = await prismaClient.invite.findFirst({
			where: {
				jobId,
				resumeId,
				usedAt: null,
				OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
			},
			orderBy: { createdAt: "desc" },
		});
		if (existing) {
			return {
				code: existing.code,
				expiresAt: existing.expiresAt ?? null,
				wasExisting: true,
			};
		}

		const code = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
		const expiresAt = expiresInHours
			? new Date(Date.now() + expiresInHours * 60 * 60 * 1000)
			: undefined;

		const invite = await prismaClient.invite.create({
			data: {
				code,
				jobId,
				resumeId,
				expiresAt,
			},
		});

		return {
			code: invite.code,
			expiresAt: invite.expiresAt ?? null,
			wasExisting: false,
		};
	});

export const submitApplication = t.procedure
	.input(
		z.object({
			code: z.string().min(6),
			jobId: z.string().min(1),
			// editable profile fields
			email: z.string().email().optional(),
			phone: z.string().optional(),
			education: z.array(educationSchema).optional(),
			experience: z.array(experienceSchema).optional(),
			projects: z.array(projectSchema).optional(),
			// skills by names for simplicity
			skills: z.array(z.string()).optional(),
			// answers: array of { id, answer } for existing questions
			answers: z
				.array(z.object({ id: z.string().min(1), answer: z.string().min(1) }))
				.optional(),
		}),
	)
	.mutation(async ({ input }) => {
		const { code, jobId } = input;
		const invite = await prismaClient.invite.findUnique({
			where: { code },
			select: {
				id: true,
				jobId: true,
				resumeId: true,
				expiresAt: true,
				usedAt: true,
			},
		});
		if (!invite) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "Invalid invite code",
			});
		}
		if (invite.jobId !== jobId) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "Invite not valid for this job",
			});
		}
		if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
			throw new TRPCError({ code: "UNAUTHORIZED", message: "Invite expired" });
		}
		if (invite.usedAt) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Application has already been submitted",
			});
		}

		// Update resume profile fields
		const updateData: Record<string, unknown> = {};
		if (input.email !== undefined && input.email !== "") {
			updateData.email = input.email;
		}
		if (input.phone !== undefined && input.phone !== "") {
			updateData.phone = input.phone;
		}
		if (input.education !== undefined) {
			updateData.education = input.education;
		}
		if (input.experience !== undefined) {
			updateData.experience = input.experience;
		}
		if (input.projects !== undefined) {
			updateData.projects = input.projects;
		}

		if (Object.keys(updateData).length > 0) {
			await prismaClient.resume.update({
				where: { id: invite.resumeId },
				data: updateData,
			});
		}

		// Upsert skills
		if (input.skills && input.skills.length > 0) {
			const names = Array.from(
				new Set(input.skills.map((s) => s.trim()).filter(Boolean)),
			);
			for (const name of names) {
				const skill = await prismaClient.skill.upsert({
					where: { name },
					update: {},
					create: { name },
				});
				await prismaClient.resumeSkill.upsert({
					where: {
						resumeId_skillId: { resumeId: invite.resumeId, skillId: skill.id },
					},
					update: {},
					create: { resumeId: invite.resumeId, skillId: skill.id },
				});
			}
		}

		// Update question answers
		if (input.answers && input.answers.length > 0) {
			for (const a of input.answers) {
				await prismaClient.questionAnswer.update({
					where: { id: a.id },
					data: { answer: a.answer },
				});
			}
		}

		// Re-evaluate candidate with AI after they've answered questions
		try {
			// Fetch updated resume data and job information
			const resume: ResumeWithRelations | null =
				await prismaClient.resume.findUnique({
					where: { id: invite.resumeId },
					select: {
						education: true,
						experience: true,
						projects: true,
						email: true,
						phone: true,
						currentLocation: true,
						totalExperienceMonths: true,
						resumeSkills: {
							select: { skill: { select: { name: true } } },
						},
						questionAnswers: {
							select: { question: true, answer: true },
						},
						job: {
							select: {
								description: true,
								additionalInstructions: true,
							},
						},
					},
				});

			if (resume && resume.job) {
				const skills = resume.resumeSkills
					.map((rs) => rs?.skill?.name || "")
					.filter(Boolean);

				// Get all question answers (including the ones just updated)
				const questionAnswers = resume.questionAnswers
					.filter((qa) => qa.answer && qa.answer.trim().length > 0)
					.map((qa) => ({
						question: qa.question,
						answer: qa.answer!,
					}));

				// Only re-evaluate if there are question answers
				if (questionAnswers.length > 0) {
					const evaluation = await reEvaluateCandidateWithGemini(
						{
							education: resume.education,
							experience: resume.experience,
							projects: resume.projects,
							skills,
							email: resume.email,
							phone: resume.phone,
							currentLocation: resume.currentLocation,
							totalExperienceMonths: resume.totalExperienceMonths,
						},
						questionAnswers,
						resume.job.description,
						resume.job.additionalInstructions ?? undefined,
					);

					// Update resume with new score and justification
					await prismaClient.resume.update({
						where: { id: invite.resumeId },
						data: {
							score: evaluation.score,
							scoreJustification: evaluation.scoreJustification,
						},
					});
				}
			}
		} catch (e) {
			// Log error but don't fail the submission if re-evaluation fails
			console.error(
				"Failed to re-evaluate candidate after submission:",
				(e as Error)?.message || String(e),
			);
		}

		await prismaClient.invite.update({
			where: { code },
			data: { usedAt: new Date() },
		});

		return { ok: true };
	});
