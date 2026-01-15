import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useMatch } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardHeader } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { useGlobalContext } from "~/utils/hooks";

export const Route = createFileRoute("/_authed/app/organization/$orgId/jobs")({
	component: JobsPage,
});

function JobsPage() {
	const { trpc } = useGlobalContext();

	const orgId = useMatch({
		from: "/_authed/app/organization/$orgId/jobs",
		select: (s) => s.params.orgId,
	});

	const q = useQuery(trpc.getOrganization.queryOptions({ orgId }));

	const org = q.data?.org;
	const [jobTitle, setJobTitle] = useState("");
	const [jobDesc, setJobDesc] = useState("");

	const createJobMutation = useMutation(trpc.createJob.mutationOptions());
	const deleteJobMutation = useMutation(trpc.deleteJob.mutationOptions());

	function refresh() {
		q.refetch();
	}

	return (
		<div className="max-w-5xl">
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="text-3xl font-bold">Jobs</h1>
					<p className="text-muted-foreground mt-1">
						Manage job postings for {org?.name}
					</p>
				</div>
			</div>

			{/* Create Job Form */}
			<Card className="mb-6">
				<CardHeader>
					<div className="font-semibold text-lg mb-4">Create New Job</div>
					<div className="space-y-3">
						<div>
							<label
								htmlFor="job-title"
								className="text-sm font-medium mb-1 block"
							>
								Job Title
							</label>
							<Input
								id="job-title"
								placeholder="e.g. Senior Software Engineer"
								value={jobTitle}
								onChange={(e) => setJobTitle(e.target.value)}
							/>
						</div>
						<div>
							<label
								htmlFor="job-desc"
								className="text-sm font-medium mb-1 block"
							>
								Job Description
							</label>
							<Textarea
								id="job-desc"
								placeholder="Enter the full job description, requirements, and responsibilities..."
								value={jobDesc}
								onChange={(e) => setJobDesc(e.target.value)}
								rows={6}
							/>
						</div>
						<Button
							onClick={(e) => {
								e.preventDefault();
								if (!jobTitle.trim()) return alert("Enter job title");
								if (!jobDesc.trim()) return alert("Enter job description");
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
							disabled={createJobMutation.isPending}
						>
							{createJobMutation.isPending ? "Creating..." : "Create Job"}
						</Button>
					</div>
				</CardHeader>
			</Card>

			{/* Jobs List */}
			<div>
				<h2 className="text-xl font-semibold mb-4">All Jobs</h2>
				{q.isLoading ? (
					<div className="space-y-3">
						<div className="h-24 bg-gray-800 rounded animate-pulse" />
						<div className="h-24 bg-gray-800 rounded animate-pulse" />
						<div className="h-24 bg-gray-800 rounded animate-pulse" />
					</div>
				) : q.isError ? (
					<div className="text-red-400">
						Failed to load jobs.{" "}
						<button
							type="button"
							className="underline"
							onClick={() => q.refetch()}
						>
							Retry
						</button>
					</div>
				) : org?.jobs.length ? (
					<div className="space-y-3">
						{org.jobs.map((j) => (
							<Card key={j.id}>
								<CardHeader>
									<div className="flex items-start justify-between gap-4">
										<div className="flex-1 min-w-0">
											<h3 className="text-lg font-medium truncate">
												{j.title ?? "Untitled"}
											</h3>
											<p className="text-sm text-muted-foreground mt-1 line-clamp-2">
												{j.description}
											</p>
											<div className="text-sm text-muted-foreground mt-2">
												{j.resumes.length} applicant
												{j.resumes.length === 1 ? "" : "s"}
											</div>
										</div>
										<div className="flex items-center gap-2 shrink-0">
											<Link
												to="/app/organization/$orgId/candidates"
												params={{ orgId }}
												search={{ jobId: j.id }}
											>
												<Button size="sm" variant="outline">
													Candidates
												</Button>
											</Link>
											<Link
												to="/app/organization/$orgId/job/$jobId"
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
														!confirm(
															"Delete job? This will delete all associated applications and cannot be undone.",
														)
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
						))}
					</div>
				) : (
					<Card>
						<CardHeader>
							<div className="text-center py-8 text-muted-foreground">
								No jobs yet. Create your first job above to get started.
							</div>
						</CardHeader>
					</Card>
				)}
			</div>
		</div>
	);
}
