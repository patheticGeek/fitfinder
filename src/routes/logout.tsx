import { createFileRoute, redirect } from "@tanstack/react-router";
import { getAppSession } from "~/utils/session";

export const Route = createFileRoute("/logout")({
	preload: false,
	loader: async () => {
		const session = await getAppSession();
		session.clear();
		throw redirect({ href: "/" });
	},
});
