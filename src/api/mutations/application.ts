import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
	educationSchema,
	experienceSchema,
	projectSchema,
} from "~/schemas/resume";
import { prismaClient } from "~/utils/prisma";
import { authedProcedure, t } from "~/utils/trpcServer";

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

		await prismaClient.invite.update({
			where: { code },
			data: { usedAt: new Date() },
		});

		return { ok: true };
	});
