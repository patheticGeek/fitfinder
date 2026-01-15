import { createFileRoute } from "@tanstack/react-router";
import { resolveResponse } from "@trpc/server/http";
import { applyResume } from "~/api/mutations/applyResume";
import { login, signup } from "~/api/mutations/auth";
import { createInvite, submitInviteApplication } from "~/api/mutations/invites";
import { createJob, deleteJob, updateJob } from "~/api/mutations/jobs";
import {
	addAdmin,
	addMember,
	createOrganization,
	deleteOrg,
} from "~/api/mutations/organizations";
import { getInviteData } from "~/api/queries/invites";
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
	applyResume,
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
	// invites
	createInvite,
	getInviteData,
	submitInviteApplication,
});

export type AppRouter = typeof appRouter;

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
