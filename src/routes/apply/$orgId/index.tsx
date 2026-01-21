import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useMatch } from "@tanstack/react-router";
import { ArrowLeft, Briefcase } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { Spinner } from "~/components/ui/spinner";
import { useGlobalContext } from "~/utils/hooks";

export const Route = createFileRoute("/apply/$orgId/")({
	component: RouteComponent,
});

function RouteComponent() {
	const { orgId } = useMatch({
		from: "/apply/$orgId/",
		select: (s) => s.params,
	});
	const { trpc } = useGlobalContext();
	const jobsQuery = useQuery(trpc.listPublicJobs.queryOptions({ orgId }));

	if (jobsQuery.isLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center p-6">
				<Card className="w-full max-w-2xl">
					<CardHeader className="text-center">
						<div className="flex justify-center">
							<Spinner className="size-8" />
						</div>
						<CardTitle className="mt-4">Loading jobs</CardTitle>
					</CardHeader>
				</Card>
			</div>
		);
	}

	if (jobsQuery.isError) {
		return (
			<div className="flex min-h-screen items-center justify-center p-6">
				<Card className="w-full max-w-2xl">
					<CardHeader className="text-center">
						<CardTitle className="text-destructive">
							Failed to load jobs
						</CardTitle>
						<CardDescription className="mt-2">
							{jobsQuery.error instanceof Error
								? jobsQuery.error.message
								: "An error occurred while loading jobs."}
						</CardDescription>
					</CardHeader>
				</Card>
			</div>
		);
	}

	const jobs = jobsQuery.data?.jobs || [];
	const orgName = jobs[0]?.organization.name || "Organization";

	const formatDate = (date: Date | string) => {
		const dateObj = typeof date === "string" ? new Date(date) : date;
		return new Intl.DateTimeFormat("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
		}).format(dateObj);
	};

	return (
		<div className="min-h-screen bg-background">
			<div className="max-w-4xl mx-auto p-6 space-y-6">
				<div className="flex items-center gap-4">
					<Link to="/apply">
						<Button variant="ghost" size="sm">
							<ArrowLeft className="size-4 mr-2" />
							Back to Organizations
						</Button>
					</Link>
				</div>

				<div className="text-center space-y-2">
					<h1 className="text-3xl font-bold">{orgName}</h1>
					<p className="text-muted-foreground">
						Available job positions
					</p>
				</div>

				{jobs.length === 0 ? (
					<Card>
						<CardHeader className="text-center">
							<CardTitle>No jobs available</CardTitle>
							<CardDescription>
								This organization doesn't have any open positions at the moment.
							</CardDescription>
						</CardHeader>
					</Card>
				) : (
					<div className="space-y-4">
						{jobs.map((job) => (
							<Link
								key={job.id}
								to="/apply/$orgId/$jobId"
								params={{ orgId, jobId: job.id }}
								className="block"
							>
								<Card className="hover:bg-accent transition-colors cursor-pointer">
									<CardHeader>
										<div className="flex items-start justify-between">
											<div className="flex-1">
												<div className="flex items-center gap-2 mb-2">
													<Briefcase className="size-5 text-muted-foreground" />
													<CardTitle>{job.title || "Untitled Job"}</CardTitle>
												</div>
												<CardDescription className="line-clamp-2 mb-3">
													{job.description}
												</CardDescription>
												<div className="text-sm text-muted-foreground">
													Posted: {formatDate(job.createdAt)}
												</div>
											</div>
										</div>
									</CardHeader>
								</Card>
							</Link>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
