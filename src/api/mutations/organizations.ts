import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { prismaClient } from "~/utils/prisma";
import { authedProcedure } from "~/utils/trpcServer";

const CreateOrgSchema = z.object({ name: z.string().min(1) });

const AddAdminSchema = z.object({
	orgId: z.string(),
	userEmail: z.string().email(),
});

const DeleteOrgSchema = z.object({ orgId: z.string() });

export const createOrganization = authedProcedure
	.input(CreateOrgSchema)
	.mutation(async ({ ctx, input }) => {
		const user = ctx.user;

		const org = await prismaClient.organization.create({
			data: {
				name: input.name,
				members: {
					create: {
						user: { connect: { id: user.id } },
						isAdmin: true,
					},
				},
			},
		});

		return { org };
	});

export const addAdmin = authedProcedure
	.input(AddAdminSchema)
	.mutation(async ({ ctx, input }) => {
		const user = ctx.user;

		const membership = await prismaClient.organizationUser.findUnique({
			where: {
				userId_organizationId: { userId: user.id, organizationId: input.orgId },
			},
		});

		if (!membership || !membership.isAdmin) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "Not authorized",
			});
		}

		const target = await prismaClient.user.findUnique({
			where: { email: input.userEmail },
		});

		if (!target) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Target user not found",
			});
		}

		await prismaClient.organizationUser.upsert({
			where: {
				userId_organizationId: {
					userId: target.id,
					organizationId: input.orgId,
				},
			},
			create: {
				userId: target.id,
				organizationId: input.orgId,
				isAdmin: true,
			},
			update: { isAdmin: true },
		});

		return { ok: true };
	});

export const deleteOrg = authedProcedure
	.input(DeleteOrgSchema)
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
			throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
		}

		await prismaClient.organization.delete({ where: { id: input.orgId } });
		return { ok: true };
	});
