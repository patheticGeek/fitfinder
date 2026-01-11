import { useMutation } from "@tanstack/react-query";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import Header from "~/components/global/Header";
import { Button } from "~/components/ui/button";
import { ButtonGroup } from "~/components/ui/button-group";
import { Card } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { useGlobalContext } from "~/utils/hooks";

type AuthMode = "login" | "signup";

function Login({ initialMode = "login" }: { initialMode?: AuthMode }) {
	const router = useRouter();
	const [mode, setMode] = useState<AuthMode>(initialMode);
	const { trpc } = useGlobalContext();

	const isLogin = mode === "login";

	const loginMutation = useMutation({
		...trpc.login.mutationOptions(),
		onSuccess: async (data) => {
			if ("success" in data && data.success) {
				await router.invalidate();
				router.navigate({ to: "/app" });
			}
		},
	});

	const signupMutation = useMutation({
		...trpc.signup.mutationOptions(),
		onSuccess: async (data) => {
			if ("success" in data && data.success) {
				await router.invalidate();
				router.navigate({ to: "/app" });
			}
		},
	});

	const mutation = isLogin ? loginMutation : signupMutation;

	const handleModeChange = (nextMode: AuthMode) => {
		setMode(nextMode);
		loginMutation.reset();
		signupMutation.reset();
	};

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const payload = {
			email: formData.get("email") as string,
			password: formData.get("password") as string,
		};

		mutation.mutate(payload);
	};

	const errorData =
		mutation.data && "error" in mutation.data && mutation.data.error
			? mutation.data
			: null;

	const showSignupInstead =
		isLogin &&
		errorData &&
		"userNotFound" in errorData &&
		errorData.userNotFound;

	return (
		<>
			<Header />

			<div className="flex items-center justify-center py-12">
				<Card className="mx-4 w-full max-w-md">
					<ButtonGroup className="mb-4 w-full">
						<Button
							className="flex-1"
							onClick={() => handleModeChange("login")}
							type="button"
							variant={isLogin ? "default" : "outline"}
						>
							Login
						</Button>
						<Button
							className="flex-1"
							onClick={() => handleModeChange("signup")}
							type="button"
							variant={!isLogin ? "default" : "outline"}
						>
							Sign Up
						</Button>
					</ButtonGroup>

					<form onSubmit={handleSubmit} className="space-y-4">
						<div>
							<label htmlFor="email" className="block text-xs">
								Email
							</label>
							<Input type="email" name="email" id="email" required />
						</div>
						<div>
							<label htmlFor="password" className="block text-xs">
								Password
							</label>
							<Input type="password" name="password" id="password" required />
						</div>
						<Button
							type="submit"
							className="w-full"
							disabled={mutation.status === "pending"}
						>
							{mutation.status === "pending"
								? "..."
								: isLogin
									? "Login"
									: "Sign Up"}
						</Button>

						{errorData && (
							<div className="space-y-2 text-red-400">
								<div>{errorData.message}</div>
								{!!showSignupInstead && (
									<Button
										className="px-0 text-cyan-600 hover:text-cyan-700"
										onClick={() => handleModeChange("signup")}
										size="sm"
										type="button"
										variant="ghost"
									>
										Sign up instead
									</Button>
								)}
							</div>
						)}
					</form>
				</Card>
			</div>
		</>
	);
}

export const Route = createFileRoute("/login")({
	component: Login,
	beforeLoad: async ({ context }) => {
		const { user } = context;
		if (user) {
			throw redirect({ href: "/app" });
		}
	},
});
