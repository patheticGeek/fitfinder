import {
	createFileRoute,
	Link,
	Outlet,
	useParams,
	useRouterState,
} from "@tanstack/react-router";
import {
	Briefcase,
	FileUp,
	LayoutDashboard,
	LogOut,
	UserCheck,
	Users,
} from "lucide-react";
import { OrganizationSelector } from "~/components/OrganizationSelector";
import { Button } from "~/components/ui/button";
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
import { Spinner } from "~/components/ui/spinner";
import { useGlobalContext } from "~/utils/hooks";

export const Route = createFileRoute("/_authed/app")({
	component: AppLayout,
});

function AppLayout() {
	const { user } = useGlobalContext();
	const routerState = useRouterState();
	const currentPath = routerState.location.pathname;
	const params = useParams({ strict: false }) as { orgId?: string };
	const currentOrgId = params.orgId;

	return (
		<SidebarProvider defaultOpen={true} open={true}>
			<div className="flex min-h-screen w-full">
				<Sidebar>
					<SidebarContent>
						<SidebarGroup>
							<SidebarGroupLabel className="text-xl font-semibold">
								FitFinder{" "}
								{routerState.isLoading ? <Spinner className="ml-2" /> : null}
							</SidebarGroupLabel>

							<SidebarGroupContent className="mt-3">
								<SidebarMenu>
									<SidebarMenuItem>
										<Link to="/app" activeOptions={{ exact: true }}>
											<SidebarMenuButton isActive={currentPath === "/app"}>
												<span>Home</span>
											</SidebarMenuButton>
										</Link>
									</SidebarMenuItem>
								</SidebarMenu>
							</SidebarGroupContent>
						</SidebarGroup>

						<SidebarGroup>
							<SidebarGroupLabel>Organization</SidebarGroupLabel>
							<SidebarGroupContent>
								<OrganizationSelector />

								{currentOrgId && (
									<SidebarMenu className="mt-3">
										<SidebarMenuItem>
											<Link
												to="/app/organization/$orgId"
												params={{ orgId: currentOrgId }}
												activeProps={{ className: "font-semibold" }}
												activeOptions={{ exact: true }}
											>
												<SidebarMenuButton
													isActive={
														currentPath === `/app/organization/${currentOrgId}`
													}
												>
													<LayoutDashboard className="h-4 w-4" />
													<span>Overview</span>
												</SidebarMenuButton>
											</Link>
										</SidebarMenuItem>

										<SidebarMenuItem>
											<Link
												to="/app/organization/$orgId/jobs"
												params={{ orgId: currentOrgId }}
												activeProps={{ className: "font-semibold" }}
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
												to="/app/organization/$orgId/candidates"
												params={{ orgId: currentOrgId }}
												activeProps={{ className: "font-semibold" }}
											>
												<SidebarMenuButton
													isActive={currentPath.includes("/candidates")}
												>
													<UserCheck className="h-4 w-4" />
													<span>Candidates</span>
												</SidebarMenuButton>
											</Link>
										</SidebarMenuItem>

										<SidebarMenuItem>
											<Link
												to="/app/organization/$orgId/ingest-resumes"
												params={{ orgId: currentOrgId }}
												activeProps={{ className: "font-semibold" }}
											>
												<SidebarMenuButton
													isActive={currentPath.includes("/ingest-resumes")}
												>
													<FileUp className="h-4 w-4" />
													<span>Ingest Resumes</span>
												</SidebarMenuButton>
											</Link>
										</SidebarMenuItem>

										<SidebarMenuItem>
											<Link
												to="/app/organization/$orgId/members"
												params={{ orgId: currentOrgId }}
												activeProps={{ className: "font-semibold" }}
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
								)}
							</SidebarGroupContent>
						</SidebarGroup>
					</SidebarContent>

					<div className="p-4 border-t mt-auto space-y-4">
						<div className="text-sm text-muted-foreground truncate">
							{user?.email}
						</div>
						<Link to="/logout" className="block">
							<Button
								variant="outline"
								size="sm"
								className="w-full justify-start"
							>
								<LogOut className="h-4 w-4 mr-2" />
								Logout
							</Button>
						</Link>
					</div>
				</Sidebar>

				<main className="flex-1 overflow-auto p-6">
					<Outlet />
				</main>
			</div>
		</SidebarProvider>
	);
}
