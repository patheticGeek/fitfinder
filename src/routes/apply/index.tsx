import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2 } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Spinner } from "~/components/ui/spinner";
import { useGlobalContext } from "~/utils/hooks";

export const Route = createFileRoute("/apply/")({
	component: RouteComponent,
});

function RouteComponent() {
	const { trpc } = useGlobalContext();
	const orgsQuery = useQuery(trpc.listPublicOrganizations.queryOptions());

	if (orgsQuery.isLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center p-6">
				<Card className="w-full max-w-2xl">
					<CardHeader className="text-center">
						<div className="flex justify-center">
							<Spinner className="size-8" />
						</div>
						<CardTitle className="mt-4">Loading organizations</CardTitle>
					</CardHeader>
				</Card>
			</div>
		);
	}

	if (orgsQuery.isError) {
		return (
			<div className="flex min-h-screen items-center justify-center p-6">
				<Card className="w-full max-w-2xl">
					<CardHeader className="text-center">
						<CardTitle className="text-destructive">
							Failed to load organizations
						</CardTitle>
						<CardDescription className="mt-2">
							{orgsQuery.error instanceof Error
								? orgsQuery.error.message
								: "An error occurred while loading organizations."}
						</CardDescription>
					</CardHeader>
				</Card>
			</div>
		);
	}

	const orgs = orgsQuery.data?.orgs || [];

	return (
		<div className="min-h-screen bg-background">
			<div className="max-w-4xl mx-auto p-6 space-y-6">
				<div className="text-center space-y-2">
					<h1 className="text-3xl font-bold">Available Organizations</h1>
					<p className="text-muted-foreground">
						Select an organization to view available job positions
					</p>
				</div>

				{orgs.length === 0 ? (
					<Card>
						<CardHeader className="text-center">
							<CardTitle>No organizations found</CardTitle>
							<CardDescription>
								There are currently no organizations with available positions.
							</CardDescription>
						</CardHeader>
					</Card>
				) : (
					<div className="grid gap-4 md:grid-cols-2">
						{orgs.map((org) => (
							<Link
								key={org.id}
								to="/apply/$orgId"
								params={{ orgId: org.id }}
								className="block"
							>
								<Card className="hover:bg-accent transition-colors cursor-pointer h-full">
									<CardHeader>
										<div className="flex items-start justify-between">
											<div className="flex items-center gap-3">
												<Building2 className="size-6 text-muted-foreground" />
												<div>
													<CardTitle>{org.name}</CardTitle>
													<CardDescription className="mt-1">
														{org._count.jobs}{" "}
														{org._count.jobs === 1 ? "job" : "jobs"} available
													</CardDescription>
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
