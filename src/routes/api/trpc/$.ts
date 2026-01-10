import { createFileRoute } from "@tanstack/react-router";
import { resolveResponse } from "@trpc/server/http";
import { applyResume } from "~/api/mutations/applyResume";
import { createJob, deleteJob, updateJob } from "~/api/mutations/jobs";
import {
	addAdmin,
	createOrganization,
	deleteOrg,
} from "~/api/mutations/organizations";
import { getJob, getJobCandidates, listJobs } from "~/api/queries/jobs";
import {
	getOrganization,
	listOrganizations,
} from "~/api/queries/organizations";
import { createTRPContext, t } from "~/utils/trpcServer";

export const appRouter = t.router({
	applyResume,
	listJobs,
	createOrganization,
	listOrganizations,
	addAdmin,
	createJob,
	updateJob,
	getJobCandidates,
	getJob,
	getOrganization,
	deleteJob,
	deleteOrg,
});

export type AppRouter = typeof appRouter;

export const Route = createFileRoute("/api/trpc/$")({
	server: {
		handlers: {
			ANY: async ({ request, pathname }) =>
				resolveResponse({
					req: request,
					createContext: (trpcCtx) => createTRPContext({ ...trpcCtx }),
					router: appRouter,
					error: null,
					onError: () => {}, // we ballin
					path: pathname.replace("/api/trpc/", ""),
				}),
		},
	},
});
