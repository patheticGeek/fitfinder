import { createServerFn } from "@tanstack/react-start";
import { prismaClient } from "~/utils/prisma";
import { useAppSession } from "~/utils/session";

export const createOrganizationFn = createServerFn({ method: "POST" })
  .inputValidator((d: { name: string }) => d)
  .handler(async ({ data }) => {
    const session = await useAppSession();
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
    const session = await useAppSession();
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
  }
);

export const addAdminFn = createServerFn({ method: "POST" })
  .inputValidator((d: { orgId: string; userEmail: string }) => d)
  .handler(async ({ data }) => {
    const session = await useAppSession();
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
  .inputValidator(
    (d: { orgId: string; title: string; description: string }) => d
  )
  .handler(async ({ data }) => {
    const session = await useAppSession();
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
