import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useMatch } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardHeader } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { useGlobalContext } from "~/utils/hooks";

export const Route = createFileRoute("/_authed/organization/$orgId/members")({
	component: MembersPage,
});

function MembersPage() {
	const { trpc, user } = useGlobalContext();

	const orgId = useMatch({
		from: "/_authed/organization/$orgId/members",
		select: (s) => s.params.orgId,
	});

	const q = useQuery(trpc.getOrganization.queryOptions({ orgId }));

	const org = q.data?.org;
	const members = org?.members ?? [];
	
	// Check if current user is admin
	const currentUserMembership = members.find((m) => m.user.id === user?.id);
	const isAdmin = currentUserMembership?.isAdmin ?? false;

	const [memberEmail, setMemberEmail] = useState("");
	const [adminEmail, setAdminEmail] = useState("");

	const addMemberMutation = useMutation(trpc.addMember.mutationOptions());
	const addAdminMutation = useMutation(trpc.addAdmin.mutationOptions());

	function refresh() {
		q.refetch();
	}

	return (
		<div className="max-w-4xl">
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="text-3xl font-bold">Team Members</h1>
					<p className="text-muted-foreground mt-1">
						Manage members and admins for {org?.name}
					</p>
				</div>
			</div>

			{!isAdmin && (
				<Card className="mb-6 border-yellow-900/50 bg-yellow-900/10">
					<CardHeader>
						<p className="text-sm text-yellow-300">
							You don't have permission to add members. Only admins can manage team members.
						</p>
					</CardHeader>
				</Card>
			)}

			{/* Add Member Form */}
			<Card className="mb-6">
				<CardHeader>
					<div className="font-semibold text-lg mb-4">Add Team Member</div>
					{!isAdmin ? (
						<p className="text-sm text-muted-foreground">
							Only admins can add members to this organization.
						</p>
					) : (
						<form
							onSubmit={(e) => {
								e.preventDefault();
								if (!memberEmail.trim()) return alert("Enter an email");
								addMemberMutation.mutate(
									{ orgId, userEmail: memberEmail },
									{
										onSuccess: () => {
											setMemberEmail("");
											refresh();
										},
									},
								);
							}}
							className="space-y-3"
						>
							<div>
								<label
									htmlFor="member-email"
									className="text-sm font-medium mb-1 block"
								>
									Email Address
								</label>
								<Input
									id="member-email"
									type="email"
									value={memberEmail}
									onChange={(e) => setMemberEmail(e.target.value)}
									className="flex-1"
									placeholder="user@example.com"
								/>
							</div>
							<Button type="submit" disabled={addMemberMutation.isPending}>
								{addMemberMutation.isPending ? "Adding..." : "Add as Member"}
							</Button>
						</form>
					)}
				</CardHeader>
			</Card>

			{/* Add Admin Form */}
			<Card className="mb-6">
				<CardHeader>
					<div className="font-semibold text-lg mb-4">Promote to Admin</div>
					{!isAdmin ? (
						<p className="text-sm text-muted-foreground">
							Only admins can promote members to admin role.
						</p>
					) : (
						<form
							onSubmit={(e) => {
								e.preventDefault();
								if (!adminEmail.trim()) return alert("Enter an email");
								addAdminMutation.mutate(
									{ orgId, userEmail: adminEmail },
									{
										onSuccess: () => {
											setAdminEmail("");
											refresh();
										},
									},
								);
							}}
							className="space-y-3"
						>
							<div>
								<label
									htmlFor="admin-email"
									className="text-sm font-medium mb-1 block"
								>
									Email Address
								</label>
								<Input
									id="admin-email"
									type="email"
									value={adminEmail}
									onChange={(e) => setAdminEmail(e.target.value)}
									className="flex-1"
									placeholder="user@example.com"
								/>
							</div>
							<Button type="submit" disabled={addAdminMutation.isPending}>
								{addAdminMutation.isPending ? "Adding..." : "Add as Admin"}
							</Button>
						</form>
					)}
				</CardHeader>
			</Card>

			{/* Members List */}
			<div>
				<h2 className="text-xl font-semibold mb-4">All Members</h2>
				{q.isLoading ? (
					<div className="space-y-3">
						<div className="h-20 bg-gray-800 rounded animate-pulse" />
						<div className="h-20 bg-gray-800 rounded animate-pulse" />
						<div className="h-20 bg-gray-800 rounded animate-pulse" />
					</div>
				) : q.isError ? (
					<div className="text-red-400">
						Failed to load members.{" "}
						<button
							type="button"
							className="underline"
							onClick={() => q.refetch()}
						>
							Retry
						</button>
					</div>
				) : members.length ? (
					<div className="space-y-3">
						{members.map((member) => (
							<Card key={member.user.id}>
								<CardHeader>
									<div className="flex items-center justify-between">
										<div className="flex-1 min-w-0">
											<h3 className="text-lg font-medium truncate">
												{member.user.email}
											</h3>
											<div className="text-sm text-muted-foreground mt-1">
												User ID: {member.user.id.slice(0, 8)}...
											</div>
										</div>
										<div className="flex items-center gap-3">
											<span
												className={`px-3 py-1 rounded-full text-xs font-medium ${
													member.isAdmin
														? "bg-blue-900/50 text-blue-300"
														: "bg-gray-800 text-gray-300"
												}`}
											>
												{member.isAdmin ? "Admin" : "Member"}
											</span>
										</div>
									</div>
								</CardHeader>
							</Card>
						))}
					</div>
				) : (
					<Card>
						<CardHeader>
							<div className="text-center py-8 text-muted-foreground">
								No members yet. Add your first admin above to get started.
							</div>
						</CardHeader>
					</Card>
				)}
			</div>
		</div>
	);
}
