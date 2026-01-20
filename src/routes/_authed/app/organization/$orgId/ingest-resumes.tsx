import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useMatch } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Progress } from "~/components/ui/progress";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { useGlobalContext } from "~/utils/hooks";
import { readFileAsBase64 } from "~/utils/resume";

type JobWithOrg = {
	id: string;
	title: string | null;
	description: string;
	organization?: { id: string; name: string } | null;
};

export const Route = createFileRoute(
	"/_authed/app/organization/$orgId/ingest-resumes",
)({
	component: IngestResumesPage,
});

function IngestResumesPage() {
	const [files, setFiles] = useState<File[]>([]);
	const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
	const [processedCount, setProcessedCount] = useState(0);
	const [validationError, setValidationError] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);
	const [isPending, setIsPending] = useState(false);
	const { trpc } = useGlobalContext();

	const orgId = useMatch({
		from: "/_authed/app/organization/$orgId/ingest-resumes",
		select: (s) => s.params.orgId,
	});

	const applyM = useMutation(trpc.apply.mutationOptions());

	const jobsQuery = useQuery(trpc.listJobs.queryOptions());

	const { jobsById, orgJobs } = useMemo(() => {
		const jobs = jobsQuery.data?.jobs ?? [];
		const byId: Record<string, JobWithOrg> = {};
		const currentOrgJobs: JobWithOrg[] = [];

		for (const j of jobs) {
			const jOrgId = j.organization?.id ?? "__no_org__";
			byId[j.id] = j;

			// Only include jobs for the current organization
			if (jOrgId === orgId) {
				currentOrgJobs.push(j);
			}
		}
		return { jobsById: byId, orgJobs: currentOrgJobs };
	}, [jobsQuery.data?.jobs, orgId]);

	const selectedJob = selectedJobId ? jobsById[selectedJobId] : null;

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFiles = Array.from(e.target.files ?? []);
		// Filter to only PDF files
		const pdfFiles = selectedFiles.filter((f) => f.type === "application/pdf");
		setFiles(pdfFiles);
	};

	const removeFile = (index: number) => {
		setFiles(files.filter((_, i) => i !== index));
	};

	const submit = async (e: React.FormEvent) => {
		e.preventDefault();
		setValidationError(null);
		setSuccessMessage(null);

		if (files.length === 0) {
			setValidationError("Please select at least one PDF resume");
			return;
		}
		if (!selectedJobId) {
			setValidationError("Please select a job before uploading");
			return;
		}

		setIsPending(true);
		setProcessedCount(0);

		try {
			for (const file of files) {
				const base64 = (await readFileAsBase64(file)) as string;
				const contentBase64 = base64.replace(/^data:.*;base64,/, "");

				try {
					await applyM.mutateAsync({
						fileName: file.name,
						mimeType: file.type,
						contentBase64,
						jobId: selectedJobId,
						orgId: orgId,
					});
				} catch (_error) {}
				setProcessedCount((prev) => prev + 1);
			}

			// Reset form after all submissions
			setFiles([]);
			setSelectedJobId(null);
			setProcessedCount(0);
			setSuccessMessage(`Successfully submitted ${files.length} resume(s)`);
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			setValidationError(`Failed to read files: ${msg}`);
			setProcessedCount(0);
		} finally {
			setIsPending(false);
		}
	};

	return (
		<>
			<h2 className="text-2xl font-bold mb-4">Ingest Resumes</h2>
			<p className="text-gray-400 mb-6">
				Upload multiple resumes to be analyzed for a specific job.
			</p>

			<form onSubmit={submit} className="space-y-4">
				{/* Job Selection */}
				<div>
					<label htmlFor="job-select" className="block font-medium mb-2">
						Select Job
					</label>
					<Select
						value={selectedJobId ?? ""}
						onValueChange={(val) => setSelectedJobId(val || null)}
					>
						<SelectTrigger className="w-full">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{orgJobs.length > 0 ? (
								<SelectGroup>
									<SelectLabel>{orgJobs[0].organization?.name}</SelectLabel>
									{orgJobs.map((j) => (
										<SelectItem key={j.id} value={j.id}>
											{j.title ?? "Untitled"}
										</SelectItem>
									))}
								</SelectGroup>
							) : (
								<SelectGroup>
									<SelectLabel>No jobs available</SelectLabel>
								</SelectGroup>
							)}
						</SelectContent>
					</Select>
				</div>

				{/* Job Description Preview */}
				{selectedJob ? (
					<Card className="p-4 bg-gray-900 border border-gray-700">
						<h3 className="text-lg font-semibold mb-2">
							{selectedJob.title || "Untitled Job"}
						</h3>
						<div className="text-xs font-medium text-gray-400 mb-2">
							Job Description
						</div>
						<div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
							{selectedJob.description}
						</div>
					</Card>
				) : (
					<div className="text-sm text-gray-500 p-4 bg-gray-900 rounded border border-gray-700">
						Select a job to see its description
					</div>
				)}

				{/* File Upload */}
				<div>
					<label htmlFor="resume-files" className="block font-medium mb-2">
						Resumes
					</label>
					<Input
						id="resume-files"
						accept="application/pdf"
						multiple
						onChange={handleFileSelect}
						type="file"
					/>
					<p className="text-xs text-gray-500 mt-1">
						You can select multiple PDF files at once
					</p>
				</div>

				{/* File List */}
				{files.length > 0 && (
					<div className="mt-4">
						<div className="font-medium mb-2">
							Selected Files ({files.length})
						</div>
						<div className="space-y-2 max-h-48 overflow-y-auto">
							{files.map((file) => (
								<div
									key={`${file.name}-${file.size}`}
									className="flex items-center justify-between p-3 bg-gray-900 rounded border border-gray-700"
								>
									<div className="flex-1 truncate">
										<div className="text-sm font-medium text-gray-200">
											{file.name}
										</div>
										<div className="text-xs text-gray-500">
											{(file.size / 1024).toFixed(1)} KB
										</div>
									</div>
									<button
										type="button"
										onClick={() => removeFile(files.indexOf(file))}
										className="ml-2 text-gray-400 hover:text-red-400 transition"
									>
										✕
									</button>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Submit Button */}
				<div>
					{isPending ? (
						<div className="mt-4 space-y-2 mb-4">
							<Progress
								value={(processedCount / files.length) * 100}
								className="w-full"
							/>
							<p className="text-sm text-gray-400 text-center">
								Processing resume {processedCount} out of {files.length}
							</p>
						</div>
					) : (
						<Button
							type="submit"
							className="w-full"
							disabled={isPending || files.length === 0 || !selectedJobId}
						>
							Analyze {files.length} Resume{files.length !== 1 ? "s" : ""}
						</Button>
					)}
				</div>
			</form>

			{/* Status Message */}
			{validationError && (
				<div className="mt-4 p-4 bg-red-900 border border-red-700 rounded">
					<p className="text-red-200 text-sm">✗ {validationError}</p>
				</div>
			)}

			{successMessage && (
				<div className="mt-4 p-4 bg-green-900 border border-green-700 rounded">
					<p className="text-green-200 text-sm">✓ {successMessage}</p>
				</div>
			)}
		</>
	);
}
