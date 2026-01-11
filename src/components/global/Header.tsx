import { Link, useRouterState } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import { useGlobalContext } from "~/utils/hooks";

export default function Header() {
	const { user } = useGlobalContext();
	const router = useRouterState();

	// Only show header on public pages (not /app)
	if (user) {
		return null;
	}

	return (
		<header className="bg-background/50 border-b relative">
			<nav className="max-w-6xl mx-auto p-4 flex items-center gap-6 text-lg">
				<Link to="/" activeProps={{ className: "font-bold" }}>
					<span className="text-2xl font-extrabold tracking-tight">
						FitFinder
					</span>
				</Link>

				<div className="flex items-center gap-4 text-sm opacity-90">
					<Link
						to="/"
						activeProps={{ className: "font-semibold" }}
						activeOptions={{ exact: true }}
					>
						Home
					</Link>
				</div>

				<div className="ml-auto flex items-center gap-3">
					<Link to="/login">
						<Button size="sm">Login</Button>
					</Link>
				</div>
			</nav>

			{router.isLoading && (
				<div className="relative bottom-0 left-0 right-0 h-0.5 bg-blue-500 animate-pulse z-50" />
			)}
		</header>
	);
}
