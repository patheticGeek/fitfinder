import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { prismaClient } from "~/utils/prisma";
import { authedProcedure } from "~/utils/trpcServer";

const GetJobCandidatesSchema = z.object({
	orgId: z.string(),
	jobId: z.string(),
});

const GetJobSchema = z.object({
	orgId: z.string(),
	jobId: z.string(),
});

export const listJobs = authedProcedure.query(async () => {
	const jobs = await prismaClient.job.findMany({
		include: { organization: true },
		orderBy: { createdAt: "desc" },
	});

	return { jobs };
});

export const getJobCandidates = authedProcedure
	.input(GetJobCandidatesSchema)
	.query(async ({ input }) => {
		const job = await prismaClient.job.findUnique({
			where: { id: input.jobId },
			include: { resumes: { include: { user: true } }, organization: true },
		});

		if (!job) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Job not found",
			});
		}

		if (job.organizationId !== input.orgId) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "Job does not belong to organization",
			});
		}

		return { job };
	});

export const getJob = authedProcedure
	.input(GetJobSchema)
	.query(async ({ ctx, input }) => {
		const job = await prismaClient.job.findUnique({
			where: { id: input.jobId },
		});

		if (!job) {
			throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
		}

		if (job.organizationId !== input.orgId) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "Job does not belong to organization",
			});
		}

		const membership = await prismaClient.organizationUser.findUnique({
			where: {
				userId_organizationId: {
					userId: ctx.user.id,
					organizationId: job.organizationId,
				},
			},
		});

		if (!membership || !membership.isAdmin) {
			throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
		}

		return { job };
	});
