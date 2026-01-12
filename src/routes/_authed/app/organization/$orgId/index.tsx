import { useMutation, useQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	Link,
	useMatch,
	useRouter,
} from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { useGlobalContext } from "~/utils/hooks";

export const Route = createFileRoute("/_authed/app/organization/$orgId/")({
	component: OrgPage,
});

function OrgPage() {
	const router = useRouter();
	const { trpc } = useGlobalContext();

	const orgId = useMatch({
		from: "/_authed/app/organization/$orgId/",
		select: (s) => s.params.orgId,
	});

	const q = useQuery(trpc.getOrganization.queryOptions({ orgId }));

	const org = q.data?.org;
	const [confirmDelete, setConfirmDelete] = useState(false);

	const deleteOrgMutation = useMutation(trpc.deleteOrg.mutationOptions());

	return (
		<div className="max-w-4xl">
			{q.isLoading ? (
				<div className="space-y-3">
					<div className="h-8 w-1/3 bg-gray-700 rounded animate-pulse" />
					<div className="h-4 w-1/4 bg-gray-600 rounded animate-pulse" />
					<div className="mt-4 space-y-2">
						<div className="h-32 bg-gray-800 rounded animate-pulse" />
						<div className="h-32 bg-gray-800 rounded animate-pulse" />
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
					<div className="mb-6">
						<h1 className="text-3xl font-bold">{org?.name}</h1>
						<p className="text-muted-foreground mt-1">
							Organization overview and settings
						</p>
					</div>

					{/* Stats Cards */}
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
						<Card>
							<CardHeader>
								<div className="text-sm font-medium text-muted-foreground">
									Total Jobs
								</div>
								<div className="text-3xl font-bold">
									{org?.jobs.length || 0}
								</div>
							</CardHeader>
						</Card>

						<Card>
							<CardHeader>
								<div className="text-sm font-medium text-muted-foreground">
									Total Applicants
								</div>
								<div className="text-3xl font-bold">
									{org?.resumes.length || 0}
								</div>
							</CardHeader>
						</Card>

						<Card>
							<CardHeader>
								<div className="text-sm font-medium text-muted-foreground">
									Team Members
								</div>
								<div className="text-3xl font-bold">
									{org?.members.length || 0}
								</div>
							</CardHeader>
						</Card>
					</div>

					{/* Actions */}
					<div className="mb-6 flex gap-3">
						<Link
							to="/app/organization/$orgId/ingest-resumes"
							params={{ orgId }}
						>
							<Button>Ingest Resumes</Button>
						</Link>
						<Link to="/app/organization/$orgId/jobs" params={{ orgId }}>
							<Button variant="outline">Manage Jobs</Button>
						</Link>
						<Link to="/app/organization/$orgId/candidates" params={{ orgId }}>
							<Button variant="outline">View Candidates</Button>
						</Link>
					</div>

					{/* Recent Jobs */}
					<Card className="mb-6">
						<CardHeader>
							<div className="flex items-center justify-between">
								<div className="font-semibold text-lg">Recent Jobs</div>
								<Link to="/app/organization/$orgId/jobs" params={{ orgId }}>
									<Button size="sm" variant="outline">
										View All Jobs
									</Button>
								</Link>
							</div>
						</CardHeader>
						<CardContent>
							{org?.jobs.length ? (
								<div className="space-y-2">
									{org.jobs.slice(0, 5).map((job) => (
										<div
											key={job.id}
											className="flex items-center justify-between py-2 border-b last:border-0"
										>
											<div>
												<div className="font-medium">
													{job.title || "Untitled"}
												</div>
												<div className="text-sm text-muted-foreground">
													{job.resumes.length} applicant
													{job.resumes.length === 1 ? "" : "s"}
												</div>
											</div>
											<Link
												to="/app/organization/$orgId/job/$jobId/candidates"
												params={{ orgId, jobId: job.id }}
											>
												<Button size="sm" variant="ghost">
													View
												</Button>
											</Link>
										</div>
									))}
								</div>
							) : (
								<div className="text-center py-8 text-muted-foreground">
									No jobs yet.{" "}
									<Link
										to="/app/organization/$orgId/jobs"
										params={{ orgId }}
										className="underline"
									>
										Create your first job
									</Link>
								</div>
							)}
						</CardContent>
					</Card>

					{/* Danger Zone */}
					<Card className="border-red-900/50">
						<CardHeader>
							<div className="font-semibold text-lg text-red-400">
								Danger Zone
							</div>
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								<div>
									<p className="text-sm text-muted-foreground mb-3">
										Deleting this organization will permanently remove all jobs,
										applications, and member associations. This action cannot be
										undone.
									</p>
									<Button
										variant={confirmDelete ? "destructive" : "outline"}
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
														router.navigate({ to: "/app" });
													},
												},
											);
										}}
										disabled={deleteOrgMutation.isPending}
									>
										{confirmDelete
											? "Click Again to Confirm Delete"
											: "Delete Organization"}
									</Button>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
			)}
		</div>
	);
}
