import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { prismaClient } from "~/utils/prisma";
import { authedProcedure } from "~/utils/trpcServer";

const GetOrganizationSchema = z.object({ orgId: z.string() });

export const listOrganizations = authedProcedure.query(async ({ ctx }) => {
	const user = ctx.user;

	const orgs = await prismaClient.organization.findMany({
		where: {
			members: { some: { userId: user.id } },
		},
		include: {
			members: { include: { user: true } },
			jobs: true,
		},
	});

	return { orgs };
});

export const getOrganization = authedProcedure
	.input(GetOrganizationSchema)
	.query(async ({ ctx, input }) => {
		const user = ctx.user;

		const membership = await prismaClient.organizationUser.findUnique({
			where: {
				userId_organizationId: {
					userId: user.id,
					organizationId: input.orgId,
				},
			},
		});

		if (!membership) {
			throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
		}

		const org = await prismaClient.organization.findUnique({
			where: { id: input.orgId },
			include: {
				members: { include: { user: true } },
				jobs: { include: { resumes: { include: { user: true } } } },
				resumes: true,
			},
		});

		if (!org) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Organization not found",
			});
		}

		return { org };
	});
const GetOrganizationCandidatesSchema = z.object({ orgId: z.string() });

export const getOrganizationCandidates = authedProcedure
	.input(GetOrganizationCandidatesSchema)
	.query(async ({ ctx, input }) => {
		const user = ctx.user;

		const membership = await prismaClient.organizationUser.findUnique({
			where: {
				userId_organizationId: {
					userId: user.id,
					organizationId: input.orgId,
				},
			},
		});

		if (!membership) {
			throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
		}

		const resumes = await prismaClient.resume.findMany({
			where: {
				organizationId: input.orgId,
			},
			include: {
				user: true,
				job: true,
				questionAnswers: true,
				resumeSkills: { include: { skill: true } },
			},
			orderBy: {
				createdAt: "desc",
			},
		});

		return { resumes };
	});
