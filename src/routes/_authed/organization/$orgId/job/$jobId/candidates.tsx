import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useMatch } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import Container from "~/components/ui/container";
import { useGlobalContext } from "~/utils/hooks";

export const Route = createFileRoute(
	"/_authed/organization/$orgId/job/$jobId/candidates",
)({
	component: CandidatesPage,
});

function CandidatesPage() {
	const { orgId, jobId } = useMatch({
		from: "/_authed/organization/$orgId/job/$jobId/candidates",
		select: (s) => s.params,
	});

	const { trpc } = useGlobalContext();

	const q = useQuery(trpc.getJobCandidates.queryOptions({ orgId, jobId }));

	const job = q.data?.job;

	return (
		<Container size="md">
			<div className="flex items-center justify-between">
				<h2 className="text-xl font-bold">
					Candidates for {job?.title ?? "Job"}
				</h2>
				<div>
					<Link to="/organization/$orgId" params={{ orgId }}>
						<Button size="sm">Back to Org</Button>
					</Link>
				</div>
			</div>

			{q.isLoading ? (
				<div className="mt-4">Loading…</div>
			) : q.isError ? (
				<div className="mt-4 text-red-400">Failed to load candidates</div>
			) : (
				<div className="mt-4 space-y-3">
					{job?.resumes?.length ? (
						job.resumes.map((r) => (
							<Card key={r.id}>
								<CardHeader>
									<div className="flex items-center justify-between w-full">
										<div className="font-medium">{r.fileName}</div>
										<div className="text-sm text-muted-foreground">
											{r.user?.email ?? "unknown"}
										</div>
									</div>
								</CardHeader>
								<CardContent>
									<div className="text-sm">Score: {r.score ?? "-"}%</div>
									{r.scoreJustification && (
										<div className="text-xs text-muted-foreground mt-2">
											{r.scoreJustification}
										</div>
									)}
								</CardContent>
							</Card>
						))
					) : (
						<div className="text-muted-foreground">
							No candidates have applied yet.
						</div>
					)}
				</div>
			)}
		</Container>
	);
}
