import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn, useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { prismaClient } from "~/utils/prisma";
import { useAppSession } from "~/utils/session";

export const getOrganizationFn = createServerFn({ method: "GET" })
  .inputValidator((d: { orgId: string }) => d)
  .handler(async ({ data }) => {
    const session = await useAppSession();
    const userEmail = session.data?.userEmail;
    if (!userEmail) return { error: true, message: "Not authenticated" };

    const org = await prismaClient.organization.findUnique({
      where: { id: data.orgId },
      include: {
        members: { include: { user: true } },
        jobs: { include: { resumes: { include: { user: true } } } },
        resumes: true,
      },
    });

    if (!org) return { error: true, message: "Organization not found" };
    return { org };
  });

export const Route = createFileRoute("/_authed/organization/$orgId")({
  component: OrgPage,
});

function OrgPage() {
  const orgId =
    typeof window !== "undefined"
      ? window.location.pathname.split("/").pop() || ""
      : "";

  const server = useServerFn(getOrganizationFn);
  const q = useQuery({
    queryKey: ["organization", orgId],
    queryFn: async () => {
      const res = await server({ data: { orgId } });
      return res;
    },
  });

  const org = q.data?.org;
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  return (
    <div className="p-4 max-w-4xl">
      <h2 className="text-xl font-bold mb-2">Organization</h2>
      {q.isLoading ? (
        <div className="space-y-3">
          <div className="h-6 w-1/3 bg-gray-700 rounded animate-pulse" />
          <div className="h-4 w-1/4 bg-gray-600 rounded animate-pulse" />
          <div className="mt-4 space-y-2">
            <div className="h-10 bg-gray-800 rounded animate-pulse" />
            <div className="h-10 bg-gray-800 rounded animate-pulse" />
            <div className="h-10 bg-gray-800 rounded animate-pulse" />
          </div>
        </div>
      ) : q.isError ? (
        <div className="text-red-400">
          Failed to load organization.{" "}
          <button className="underline" onClick={() => q.refetch()}>
            Retry
          </button>
        </div>
      ) : (
        <div>
          <div className="font-semibold text-lg">{org!.name}</div>
          <div className="text-sm text-gray-500">
            Members: {org!.members.length}
          </div>

          <div className="mt-4">
            <div className="font-semibold">Jobs</div>
            {org!.jobs.length ? (
              <ul className="mt-2 space-y-3">
                {org!.jobs.map((j: any) => {
                  const expanded = expandedJobId === j.id;
                  return (
                    <li key={j.id} className="p-3 border rounded">
                      <div className="flex justify-between items-center">
                        <div className="font-medium">
                          {j.title ?? "Untitled"}
                        </div>
                        <button
                          className="px-2 py-1 bg-gray-700 text-white rounded text-sm"
                          onClick={() =>
                            setExpandedJobId(expanded ? null : j.id)
                          }
                        >
                          {expanded ? "Collapse" : "Details"}
                        </button>
                      </div>

                      {expanded && (
                        <div className="mt-2">
                          <div className="text-sm text-gray-200 mb-2">
                            {j.description}
                          </div>

                          <div>
                            <div className="font-medium">Resumes</div>
                            {j.resumes && j.resumes.length ? (
                              <ul className="list-disc ml-6 mt-1">
                                {j.resumes.map((r: any) => (
                                  <li key={r.id} className="mt-1">
                                    <a
                                      href={r.path}
                                      className="text-blue-400 mr-2"
                                    >
                                      {r.fileName}
                                    </a>
                                    <span className="text-sm text-gray-300">
                                      Score: {r.score ?? "-"}%
                                    </span>
                                    <span className="text-sm text-gray-500 ml-2">
                                      by {r.user?.email ?? "unknown"}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <div className="text-gray-500">
                                No resumes for this job
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="text-gray-500 mt-2">No jobs yet</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
