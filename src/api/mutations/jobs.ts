import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { prismaClient } from "~/utils/prisma";
import { authedProcedure } from "~/utils/trpcServer";

const CreateJobSchema = z.object({
	orgId: z.string(),
	title: z.string().min(1),
	description: z.string(),
	additionalInstructions: z.string().optional(),
	suggestedQuestions: z.string().optional(),
});

const DeleteJobSchema = z.object({ jobId: z.string() });

const UpdateJobSchema = z.object({
	orgId: z.string(),
	jobId: z.string(),
	title: z.string().min(1).optional(),
	description: z.string().min(1).optional(),
	additionalInstructions: z.string().optional(),
	suggestedQuestions: z.string().optional(),
});

export const createJob = authedProcedure
	.input(CreateJobSchema)
	.mutation(async ({ ctx, input }) => {
		const user = ctx.user;

		const membership = await prismaClient.organizationUser.findUnique({
			where: {
				userId_organizationId: {
					userId: user.id,
					organizationId: input.orgId,
				},
			},
		});

		if (!membership || !membership.isAdmin) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "Not authorized",
			});
		}

		const job = await prismaClient.job.create({
			data: {
				title: input.title,
				description: input.description,
				additionalInstructions: input.additionalInstructions,
				suggestedQuestions: input.suggestedQuestions,
				organizationId: input.orgId,
			},
		});

		return { job };
	});

export const updateJob = authedProcedure
	.input(UpdateJobSchema)
	.mutation(async ({ ctx, input }) => {
		const user = ctx.user;

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
					userId: user.id,
					organizationId: job.organizationId,
				},
			},
		});

		if (!membership || !membership.isAdmin) {
			throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
		}

		const data: {
			title?: string;
			description?: string;
			additionalInstructions?: string | null;
			suggestedQuestions?: string | null;
		} = {};

		if (input.title !== undefined) data.title = input.title;
		if (input.description !== undefined) data.description = input.description;
		if (input.additionalInstructions !== undefined)
			data.additionalInstructions = input.additionalInstructions;
		if (input.suggestedQuestions !== undefined)
			data.suggestedQuestions = input.suggestedQuestions;

		const updated = await prismaClient.job.update({
			where: { id: job.id },
			data,
		});

		return { job: updated };
	});

export const deleteJob = authedProcedure
	.input(DeleteJobSchema)
	.mutation(async ({ ctx, input }) => {
		const user = ctx.user;

		const job = await prismaClient.job.findUnique({
			where: { id: input.jobId },
		});
		if (!job) {
			throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
		}

		const membership = await prismaClient.organizationUser.findUnique({
			where: {
				userId_organizationId: {
					userId: user.id,
					organizationId: job.organizationId,
				},
			},
		});

		if (!membership || !membership.isAdmin) {
			throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
		}

		await prismaClient.job.delete({ where: { id: input.jobId } });
		return { ok: true };
	});
