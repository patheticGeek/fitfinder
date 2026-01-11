import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useMatch } from "@tanstack/react-router";
import { type FormEvent, useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import Container from "~/components/ui/container";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { useGlobalContext } from "~/utils/hooks";

export const Route = createFileRoute(
	"/_authed/app/organization/$orgId/job/$jobId/",
)({
	component: JobEditPage,
});

function JobEditPage() {
	const { orgId, jobId } = useMatch({
		from: "/_authed/app/organization/$orgId/job/$jobId/",
		select: (s) => s.params,
	});

	const { trpc } = useGlobalContext();

	const q = useQuery(trpc.getJob.queryOptions({ orgId, jobId }));
	const updateJobMutation = useMutation(trpc.updateJob.mutationOptions());

	const job = q.data?.job;

	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [additionalInstructions, setAdditionalInstructions] = useState("");
	const [suggestedQuestions, setSuggestedQuestions] = useState("");
	const [hydrated, setHydrated] = useState(false);

	useEffect(() => {
		if (job && !hydrated) {
			setTitle(job.title ?? "");
			setDescription(job.description ?? "");
			setAdditionalInstructions(job.additionalInstructions ?? "");
			setSuggestedQuestions(job.suggestedQuestions ?? "");
			setHydrated(true);
		}
	}, [job, hydrated]);

	const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (!title || !description) {
			alert("Title and description are required");
			return;
		}

		updateJobMutation.mutate(
			{
				orgId,
				jobId,
				title,
				description,
				additionalInstructions,
				suggestedQuestions,
			},
			{ onSuccess: () => q.refetch() },
		);
	};

	return (
		<Container size="md">
			<div className="flex items-center justify-between">
				<h2 className="text-xl font-bold">Edit Job</h2>
				<div className="flex gap-2">
					<Link to="/app/organization/$orgId" params={{ orgId }}>
						<Button variant="outline" size="sm">
							Back to Org
						</Button>
					</Link>
					<Link
						to="/app/organization/$orgId/job/$jobId/candidates"
						params={{ orgId, jobId }}
					>
						<Button size="sm" variant="secondary">
							View Candidates
						</Button>
					</Link>
				</div>
			</div>

			{q.isLoading ? (
				<div className="mt-4 text-sm text-muted-foreground">Loading…</div>
			) : q.isError ? (
				<div className="mt-4 text-red-400">Failed to load job.</div>
			) : (
				<form className="mt-6 space-y-4" onSubmit={handleSubmit}>
					<div>
						<label htmlFor="job-title" className="text-sm font-medium">
							Title
						</label>
						<Input
							id="job-title"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="Job title"
							className="mt-1"
						/>
					</div>

					<div>
						<label htmlFor="job-description" className="text-sm font-medium">
							Description
						</label>
						<Textarea
							id="job-description"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Role description"
							className="mt-1"
							rows={6}
						/>
					</div>

					<div>
						<label
							htmlFor="job-additionalInstructions"
							className="text-sm font-medium"
						>
							Additional Instructions
						</label>
						<Textarea
							id="job-additionalInstructions"
							value={additionalInstructions}
							onChange={(e) => setAdditionalInstructions(e.target.value)}
							placeholder="LLM guidance: hard must-haves, red flags, context to evaluate in the resume"
							className="mt-1"
							rows={4}
						/>
					</div>

					<div>
						<label
							htmlFor="job-suggestedQuestions"
							className="text-sm font-medium"
						>
							Suggested Questions
						</label>
						<Textarea
							id="job-suggestedQuestions"
							value={suggestedQuestions}
							onChange={(e) => setSuggestedQuestions(e.target.value)}
							placeholder="Optional: suggested questions & answers"
							className="mt-1"
							rows={4}
						/>
					</div>

					<div className="flex items-center gap-2">
						<Button type="submit" disabled={updateJobMutation.isPending}>
							{updateJobMutation.isPending ? "Saving…" : "Save Changes"}
						</Button>
						{updateJobMutation.isError && (
							<span className="text-sm text-red-400">Failed to save.</span>
						)}
						{updateJobMutation.isSuccess && (
							<span className="text-sm text-green-400">Saved.</span>
						)}
					</div>
				</form>
			)}
		</Container>
	);
}
