import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type React from "react";
import { useMemo, useState } from "react";
import type {
	Education,
	Experience,
	InterviewQuestion,
	Project,
	Skill,
} from "~/api/mutations/applyResume";
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
import { useGlobalContext } from "~/utils/hooks";

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
	const [file, setFile] = useState<File | null>(null);
	const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
	const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

	const { trpc } = useGlobalContext();

	const mutation = useMutation(trpc.applyResume.mutationOptions());

	const jobsQuery = useQuery(trpc.listJobs.queryOptions());

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

	const selectedJob = selectedJobId ? jobsById[selectedJobId] : null;

	const submit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!file) return alert("Please select a PDF resume");

		if (!selectedJobId) return alert("Please select a job before uploading");

		try {
			const base64 = (await readFileAsBase64(file)) as string;
			const contentBase64 = base64.replace(/^data:.*;base64,/, "");
			mutation.mutate({
				fileName: file.name,
				mimeType: file.type,
				contentBase64,
				jobId: selectedJobId,
				orgId: selectedOrgId ?? undefined,
			});
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
											return;
										}
										const job = jobsById[id];
										if (job) {
											setSelectedOrgId(job.organization?.id ?? null);
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
							{selectedJob ? (
								<Card className="mt-2 p-4 bg-gray-50 dark:bg-gray-800">
									<h3 className="text-lg font-semibold mb-2">
										{selectedJob.title}
									</h3>
									<div className="text-sm font-medium text-muted-foreground mb-2">
										Job Description
									</div>
									<div className="text-sm whitespace-pre-wrap leading-relaxed">
										{selectedJob.description}
									</div>
								</Card>
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
				<Card className="mt-4 bg-gray-900 text-white space-y-4">
					<div>
						Saved id: <strong>{mutation.data.id}</strong>
					</div>
					<div>
						Match Score: <strong>{mutation.data.score}%</strong>
					</div>

					{mutation.data.scoreJustification && (
						<div>
							<div className="font-semibold">Score Justification</div>
							<p className="text-gray-300 mt-1">
								{mutation.data.scoreJustification}
							</p>
						</div>
					)}

					{mutation.data.currentLocation && (
						<div>
							<div className="font-semibold">Location</div>
							<p className="text-gray-300 mt-1">{mutation.data.currentLocation}</p>
						</div>
					)}

					{mutation.data.totalExperienceMonths !== null &&
						mutation.data.totalExperienceMonths !== undefined && (
							<div>
								<div className="font-semibold">Total Experience</div>
								<p className="text-gray-300 mt-1">
									{Math.floor(mutation.data.totalExperienceMonths / 12)} years{" "}
									{mutation.data.totalExperienceMonths % 12} months
								</p>
							</div>
						)}

					{mutation.data.education && mutation.data.education.length > 0 && (
						<div>
							<div className="font-semibold mb-2">Education</div>
							<div className="space-y-2">
								{(mutation.data.education as Education[]).map((edu, idx) => (
									<div key={`edu-${idx}`} className="text-sm">
										<div className="font-medium text-gray-200">
											{edu.degree || "Degree"} {edu.field && `in ${edu.field}`}
										</div>
										<div className="text-gray-400">{edu.institution}</div>
										{(edu.startDate || edu.endDate) && (
											<div className="text-gray-500 text-xs">
												{edu.startDate} - {edu.endDate || "Present"}
											</div>
										)}
									</div>
								))}
							</div>
						</div>
					)}

					{mutation.data.experience && mutation.data.experience.length > 0 && (
						<div>
							<div className="font-semibold mb-2">Experience</div>
							<div className="space-y-3">
								{(mutation.data.experience as Experience[]).map((exp, idx) => (
									<div key={`exp-${idx}`} className="text-sm">
										<div className="font-medium text-gray-200">
											{exp.title || "Position"}
										</div>
										<div className="text-gray-400">{exp.company}</div>
										{(exp.startDate || exp.endDate) && (
											<div className="text-gray-500 text-xs">
												{exp.startDate} - {exp.endDate || "Present"}
											</div>
										)}
										{exp.summary && (
											<div className="text-gray-400 text-xs mt-1">
												{exp.summary}
											</div>
										)}
									</div>
								))}
							</div>
						</div>
					)}

					{mutation.data.projects && mutation.data.projects.length > 0 && (
						<div>
							<div className="font-semibold mb-2">Projects</div>
							<div className="space-y-2">
								{(mutation.data.projects as Project[]).map((proj, idx) => (
									<div key={`proj-${idx}`} className="text-sm">
										<div className="font-medium text-gray-200">{proj.name}</div>
										{proj.description && (
											<div className="text-gray-400 text-xs mt-1">
												{proj.description}
											</div>
										)}
										{proj.technologies && proj.technologies.length > 0 && (
											<div className="flex flex-wrap gap-1 mt-1">
												{proj.technologies.map((tech: string) => (
													<span
														key={tech}
														className="text-xs bg-gray-700 px-2 py-0.5 rounded"
													>
														{tech}
													</span>
												))}
											</div>
										)}
									</div>
								))}
							</div>
						</div>
					)}

					{mutation.data.skills && mutation.data.skills.length > 0 && (
						<div>
							<div className="font-semibold mb-2">Skills</div>
							<div className="flex flex-wrap gap-2">
								{(mutation.data.skills as Skill[]).map((skill, idx) => (
									<span
										key={`skill-${idx}`}
										className="text-sm bg-gray-700 px-3 py-1 rounded-full"
									>
										{skill.name}
										{skill.level && (
											<span className="text-xs text-gray-400 ml-1">
												({skill.level})
											</span>
										)}
									</span>
								))}
							</div>
						</div>
					)}

					{mutation.data.questions && mutation.data.questions.length > 0 && (
						<div>
							<div className="font-semibold mb-2">Interview Questions</div>
							<ol className="list-decimal ml-6 space-y-2">
								{(mutation.data.questions as InterviewQuestion[]).map((q) => (
									<li key={q.text} className="text-sm">
										<div>{q.text}</div>
										{q.correctAnswer && (
											<div className="text-xs text-gray-400 mt-1">
												Suggested answer: {q.correctAnswer}
											</div>
										)}
										{(q.topic || q.confidence !== undefined) && (
											<div className="text-xs text-gray-500 mt-0.5">
												{q.topic && `Topic: ${q.topic}`}
												{q.topic && q.confidence !== undefined && " • "}
												{q.confidence !== undefined &&
													`Confidence: ${Math.round(q.confidence * 100)}%`}
											</div>
										)}
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
