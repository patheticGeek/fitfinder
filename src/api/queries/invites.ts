import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { prismaClient } from "~/utils/prisma";
import { t } from "~/utils/trpcServer";

export const getInviteData = t.procedure
	.input(z.object({ code: z.string().min(6), jobId: z.string().min(1) }))
	.query(async ({ input }) => {
		const invite = await prismaClient.invite.findUnique({
			where: { code: input.code },
			select: { id: true, jobId: true, resumeId: true, expiresAt: true },
		});
		if (!invite) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "Invalid invite code",
			});
		}
		if (invite.jobId !== input.jobId) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "Invite does not match job",
			});
		}
		if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
			throw new TRPCError({ code: "UNAUTHORIZED", message: "Invite expired" });
		}

		const resume = await prismaClient.resume.findUnique({
			where: { id: invite.resumeId },
			select: {
				id: true,
				email: true,
				phone: true,
				education: true,
				experience: true,
				projects: true,
				resumeSkills: {
					select: { id: true, skill: { select: { name: true } } },
				},
				questionAnswers: { select: { id: true, question: true, answer: true } },
				job: {
					select: {
						id: true,
						title: true,
						suggestedQuestions: true,
						description: true,
					},
				},
			},
		});
		if (!resume) {
			throw new TRPCError({ code: "NOT_FOUND", message: "Resume not found" });
		}

		return { inviteCode: input.code, resume };
	});
