import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { prismaClient } from "~/utils/prisma";
import { authedProcedure, t } from "~/utils/trpcServer";

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
			include: {
				organization: true,
				resumes: {
					include: {
						user: true,
						questionAnswers: true,
						resumeSkills: { include: { skill: true } },
					},
				},
			},
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

// Public query to get job listing details (without sensitive fields)
export const getPublicJobListing = t.procedure
	.input(z.object({ orgId: z.string(), jobId: z.string() }))
	.query(async ({ input }) => {
		const job = await prismaClient.job.findUnique({
			where: { id: input.jobId },
			select: {
				id: true,
				title: true,
				description: true,
				createdAt: true,
				organizationId: true,
				organization: {
					select: {
						id: true,
						name: true,
					},
				},
			},
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

		return { job };
	});

// Public query to list all jobs for an organization
export const listPublicJobs = t.procedure
	.input(z.object({ orgId: z.string() }))
	.query(async ({ input }) => {
		const jobs = await prismaClient.job.findMany({
			where: { organizationId: input.orgId },
			select: {
				id: true,
				title: true,
				description: true,
				createdAt: true,
				organization: {
					select: {
						id: true,
						name: true,
					},
				},
			},
			orderBy: { createdAt: "desc" },
		});

		return { jobs };
	});
