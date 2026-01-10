import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	createFileRoute,
	Link,
	useMatch,
	useRouter,
} from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardHeader } from "~/components/ui/card";
import Container from "~/components/ui/container";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { useGlobalContext } from "~/utils/hooks";

export const Route = createFileRoute("/_authed/organization/$orgId/")({
	component: OrgPage,
});

function OrgPage() {
	const router = useRouter();
	const { trpc } = useGlobalContext();

	const orgId = useMatch({
		from: "/_authed/organization/$orgId/",
		select: (s) => s.params.orgId,
	});

	const q = useQuery(trpc.getOrganization.queryOptions({ orgId }));

	const org = q.data?.org;
	const members = org?.members ?? [];
	const [jobTitle, setJobTitle] = useState("");
	const [jobDesc, setJobDesc] = useState("");
	const [adminEmail, setAdminEmail] = useState("");
	const [confirmDelete, setConfirmDelete] = useState(false);

	const createJobMutation = useMutation(trpc.createJob.mutationOptions());
	const addAdminMutation = useMutation(trpc.addAdmin.mutationOptions());
	const deleteJobMutation = useMutation(trpc.deleteJob.mutationOptions());
	const deleteOrgMutation = useMutation(trpc.deleteOrg.mutationOptions());
	const queryClient = useQueryClient();

	function refresh() {
		q.refetch();
	}

	return (
		<Container size="md">
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
					<h2 className="text-xl font-bold mb-2">{org?.name}</h2>
					<div className="text-sm text-gray-500">Members: {members.length}</div>

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
									{ orgId },
									{
										onSuccess: () => {
											queryClient.invalidateQueries({
												queryKey: ["organizations"],
											});
											router.navigate({ to: "/organizations" });
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
								{org.jobs.map((j) => (
									<li key={j.id}>
										<Card>
											<CardHeader>
												<div className="flex items-center justify-between w-full">
													<div className="text-lg font-medium">
														{j.title ?? "Untitled"}
													</div>
													<div className="flex items-center gap-2">
														<div className="text-sm text-muted-foreground">
															{j.resumes.length} applicant
															{j.resumes.length === 1 ? "" : "s"}
														</div>
														<Link
															to="/organization/$orgId/job/$jobId/candidates"
															params={{ orgId, jobId: j.id }}
														>
															<Button size="sm" variant="outline">
																View Candidates
															</Button>
														</Link>
														<Link
															to="/organization/$orgId/job/$jobId"
															params={{ orgId, jobId: j.id }}
														>
															<Button size="sm" variant="outline">
																Edit
															</Button>
														</Link>
														<Button
															size="sm"
															variant="destructive"
															onClick={async () => {
																if (
																	!confirm("Delete job? This cannot be undone.")
																)
																	return;
																deleteJobMutation.mutate(
																	{ jobId: j.id },
																	{ onSuccess: () => refresh() },
																);
															}}
														>
															Delete
														</Button>
													</div>
												</div>
											</CardHeader>
										</Card>
									</li>
								))}
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
											{ orgId, title: jobTitle, description: jobDesc },
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
						<div className="font-semibold">Members</div>
						{members.length ? (
							<ul className="mt-1 space-y-1 text-sm text-muted-foreground">
								{members.map((member) => (
									<li
										key={member.user.id}
										className="flex items-center justify-between"
									>
										<span>{member.user.email}</span>
										<span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs">
											{member.isAdmin ? "Admin" : "Member"}
										</span>
									</li>
								))}
							</ul>
						) : (
							<div className="text-muted-foreground text-sm">
								No members yet
							</div>
						)}
					</div>

					<div className="mt-6">
						<div className="font-semibold">Add Admin</div>
						<form
							onSubmit={(e) => {
								e.preventDefault();
								if (!adminEmail) return alert("Enter an email");
								addAdminMutation.mutate(
									{ orgId, userEmail: adminEmail },
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
