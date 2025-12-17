import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn, useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import Container from "~/components/ui/container";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { prismaClient } from "~/utils/prisma";
import { getAppSession } from "~/utils/session";
import {
	addAdminFn,
	createJobFn,
	deleteJobFn,
	deleteOrgFn,
} from "./organizations";

const GetOrganizationSchema = z.object({ orgId: z.string() });

export const getOrganizationFn = createServerFn({ method: "GET" })
	.inputValidator(GetOrganizationSchema.parse)
	.handler(async ({ data }) => {
		const session = await getAppSession();
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
	const [jobTitle, setJobTitle] = useState("");
	const [jobDesc, setJobDesc] = useState("");
	const [adminEmail, setAdminEmail] = useState("");
	const [confirmDelete, setConfirmDelete] = useState(false);

	const createJobMutation = useMutation({
		mutationFn: useServerFn(createJobFn),
	});
	const addAdminMutation = useMutation({ mutationFn: useServerFn(addAdminFn) });
	const deleteJobMutation = useMutation({
		mutationFn: useServerFn(deleteJobFn),
	});
	const deleteOrgMutation = useMutation({
		mutationFn: useServerFn(deleteOrgFn),
	});

	function refresh() {
		q.refetch();
	}

	return (
		<Container size="md">
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
					<button
						type="button"
						className="underline"
						onClick={() => q.refetch()}
					>
						Retry
					</button>
				</div>
			) : (
				<div>
					<div className="font-semibold text-lg">{org?.name}</div>
					<div className="text-sm text-gray-500">
						Members: {org?.members.length}
					</div>

					<div className="mt-3 flex gap-3">
						<Button
							variant={confirmDelete ? "destructive" : "outline"}
							size="sm"
							onClick={() => {
								if (!confirmDelete) {
									setConfirmDelete(true);
									setTimeout(() => setConfirmDelete(false), 5000);
									return;
								}

								deleteOrgMutation.mutate(
									{ data: { orgId } },
									{
										onSuccess: () => {
											window.location.href = "/organizations";
										},
									},
								);
							}}
						>
							{confirmDelete ? "Confirm Delete Org" : "Delete Org"}
						</Button>
					</div>

					<div className="mt-4">
						<div className="font-semibold">Jobs</div>
						{org?.jobs.length ? (
							<ul className="mt-2 space-y-3">
								{org?.jobs.map((j) => {
									const expanded = expandedJobId === j.id;
									return (
										<li key={j.id}>
											<Card>
												<CardHeader>
													<div className="flex items-center justify-between w-full">
														<div className="font-medium">
															{j.title ?? "Untitled"}
														</div>
														<div className="flex items-center gap-2">
															<Button
																size="sm"
																variant="ghost"
																onClick={() =>
																	setExpandedJobId(expanded ? null : j.id)
																}
															>
																{expanded ? "Collapse" : "Details"}
															</Button>
															<Button
																size="sm"
																variant="destructive"
																onClick={async () => {
																	if (
																		!confirm(
																			"Delete job? This cannot be undone.",
																		)
																	)
																		return;
																	deleteJobMutation.mutate(
																		{ data: { jobId: j.id } },
																		{ onSuccess: () => refresh() },
																	);
																}}
															>
																Delete
															</Button>
														</div>
													</div>
												</CardHeader>

												{expanded && (
													<CardContent>
														<div className="text-sm text-muted-foreground mb-2">
															{j.description}
														</div>

														<div>
															<div className="font-medium">Resumes</div>
															{j.resumes.length ? (
																<ul className="list-disc ml-6 mt-1">
																	{j.resumes.map((r) => (
																		<li key={r.id} className="mt-1">
																			<a
																				href={r.path}
																				className="text-cyan-400 mr-2"
																			>
																				{r.fileName}
																			</a>
																			<span className="text-sm text-muted-foreground">
																				Score: {r.score ?? "-"}%
																			</span>
																			<span className="text-sm text-muted-foreground ml-2">
																				by {r.user?.email ?? "unknown"}
																			</span>
																			{r.scoreJustification && (
																				<div className="text-xs text-muted-foreground mt-1 ml-4">
																					{r.scoreJustification}
																				</div>
																			)}
																		</li>
																	))}
																</ul>
															) : (
																<div className="text-muted-foreground">
																	No resumes for this job
																</div>
															)}
														</div>
													</CardContent>
												)}
											</Card>
										</li>
									);
								})}
							</ul>
						) : (
							<div className="text-muted-foreground mt-2">No jobs yet</div>
						)}
					</div>

					<div className="mt-6">
						<div className="font-semibold">Create Job</div>
						<div className="mt-2">
							<Input
								placeholder="Job title"
								value={jobTitle}
								onChange={(e) => setJobTitle(e.target.value)}
							/>
							<Textarea
								placeholder="Job description"
								value={jobDesc}
								onChange={(e) => setJobDesc(e.target.value)}
								className="mt-2"
							/>
							<div className="mt-3">
								<Button
									onClick={(e) => {
										e.preventDefault();
										if (!jobTitle) return alert("Enter job title");
										if (!jobDesc) return alert("Enter job description");
										createJobMutation.mutate(
											{
												data: { orgId, title: jobTitle, description: jobDesc },
											},
											{
												onSuccess: () => {
													setJobTitle("");
													setJobDesc("");
													refresh();
												},
											},
										);
									}}
								>
									Create Job
								</Button>
							</div>
						</div>
					</div>

					<div className="mt-6">
						<div className="font-semibold">Add Admin</div>
						<form
							onSubmit={(e) => {
								e.preventDefault();
								if (!adminEmail) return alert("Enter an email");
								addAdminMutation.mutate(
									{ data: { orgId, userEmail: adminEmail } },
									{
										onSuccess: () => {
											setAdminEmail("");
											refresh();
										},
									},
								);
							}}
						>
							<div className="flex gap-2 mt-2">
								<Input
									value={adminEmail}
									onChange={(e) => setAdminEmail(e.target.value)}
									className="flex-1"
									placeholder="user@example.com"
								/>
								<Button type="submit" variant="secondary" size="sm">
									Add Admin
								</Button>
							</div>
						</form>
					</div>
				</div>
			)}
		</Container>
	);
}
