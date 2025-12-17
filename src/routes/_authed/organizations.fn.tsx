import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prismaClient } from "~/utils/prisma";
import { getAppSession } from "~/utils/session";

const CreateOrgSchema = z.object({ name: z.string().min(1) });
const AddAdminSchema = z.object({
	orgId: z.string(),
	userEmail: z.string().email(),
});
const CreateJobSchema = z.object({
	orgId: z.string(),
	title: z.string().min(1),
	description: z.string(),
});

export const createOrganizationFn = createServerFn({ method: "POST" })
	.inputValidator(CreateOrgSchema.parse)
	.handler(async ({ data }) => {
		const session = await getAppSession();
		const userEmail = session?.data?.userEmail;
		if (!userEmail) return { error: true, message: "Not authenticated" };

		const user = await prismaClient.user.findUnique({
			where: { email: userEmail },
		});
		if (!user) return { error: true, message: "User not found" };

		const org = await prismaClient.organization.create({
			data: {
				name: data.name,
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

export const listOrganizationsFn = createServerFn({ method: "GET" }).handler(
	async () => {
		const session = await getAppSession();
		const userEmail = session?.data?.userEmail;
		if (!userEmail) return { error: true, message: "Not authenticated" };

		const user = await prismaClient.user.findUnique({
			where: { email: userEmail },
		});
		if (!user) return { error: true, message: "User not found" };

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
	},
);

export const addAdminFn = createServerFn({ method: "POST" })
	.inputValidator(AddAdminSchema.parse)
	.handler(async ({ data }) => {
		const session = await getAppSession();
		const userEmail = session?.data?.userEmail;
		if (!userEmail) return { error: true, message: "Not authenticated" };

		const user = await prismaClient.user.findUnique({
			where: { email: userEmail },
		});
		if (!user) return { error: true, message: "User not found" };

		// Check if requester is admin of the org
		const membership = await prismaClient.organizationUser.findUnique({
			where: {
				userId_organizationId: { userId: user.id, organizationId: data.orgId },
			},
		});
		if (!membership || !membership.isAdmin)
			return { error: true, message: "Not authorized" };

		const target = await prismaClient.user.findUnique({
			where: { email: data.userEmail },
		});
		if (!target) return { error: true, message: "Target user not found" };

		// Upsert membership
		await prismaClient.organizationUser.upsert({
			where: {
				userId_organizationId: {
					userId: target.id,
					organizationId: data.orgId,
				},
			},
			create: { userId: target.id, organizationId: data.orgId, isAdmin: true },
			update: { isAdmin: true },
		});

		return { ok: true };
	});

export const createJobFn = createServerFn({ method: "POST" })
	.inputValidator(CreateJobSchema.parse)
	.handler(async ({ data }) => {
		const session = await getAppSession();
		const userEmail = session?.data?.userEmail;
		if (!userEmail) return { error: true, message: "Not authenticated" };

		const user = await prismaClient.user.findUnique({
			where: { email: userEmail },
		});
		if (!user) return { error: true, message: "User not found" };

		const membership = await prismaClient.organizationUser.findUnique({
			where: {
				userId_organizationId: { userId: user.id, organizationId: data.orgId },
			},
		});
		if (!membership || !membership.isAdmin)
			return { error: true, message: "Not authorized" };

		const job = await prismaClient.job.create({
			data: {
				title: data.title,
				description: data.description,
				organizationId: data.orgId,
			},
		});

		return { job };
	});
