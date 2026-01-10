import { createFileRoute } from "@tanstack/react-router";
import { resolveResponse } from "@trpc/server/http";
import { authedProcedure, createTRPContext, t } from "~/utils/trpcServer";

const POSTS = [
	{ id: "1", title: "First post" },
	{ id: "2", title: "Second post" },
	{ id: "3", title: "Third post" },
	{ id: "4", title: "Fourth post" },
	{ id: "5", title: "Fifth post" },
	{ id: "6", title: "Sixth post" },
	{ id: "7", title: "Seventh post" },
	{ id: "8", title: "Eighth post" },
	{ id: "9", title: "Ninth post" },
	{ id: "10", title: "Tenth post" },
];

export const appRouter = t.router({
	hello: t.procedure.query(() => "Hello world!"),
	posts: authedProcedure.query(async (_) => {
		await new Promise((resolve) => setTimeout(resolve, 1000));
		return POSTS;
	}),
	post: authedProcedure.input(String).query(async (req) => {
		await new Promise((resolve) => setTimeout(resolve, 500));
		return POSTS.find((p) => p.id === req.input);
	}),
});

export type AppRouter = typeof appRouter;

export const Route = createFileRoute("/api/trpc/$")({
	server: {
		handlers: {
			ANY: async ({ request, pathname }) =>
				resolveResponse({
					req: request,
					createContext: (trpcCtx) => createTRPContext({ ...trpcCtx }),
					router: appRouter,
					error: null,
					onError: () => {}, // we ballin
					path: pathname.replace("/api/trpc/", ""),
				}),
		},
	},
});
