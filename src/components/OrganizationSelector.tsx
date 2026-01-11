import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "@tanstack/react-router";
import { Check, ChevronsUpDown } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { useGlobalContext } from "~/utils/hooks";

export function OrganizationSelector() {
	const { trpc } = useGlobalContext();
	const router = useRouter();

	// Get orgId from URL params - works for all child routes
	const params = useParams({ strict: false }) as { orgId?: string };
	const currentOrgId = params.orgId;

	const listQuery = useQuery(trpc.listOrganizations.queryOptions());

	const currentOrg = listQuery.data?.orgs?.find((o) => o.id === currentOrgId);

	if (listQuery.isLoading) {
		return (
			<div className="flex items-center gap-2 px-2">
				<div className="h-8 w-full bg-gray-700 rounded animate-pulse" />
			</div>
		);
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				className="w-full flex items-center justify-between border px-3 py-2 text-sm"
				disabled={!listQuery.data?.orgs?.length}
			>
				<span className="truncate">
					{currentOrg?.name || "Select Organization"}
				</span>
				<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-56" align="start">
				{listQuery.data?.orgs?.map((org) => (
					<DropdownMenuItem
						key={org.id}
						onClick={() => {
							router.navigate({
								to: "/app/organization/$orgId",
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
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
