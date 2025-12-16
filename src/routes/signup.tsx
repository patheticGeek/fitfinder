import { useMutation } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn, useServerFn } from "@tanstack/react-start";
import { Auth } from "~/components/Auth";
import { hashPassword, prismaClient } from "~/utils/prisma";
import { getAppSession } from "~/utils/session";

export const signupFn = createServerFn({ method: "POST" })
	.inputValidator(
		(d: { email: string; password: string; redirectUrl?: string }) => d,
	)
	.handler(async ({ data }) => {
		// Check if the user already exists
		const found = await prismaClient.user.findUnique({
			where: {
				email: data.email,
			},
		});

		// Encrypt the password using Sha256 into plaintext
		const password = await hashPassword(data.password);

		// Create a session
		const session = await getAppSession();

		if (found) {
			if (found.password !== password) {
				return {
					error: true,
					userExists: true,
					message: "User already exists",
				};
			}

			// Store the user's email in the session
			await session.update({
				userEmail: found.email,
			});

			// Redirect to the prev page stored in the "redirect" search param
			throw redirect({
				href: data.redirectUrl || "/",
			});
		}

		// Create the user
		const user = await prismaClient.user.create({
			data: {
				email: data.email,
				password,
			},
		});

		// Store the user's email in the session
		await session.update({
			userEmail: user.email,
		});

		// Redirect to the prev page stored in the "redirect" search param
		throw redirect({
			href: data.redirectUrl || "/",
		});
	});

export const Route = createFileRoute("/signup")({
	component: SignupComp,
});

function SignupComp() {
	const signupMutation = useMutation({
		mutationFn: useServerFn(signupFn),
	});

	return (
		<Auth
			actionText="Sign Up"
			status={signupMutation.status}
			onSubmit={(e) => {
				const formData = new FormData(e.target as HTMLFormElement);

				signupMutation.mutate({
					data: {
						email: formData.get("email") as string,
						password: formData.get("password") as string,
					},
				});
			}}
			afterSubmit={
				signupMutation.data?.error ? (
					<>
						<div className="text-red-400">{signupMutation.data.message}</div>
					</>
				) : null
			}
		/>
	);
}
