import { createFileRoute } from "@tanstack/react-router";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { resolveResponse } from "@trpc/server/http";
import {
	createApplicationInvite,
	submitApplication,
} from "~/api/mutations/application";
import { apply } from "~/api/mutations/apply";
import { login, signup } from "~/api/mutations/auth";
import { createJob, deleteJob, updateJob } from "~/api/mutations/jobs";
import {
	addAdmin,
	addMember,
	createOrganization,
	deleteOrg,
} from "~/api/mutations/organizations";
import { getApplicationDetails } from "~/api/queries/application";
import { getJob, getJobCandidates, listJobs } from "~/api/queries/jobs";
import {
	getOrganization,
	getOrganizationCandidates,
	listOrganizations,
} from "~/api/queries/organizations";
import { createTRPContext, t } from "~/utils/trpcServer";

export const appRouter = t.router({
	login,
	signup,
	apply,
	listJobs,
	createOrganization,
	listOrganizations,
	addAdmin,
	addMember,
	createJob,
	updateJob,
	getJobCandidates,
	getJob,
	getOrganization,
	getOrganizationCandidates,
	deleteJob,
	deleteOrg,
	createApplicationInvite,
	getApplicationDetails,
	submitApplication,
});

export type AppRouter = typeof appRouter;
export type AppRouterInputs = inferRouterInputs<AppRouter>;
export type AppRouterOutputs = inferRouterOutputs<AppRouter>;

export const Route = createFileRoute("/api/trpc/$")({
	server: {
		handlers: {
			ANY: async ({ request, pathname }) => {
				const response = await resolveResponse({
					req: request,
					createContext: (trpcCtx) => createTRPContext({ ...trpcCtx }),
					router: appRouter,
					error: null,
					onError: ({ error }) => {
						console.error("TRPC Error:", error);
					},
					path: pathname.replace("/api/trpc/", ""),
				});
				return response;
			},
		},
	},
});
