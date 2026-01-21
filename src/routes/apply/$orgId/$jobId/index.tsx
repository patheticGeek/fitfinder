import { createFileRoute, useMatch } from "@tanstack/react-router";
import { JobListingPage } from "~/views/JobListingPage";

export const Route = createFileRoute("/apply/$orgId/$jobId/")({
	component: RouteComponent,
});

function RouteComponent() {
	const { orgId, jobId } = useMatch({
		from: "/apply/$orgId/$jobId/",
		select: (s) => s.params,
	});

	return <JobListingPage orgId={orgId} jobId={jobId} />;
}
