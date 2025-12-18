import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import type React from "react";
import { useMemo, useState } from "react";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import Container from "~/components/ui/container";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { applyResumeFn, listJobsFn } from "./apply.fn";

type JobWithOrg = {
	id: string;
	title: string | null;
	description: string;
	organization?: { id: string; name: string } | null;
};

export const Route = createFileRoute("/_authed/apply")({
	component: ApplyPage,
});

function ApplyPage() {
	const [jobDescription, setJobDescription] = useState("");
	const [file, setFile] = useState<File | null>(null);
	const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
	const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

	const mutation = useMutation({
		mutationFn: useServerFn(applyResumeFn),
	});
	const listJobsServer = useServerFn(listJobsFn);
	const jobsQuery = useQuery({
		queryKey: ["jobs"],
		queryFn: async () => {
			const res = await listJobsServer();
			return res;
		},
	});

	const { jobsByOrg, jobsById } = useMemo(() => {
		const jobs = jobsQuery.data?.jobs ?? [];
		const byOrg: Record<string, { name: string; jobs: JobWithOrg[] }> = {};
		const byId: Record<string, JobWithOrg> = {};
		for (const j of jobs) {
			const orgId = j.organization?.id ?? "__no_org__";
			if (!byOrg[orgId])
				byOrg[orgId] = { name: j.organization?.name ?? "(No Org)", jobs: [] };
			byOrg[orgId].jobs.push(j);
			byId[j.id] = j;
		}
		return { jobsByOrg: byOrg, jobsById: byId };
	}, [jobsQuery.data?.jobs]);

	const submit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!file) return alert("Please select a PDF resume");

		if (!selectedJobId) return alert("Please select a job before uploading");

		try {
			const base64 = (await readFileAsBase64(file)) as string;
			const contentBase64 = base64.replace(/^data:.*;base64,/, "");
			mutation.mutate(
				{
					data: {
						fileName: file.name,
						mimeType: file.type,
						contentBase64,
						jobDescription,
						jobId: selectedJobId,
						orgId: selectedOrgId ?? undefined,
					},
				},
				{
					onError(err) {
						console.log(err);
					},
				},
			);
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			alert(`Failed to read file: ${msg}`);
		}
	};

	return (
		<Container size="md">
			<Card className="mb-4">
				<h2 className="text-xl font-bold mb-2">Apply</h2>
				<div>
					<form onSubmit={submit} className="space-y-3">
						<div>
							<label htmlFor="resume-file" className="block font-medium">
								Resume (PDF)
							</label>
							<input
								id="resume-file"
								accept="application/pdf"
								onChange={(e) => setFile(e.target.files?.[0] ?? null)}
								type="file"
								className="mt-1"
							/>
						</div>
						<div>
							<label htmlFor="job-select" className="block font-medium">
								Select Job (required)
							</label>
							<div>
								<Select
									value={selectedJobId ?? ""}
									onValueChange={(val) => {
										const id = val || null;
										setSelectedJobId(id);
										if (!id) {
											setSelectedOrgId(null);
											setJobDescription("");
											return;
										}
										const job = jobsById[id];
										if (job) {
											setSelectedOrgId(job.organization?.id ?? null);
											setJobDescription(job.description ?? "");
										}
									}}
								>
									<SelectTrigger className="w-full">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{Object.keys(jobsByOrg).map((orgId) => (
											<SelectGroup key={orgId}>
												<SelectLabel>{jobsByOrg[orgId].name}</SelectLabel>
												{jobsByOrg[orgId].jobs.map((j) => (
													<SelectItem key={j.id} value={j.id}>
														{j.title ?? "Untitled"}
													</SelectItem>
												))}
											</SelectGroup>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
						<div>
							{selectedJobId ? (
								<div className="mt-2 text-sm">
									<h3 className="text-xl font-semibold mb-1">
										{jobsById[selectedJobId ?? ""]?.title}
									</h3>
									<div className="mt-1 whitespace-pre-wrap">
										{jobsById[selectedJobId ?? ""]?.description}
									</div>
								</div>
							) : (
								<div className="mt-2 text-sm text-gray-600">
									No job selected
								</div>
							)}
						</div>

						<div>
							<Button
								type="submit"
								className="w-full"
								disabled={mutation.isPending}
							>
								{mutation.isPending ? "Uploading..." : "Apply and Analyze"}
							</Button>
						</div>
					</form>
				</div>
			</Card>

			{mutation.data ? (
				<Card className="mt-4 bg-gray-900 text-white">
					<div>
						Saved id: <strong>{mutation.data.id}</strong>
					</div>
					<div>
						Match Score: <strong>{mutation.data.score}%</strong>
					</div>
					{mutation.data.scoreJustification && (
						<div className="mt-2">
							<div className="font-semibold">Score Justification</div>
							<p className="text-gray-300 mt-1">
								{mutation.data.scoreJustification}
							</p>
						</div>
					)}
					{mutation.data.questions && (
						<div className="mt-2">
							<div className="font-semibold">Generated Questions</div>
							<ol className="list-decimal ml-6">
								{mutation.data.questions.map((q) => (
									<li key={q.text}>
										{q.text} - {q.topic} - {q.confidence}
									</li>
								))}
							</ol>
						</div>
					)}
				</Card>
			) : null}
		</Container>
	);
}

function readFileAsBase64(file: File) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onerror = () => reject(new Error("File read error"));
		reader.onload = () => resolve(reader.result as string);
		reader.readAsDataURL(file);
	});
}
