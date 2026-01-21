import { createFileRoute, useMatch } from "@tanstack/react-router";
import { JobListingPage } from "~/views/JobListingPage";

export const Route = createFileRoute("/job/$jobId")({
	component: RouteComponent,
});

function RouteComponent() {
	const { jobId } = useMatch({
		from: "/job/$jobId",
		select: (s) => s.params,
	});

	return <JobListingPage jobId={jobId} />;
}
