/// <reference types="vite/client" />
import "@fontsource-variable/noto-sans";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { createServerFn } from "@tanstack/react-start";
import type { createTRPCClient } from "@trpc/client";
import type { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import type * as React from "react";
import { DefaultCatchBoundary } from "~/components/DefaultCatchBoundary.js";
import Header from "~/components/global/Header";
import { NotFound } from "~/components/NotFound.js";
import appCss from "~/styles/app.css?url";
import { prismaClient } from "~/utils/prisma";
import { seo } from "~/utils/seo.js";
import { getAppSession } from "~/utils/session.js";
import type { AppRouter } from "./api/trpc/$";

const fetchUser = createServerFn({ method: "GET" }).handler(async () => {
	// We need to auth on the server so we have access to secure cookies
	const session = await getAppSession();

	if (!session.data.userId) {
		return null;
	}

	return await prismaClient.user.findUnique({
		where: { id: session.data.userId },
		omit: { password: true },
	});
});

export const Route = createRootRouteWithContext<{
	queryClient: QueryClient;
	trpcClient: ReturnType<typeof createTRPCClient<AppRouter>>;
	trpc: ReturnType<typeof createTRPCOptionsProxy<AppRouter>>;
}>()({
	beforeLoad: async () => {
		const user = await fetchUser();

		return {
			user,
		};
	},
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			...seo({
				description: `Your AI-powered resume screening tool designed to help employers find the best candidates efficiently.`,
			}),
		],
		links: [
			{ rel: "stylesheet", href: appCss },
			{
				rel: "apple-touch-icon",
				sizes: "180x180",
				href: "/apple-touch-icon.png",
			},
			{
				rel: "icon",
				type: "image/png",
				sizes: "32x32",
				href: "/favicon-32x32.png",
			},
			{
				rel: "icon",
				type: "image/png",
				sizes: "16x16",
				href: "/favicon-16x16.png",
			},
			{ rel: "manifest", href: "/site.webmanifest", color: "#fffff" },
			{ rel: "icon", href: "/favicon.ico" },
		],
	}),
	errorComponent: (props) => {
		return (
			<RootDocument>
				<DefaultCatchBoundary {...props} />
			</RootDocument>
		);
	},
	notFoundComponent: () => <NotFound />,
	component: RootComponent,
});

function RootComponent() {
	return (
		<RootDocument>
			<Outlet />
		</RootDocument>
	);
}

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body>
				<Header />
				{children}
				<Scripts />
				<ReactQueryDevtools buttonPosition="bottom-right" />
				<TanStackRouterDevtools position="bottom-right" />
			</body>
		</html>
	);
}
