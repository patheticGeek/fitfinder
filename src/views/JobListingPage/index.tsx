"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Upload } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Spinner } from "~/components/ui/spinner";
import { useGlobalContext } from "~/utils/hooks";
import { readFileAsBase64 } from "~/utils/resume";

interface JobListingPageProps {
	jobId: string;
}

export function JobListingPage({ jobId }: JobListingPageProps) {
	const { trpc } = useGlobalContext();
	const navigate = useNavigate();
	const [selectedFile, setSelectedFile] = useState<File | null>(null);

	const jobQuery = useQuery(trpc.getPublicJobListing.queryOptions({ jobId }));
	const applyMutation = useMutation(trpc.applyToJob.mutationOptions());

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file && file.type === "application/pdf") {
			setSelectedFile(file);
		} else if (file) {
			alert("Please select a PDF file");
		}
	};

	const handleApply = async () => {
		if (!selectedFile) {
			alert("Please select a PDF resume");
			return;
		}

		try {
			const base64 = (await readFileAsBase64(selectedFile)) as string;
			const contentBase64 = base64.replace(/^data:.*;base64,/, "");

			const result = await applyMutation.mutateAsync({
				fileName: selectedFile.name,
				mimeType: selectedFile.type,
				contentBase64,
				jobId,
			});

			// Redirect to apply page with the invite code
			if (result.inviteCode) {
				navigate({
					to: "/apply/$jobId/$code",
					params: { jobId, code: result.inviteCode },
				});
			} else {
				alert("Application submitted, but failed to generate invite code");
			}
		} catch (err) {
			const message =
				err instanceof Error ? err.message : "Failed to submit application";
			alert(message);
		}
	};

	if (jobQuery.isLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center p-6">
				<Card className="w-full max-w-2xl">
					<CardHeader className="text-center">
						<div className="flex justify-center">
							<Spinner className="size-8" />
						</div>
						<CardTitle className="mt-4">Loading job listing</CardTitle>
					</CardHeader>
				</Card>
			</div>
		);
	}

	if (jobQuery.isError) {
		return (
			<div className="flex min-h-screen items-center justify-center p-6">
				<Card className="w-full max-w-2xl">
					<CardHeader className="text-center">
						<CardTitle className="text-destructive">
							Failed to load job listing
						</CardTitle>
						<CardDescription className="mt-2">
							{jobQuery.error instanceof Error
								? jobQuery.error.message
								: "The job may not exist or may have been removed."}
						</CardDescription>
					</CardHeader>
				</Card>
			</div>
		);
	}

	const job = jobQuery.data?.job;
	if (!job) {
		return null;
	}

	const formatDate = (date: Date | string) => {
		const dateObj = typeof date === "string" ? new Date(date) : date;
		return new Intl.DateTimeFormat("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
		}).format(dateObj);
	};


	return (
		<div className="min-h-screen bg-background">
			<div className="max-w-3xl mx-auto p-6 space-y-6">
				{/* Job Header */}
				<Card>
					<CardHeader>
						<CardDescription className="text-base">
							{job.organization.name}
						</CardDescription>
						<CardTitle className="text-3xl">{job.title || "Untitled Job"}</CardTitle>
						<div className="flex gap-4 text-sm text-muted-foreground pt-2">
							<div>
								<span className="font-medium">Posted:</span>{" "}
								{formatDate(job.createdAt)}
							</div>
						</div>
					</CardHeader>
				</Card>

				{/* Job Description */}
				<Card>
					<CardHeader>
						<CardTitle>Job Description</CardTitle>
					</CardHeader>
					<div className="p-6 pt-0">
						<div className="prose prose-sm max-w-none">
							<div className="whitespace-pre-wrap text-muted-foreground">
								{job.description}
							</div>
						</div>
					</div>
				</Card>

				{/* Apply Section */}
				<Card>
					<CardHeader>
						<CardTitle>Apply for this Position</CardTitle>
						<CardDescription>
							Upload your resume (PDF) to apply. Your resume will be evaluated
							immediately.
						</CardDescription>
					</CardHeader>
					<div className="p-6 pt-0 space-y-4">
						<div>
							<label
								htmlFor="resume-upload"
								className="block text-sm font-medium mb-2"
							>
								Resume (PDF only)
							</label>
							<div className="flex gap-3">
								<Input
									id="resume-upload"
									type="file"
									accept="application/pdf"
									onChange={handleFileSelect}
									className="flex-1"
								/>
								{selectedFile && (
									<div className="flex items-center gap-2 text-sm text-muted-foreground">
										<Upload className="size-4" />
										{selectedFile.name}
									</div>
								)}
							</div>
						</div>
						<Button
							onClick={handleApply}
							disabled={!selectedFile || applyMutation.isPending}
							className="w-full"
							size="lg"
						>
							{applyMutation.isPending ? (
								<>
									<Spinner className="size-4 mr-2" />
									Evaluating Resume...
								</>
							) : (
								"Submit Application"
							)}
						</Button>
					</div>
				</Card>
			</div>
		</div>
	);
}
