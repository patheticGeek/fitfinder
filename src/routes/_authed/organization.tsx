import {
	createFileRoute,
	Link,
	Outlet,
	useParams,
	useRouterState,
} from "@tanstack/react-router";
import { Briefcase, LayoutDashboard, Users } from "lucide-react";
import { OrganizationSelector } from "~/components/OrganizationSelector";
import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
} from "~/components/ui/sidebar";

export const Route = createFileRoute("/_authed/organization")({
	component: OrganizationLayout,
});

function OrganizationLayout() {
	// Get orgId from URL params - works for all child routes
	const params = useParams({ strict: false }) as { orgId?: string };
	const currentOrgId = params.orgId;
	const routerState = useRouterState();
	const currentPath = routerState.location.pathname;

	return (
		<SidebarProvider defaultOpen={true} open={true}>
			<div className="flex min-h-screen w-full">
				<Sidebar>
					<SidebarContent>
						<SidebarGroup>
							<SidebarGroupLabel>Organization</SidebarGroupLabel>
							<SidebarGroupContent>
								<div className="px-2 pb-2">
									<OrganizationSelector />
								</div>
							</SidebarGroupContent>
						</SidebarGroup>

						{currentOrgId && (
							<SidebarGroup>
								<SidebarGroupLabel>Navigation</SidebarGroupLabel>
								<SidebarGroupContent>
									<SidebarMenu>
										<SidebarMenuItem>
											<Link
												to="/organization/$orgId"
												params={{ orgId: currentOrgId }}
												activeProps={{
													className: "font-semibold",
												}}
												activeOptions={{ exact: true }}
											>
												<SidebarMenuButton
													isActive={
														currentPath === `/organization/${currentOrgId}`
													}
												>
													<LayoutDashboard className="h-4 w-4" />
													<span>Overview</span>
												</SidebarMenuButton>
											</Link>
										</SidebarMenuItem>

										<SidebarMenuItem>
											<Link
												to="/organization/$orgId/jobs"
												params={{ orgId: currentOrgId }}
												activeProps={{
													className: "font-semibold",
												}}
											>
												<SidebarMenuButton
													isActive={currentPath.includes("/jobs")}
												>
													<Briefcase className="h-4 w-4" />
													<span>Jobs</span>
												</SidebarMenuButton>
											</Link>
										</SidebarMenuItem>

										<SidebarMenuItem>
											<Link
												to="/organization/$orgId/members"
												params={{ orgId: currentOrgId }}
												activeProps={{
													className: "font-semibold",
												}}
											>
												<SidebarMenuButton
													isActive={currentPath.includes("/members")}
												>
													<Users className="h-4 w-4" />
													<span>Members</span>
												</SidebarMenuButton>
											</Link>
										</SidebarMenuItem>
									</SidebarMenu>
								</SidebarGroupContent>
							</SidebarGroup>
						)}
					</SidebarContent>
				</Sidebar>

				<main className="flex-1 overflow-auto p-6">
					<Outlet />
				</main>
			</div>
		</SidebarProvider>
	);
}
