import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "@tanstack/react-router";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Input } from "~/components/ui/input";
import { useGlobalContext } from "~/utils/hooks";

export function OrganizationSelector() {
	const { trpc } = useGlobalContext();
	const router = useRouter();
	const queryClient = useQueryClient();
	const [isCreating, setIsCreating] = useState(false);
	const [newOrgName, setNewOrgName] = useState("");

	// Get orgId from URL params - works for all child routes
	const params = useParams({ strict: false }) as { orgId?: string };
	const currentOrgId = params.orgId;

	const listQuery = useQuery(trpc.listOrganizations.queryOptions());
	const createMutation = useMutation(trpc.createOrganization.mutationOptions());

	const currentOrg = listQuery.data?.orgs?.find((o) => o.id === currentOrgId);

	const handleCreateOrg = (e: React.FormEvent) => {
		e.preventDefault();
		if (!newOrgName.trim()) return;

		createMutation.mutate(
			{ name: newOrgName },
			{
				onSuccess: (data) => {
					queryClient.invalidateQueries({ queryKey: ["organizations"] });
					setNewOrgName("");
					setIsCreating(false);
					if (data.org) {
						router.navigate({
							to: "/organization/$orgId",
							params: { orgId: data.org.id },
						});
					}
				},
			},
		);
	};

	if (listQuery.isLoading) {
		return (
			<div className="flex items-center gap-2 px-2">
				<div className="h-8 w-full bg-gray-700 rounded animate-pulse" />
			</div>
		);
	}

	return (
		<DropdownMenu>
			<Button
				onClick={(e) => {
					e.preventDefault();
				}}
				variant="outline"
				className="w-full justify-between"
				disabled={!listQuery.data?.orgs?.length}
			>
				<DropdownMenuTrigger className="w-full flex items-center justify-between">
					<span className="truncate">
						{currentOrg?.name || "Select Organization"}
					</span>
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</DropdownMenuTrigger>
			</Button>
			<DropdownMenuContent className="w-56" align="start">
				<DropdownMenuLabel>Organizations</DropdownMenuLabel>
				<DropdownMenuSeparator />
				{listQuery.data?.orgs?.map((org) => (
					<DropdownMenuItem
						key={org.id}
						onSelect={() => {
							router.navigate({
								to: "/organization/$orgId",
								params: { orgId: org.id },
							});
						}}
						className="cursor-pointer flex items-center"
					>
						<Check
							className={`mr-2 h-4 w-4 ${
								currentOrg?.id === org.id ? "opacity-100" : "opacity-0"
							}`}
						/>
						<span className="truncate">{org.name}</span>
					</DropdownMenuItem>
				))}
				<DropdownMenuSeparator />
				{isCreating ? (
					<form onSubmit={handleCreateOrg} className="px-2 py-2">
						<Input
							placeholder="Organization name"
							value={newOrgName}
							onChange={(e) => setNewOrgName(e.target.value)}
							autoFocus
							onBlur={() => {
								setTimeout(() => {
									if (!newOrgName.trim()) {
										setIsCreating(false);
									}
								}, 200);
							}}
						/>
						<div className="flex gap-2 mt-2">
							<Button
								type="submit"
								size="sm"
								disabled={createMutation.isPending || !newOrgName.trim()}
								className="flex-1"
							>
								{createMutation.isPending ? "Creating..." : "Create"}
							</Button>
							<Button
								type="button"
								size="sm"
								variant="outline"
								onClick={() => {
									setIsCreating(false);
									setNewOrgName("");
								}}
							>
								Cancel
							</Button>
						</div>
					</form>
				) : (
					<DropdownMenuItem
						onSelect={() => setIsCreating(true)}
						className="cursor-pointer"
					>
						<Plus className="mr-2 h-4 w-4" />
						<span>Create Organization</span>
					</DropdownMenuItem>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
