import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { prismaClient } from "~/utils/prisma";
import { authedProcedure } from "~/utils/trpcServer";

const CreateJobSchema = z.object({
	orgId: z.string(),
	title: z.string().min(1),
	description: z.string(),
});

const DeleteJobSchema = z.object({ jobId: z.string() });

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
				organizationId: input.orgId,
			},
		});

		return { job };
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
