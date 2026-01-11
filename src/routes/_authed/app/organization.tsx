import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/app/organization")({
	component: OrganizationLayout,
});

function OrganizationLayout() {
	return <Outlet />;
}
