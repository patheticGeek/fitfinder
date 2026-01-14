// src/start.ts
import { createMiddleware, createStart } from "@tanstack/react-start";

const globalMiddleware = createMiddleware().server(
	async ({ request, next }) => {
		const startTime = performance.now();

		const { response } = await next();

		const endTime = performance.now();
		const duration = ((endTime - startTime) / 1000).toFixed(2);
		console.log(
			`${request.method} ${request.url} - ${response.status} ${duration}s`,
		);

		return response;
	},
);

export const startInstance = createStart(() => {
	return {
		requestMiddleware: [globalMiddleware],
	};
});
