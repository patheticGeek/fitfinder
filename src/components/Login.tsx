import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import type { MouseEvent } from "react";
import { loginFn } from "~/routes/_authed";
import { signupFn } from "~/routes/signup";
import { Auth } from "./Auth";

export function Login() {
	const router = useRouter();

	const loginMutation = useMutation({
		mutationFn: loginFn,
		onSuccess: async (data) => {
			if (!data?.error) {
				await router.invalidate();
				router.navigate({ to: "/" });
				return;
			}
		},
	});

	const signupMutation = useMutation({
		mutationFn: useServerFn(signupFn),
	});

	return (
		<Auth
			actionText="Login"
			status={loginMutation.status}
			onSubmit={(e) => {
				const formData = new FormData(e.target as HTMLFormElement);

				loginMutation.mutate({
					data: {
						email: formData.get("email") as string,
						password: formData.get("password") as string,
					},
				});
			}}
			afterSubmit={
				loginMutation.data ? (
					<>
						<div className="text-red-400">{loginMutation.data.message}</div>
						{loginMutation.data.userNotFound ? (
							<div>
								<button
									className="text-blue-500"
									onClick={(e: MouseEvent<HTMLButtonElement>) => {
										const form = e.currentTarget.form;
										if (!form) return;
										const formData = new FormData(form);

										signupMutation.mutate({
											data: {
												email: formData.get("email") as string,
												password: formData.get("password") as string,
											},
										});
									}}
									type="button"
								>
									Sign up instead?
								</button>
							</div>
						) : null}
					</>
				) : null
			}
		/>
	);
}
