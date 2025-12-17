import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Input } from "~/components/ui/input";

export function Auth({
	actionText,
	onSubmit,
	status,
	afterSubmit,
}: {
	actionText: string;
	onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
	status: "pending" | "idle" | "success" | "error";
	afterSubmit?: React.ReactNode;
}) {
	return (
		<div className="fixed inset-0 flex items-center justify-center">
			<div className="absolute inset-0 bg-black/50" />
			<Card className="relative max-w-md w-full mx-4">
				<div className="mb-2">
					<h1 className="text-2xl font-bold">{actionText}</h1>
				</div>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						onSubmit(e);
					}}
					className="space-y-4"
				>
					<div>
						<label htmlFor="email" className="block text-xs">
							Email
						</label>
						<Input type="email" name="email" id="email" />
					</div>
					<div>
						<label htmlFor="password" className="block text-xs">
							Password
						</label>
						<Input type="password" name="password" id="password" />
					</div>
					<Button
						type="submit"
						className="w-full"
						disabled={status === "pending"}
					>
						{status === "pending" ? "..." : actionText}
					</Button>
					{afterSubmit ? afterSubmit : null}
				</form>
			</Card>
		</div>
	);
}
