import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn, useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { prismaClient } from "~/utils/prisma";
import { useAppSession } from "~/utils/session";

// Server functions inlined into this route file
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

export const deleteJobFn = createServerFn({ method: "POST" })
  .inputValidator((d: { jobId: string }) => d)
  .handler(async ({ data }) => {
    const session = await useAppSession();
    const userEmail = session?.data?.userEmail;
    if (!userEmail) return { error: true, message: "Not authenticated" };

    const user = await prismaClient.user.findUnique({
      where: { email: userEmail },
    });
    if (!user) return { error: true, message: "User not found" };

    const job = await prismaClient.job.findUnique({
      where: { id: data.jobId },
    });
    if (!job) return { error: true, message: "Job not found" };

    const membership = await prismaClient.organizationUser.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: job.organizationId,
        },
      },
    });
    if (!membership || !membership.isAdmin)
      return { error: true, message: "Not authorized" };

    await prismaClient.job.delete({ where: { id: data.jobId } });

    return { ok: true };
  });

export const deleteOrgFn = createServerFn({ method: "POST" })
  .inputValidator((d: { orgId: string }) => d)
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

    await prismaClient.organization.delete({ where: { id: data.orgId } });

    return { ok: true };
  });

export const Route = createFileRoute("/_authed/organizations")({
  component: OrganizationsPage,
});

function OrganizationsPage() {
  const [name, setName] = useState("");

  const listServerFn = useServerFn(listOrganizationsFn);
  const listQuery = useQuery({
    queryKey: ["organizations"],
    queryFn: async () => {
      const res = await listServerFn();
      return res;
    },
  });
  const createMutation = useMutation({
    mutationFn: useServerFn(createOrganizationFn),
  });

  function refresh() {
    listQuery.refetch();
  }

  return (
    <div className="p-4 max-w-3xl">
      <h2 className="text-xl font-bold mb-2">Organizations</h2>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          createMutation.mutate(
            { data: { name } },
            {
              onSuccess: () => {
                setName("");
                refresh();
              },
            }
          );
        }}
        className="mb-4"
      >
        <label className="block font-medium">Create Organization</label>
        <input
          className="border p-2 w-full"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="mt-2">
          <button className="px-3 py-1 bg-green-600 text-white rounded">
            Create
          </button>
        </div>
      </form>

      <div>
        <h3 className="font-semibold">Your Organizations</h3>
        {listQuery.isLoading ? (
          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-1 gap-3 mt-2">
              <div className="h-20 bg-gray-800 rounded animate-pulse" />
              <div className="h-20 bg-gray-800 rounded animate-pulse" />
              <div className="h-20 bg-gray-800 rounded animate-pulse" />
            </div>
          </div>
        ) : listQuery.isError ? (
          <div className="text-red-400">
            Failed to load organizations.{" "}
            <button className="underline" onClick={() => listQuery.refetch()}>
              Retry
            </button>
          </div>
        ) : listQuery.data?.orgs?.length ? (
          <ul className="space-y-3 mt-2">
            {listQuery.data.orgs.map((o: any) => (
              <li key={o.id} className="p-3 border rounded">
                <div className="flex justify-between">
                  <div>
                    <div className="font-semibold">{o.name}</div>
                    <div className="text-sm text-gray-400">
                      Members: {o.members.length}
                    </div>
                  </div>
                  <div>
                    <Link
                      to={`/organization/$orgId`}
                      params={{ orgId: o.id }}
                      className="px-2 py-1 bg-blue-600 text-white rounded"
                    >
                      Manage
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-gray-500 mt-2">No organizations yet</div>
        )}
      </div>
    </div>
  );
}
