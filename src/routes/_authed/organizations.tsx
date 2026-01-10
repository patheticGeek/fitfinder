import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import Container from "~/components/ui/container";
import { Input } from "~/components/ui/input";
import { useGlobalContext } from "~/utils/hooks";

export const Route = createFileRoute("/_authed/organizations")({
	component: OrganizationsPage,
});

function OrganizationsPage() {
	const [name, setName] = useState("");
	const { trpc } = useGlobalContext();

	const listQuery = useQuery(trpc.listOrganizations.queryOptions());

	const createMutation = useMutation(trpc.createOrganization.mutationOptions());

	function refresh() {
		listQuery.refetch();
	}

	return (
		<Container size="md">
			<h2 className="text-xl font-bold mb-2">Organizations</h2>

			<Card className="mb-4">
				<form
					onSubmit={(e) => {
						e.preventDefault();
						createMutation.mutate(
							{ name },
							{
								onSuccess: () => {
									setName("");
									refresh();
								},
							},
						);
					}}
				>
					<label htmlFor="create-org-name" className="block font-medium">
						Create Organization
					</label>
					<Input
						id="create-org-name"
						name="name"
						value={name}
						onChange={(e) => setName(e.target.value)}
					/>
					<div className="mt-2">
						<Button type="submit" disabled={createMutation.isPending}>
							{createMutation.isPending ? "Creating..." : "Create"}
						</Button>
					</div>
				</form>
			</Card>

			<div>
				<h3 className="font-semibold">Your Organizations</h3>
				{listQuery.isLoading ? (
					<div className="space-y-3 mt-2">
						<div className="grid grid-cols-1 gap-3 mt-2">
							<div className="h-20 bg-gray-800 rounded animate-pulse" />
							<div className="h-20 bg-gray-800 rounded animate-pulse" />
							<div className="h-20 bg-gray-800 rounded animate-pulse" />
						</div>
					</div>
				) : listQuery.isError ? (
					<div className="text-red-400">
						Failed to load organizations.{" "}
						<button
							type="button"
							className="underline"
							onClick={() => listQuery.refetch()}
						>
							Retry
						</button>
					</div>
				) : listQuery.data?.orgs?.length ? (
					<ul className="space-y-3 mt-2">
						{listQuery.data.orgs.map((o) => (
							<li key={o.id}>
								<Card>
									<CardHeader>
										<div className="flex items-center justify-between w-full">
											<div>
												<CardTitle>{o.name}</CardTitle>
											</div>
											<div>
												<Link
													to={`/organization/$orgId`}
													params={{ orgId: o.id }}
												>
													<Button size="sm">Manage</Button>
												</Link>
											</div>
										</div>
									</CardHeader>
									<CardContent>
										<div className="text-sm text-muted-foreground">
											Members: {o.members.length}
										</div>
										<div className="text-s text-muted-foreground">
											Jobs: {o.jobs.length}
										</div>
									</CardContent>
								</Card>
							</li>
						))}
					</ul>
				) : (
					<div className="text-gray-500 mt-2">No organizations yet</div>
				)}
			</div>
		</Container>
	);
}
