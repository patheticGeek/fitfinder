import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { useGlobalContext } from "~/utils/hooks";

export const Route = createFileRoute("/_authed/app/")({
	component: AppDashboard,
});

function AppDashboard() {
	const [name, setName] = useState("");
	const { trpc } = useGlobalContext();

	const listQuery = useQuery(trpc.listOrganizations.queryOptions());

	const createMutation = useMutation(trpc.createOrganization.mutationOptions());

	return (
		<div className="p-6">
			<div className="max-w-4xl">
				<h1 className="text-3xl font-bold mb-6">Organizations</h1>

				<Card className="mb-6">
					<CardHeader>
						<CardTitle className="text-lg">Create New Organization</CardTitle>
					</CardHeader>
					<CardContent>
						<form
							onSubmit={(e) => {
								e.preventDefault();
								createMutation.mutate(
									{ name },
									{
										onSuccess: () => {
											setName("");
											listQuery.refetch();
										},
									},
								);
							}}
							className="flex gap-2"
						>
							<Input
								placeholder="Organization name"
								name="name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								className="flex-1"
							/>
							<Button type="submit" disabled={createMutation.isPending}>
								{createMutation.isPending ? "Creating..." : "Create"}
							</Button>
						</form>
					</CardContent>
				</Card>

				<div>
					<h2 className="text-xl font-semibold mb-4">Your Organizations</h2>
					{listQuery.isLoading ? (
						<div className="space-y-3">
							<div className="h-24 bg-muted rounded animate-pulse" />
							<div className="h-24 bg-muted rounded animate-pulse" />
							<div className="h-24 bg-muted rounded animate-pulse" />
						</div>
					) : listQuery.isError ? (
						<div className="text-red-500 p-4 bg-red-500/10 rounded">
							Failed to load organizations.{" "}
							<button
								type="button"
								className="underline font-semibold"
								onClick={() => listQuery.refetch()}
							>
								Retry
							</button>
						</div>
					) : listQuery.data?.orgs?.length ? (
						<div className="grid gap-4">
							{listQuery.data.orgs.map((org) => (
								<Card
									key={org.id}
									className="hover:shadow-md transition-shadow"
								>
									<CardHeader>
										<div className="flex items-center justify-between">
											<div className="flex-1">
												<CardTitle>{org.name}</CardTitle>
											</div>
											<Link
												to={`/app/organization/$orgId`}
												params={{ orgId: org.id }}
											>
												<Button size="sm">Manage</Button>
											</Link>
										</div>
									</CardHeader>
									<CardContent>
										<div className="flex gap-6 text-sm text-muted-foreground">
											<div>
												<span className="font-semibold">
													{org.members.length}
												</span>{" "}
												member{org.members.length !== 1 ? "s" : ""}
											</div>
											<div>
												<span className="font-semibold">{org.jobs.length}</span>{" "}
												job{org.jobs.length !== 1 ? "s" : ""}
											</div>
										</div>
									</CardContent>
								</Card>
							))}
						</div>
					) : (
						<div className="text-center py-12 text-muted-foreground">
							No organizations yet. Create one to get started!
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
