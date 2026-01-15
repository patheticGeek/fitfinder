import { createFileRoute, useMatch } from "@tanstack/react-router";
import { ApplyPage } from "~/views/ApplyPage";

export const Route = createFileRoute("/apply/$jobId/$code")({
	component: RouteComponent,
});

function RouteComponent() {
	const { jobId, code } = useMatch({
		from: "/apply/$jobId/$code",
		select: (s) => s.params,
	});

	return <ApplyPage jobId={jobId} code={code} />;
}
