import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useMatch } from "@tanstack/react-router";
import { useState } from "react";
import type {
	Education,
	Experience,
	InterviewQuestion,
	Project,
	Skill,
} from "~/api/mutations/applyResume";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import Container from "~/components/ui/container";
import { useGlobalContext } from "~/utils/hooks";

export const Route = createFileRoute(
	"/_authed/app/organization/$orgId/job/$jobId/candidates",
)({
	component: CandidatesPage,
});

function CandidatesPage() {
	const { orgId, jobId } = useMatch({
		from: "/_authed/app/organization/$orgId/job/$jobId/candidates",
		select: (s) => s.params,
	});

	const { trpc } = useGlobalContext();

	const q = useQuery(trpc.getJobCandidates.queryOptions({ orgId, jobId }));

	const job = q.data?.job;
	const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);

	const selectedResume = job?.resumes?.find((r) => r.id === selectedResumeId);

	return (
		<Container size="md">
			<div className="flex items-center justify-between">
				<h2 className="text-xl font-bold">
					Candidates for {job?.title ?? "Job"}
				</h2>
			</div>

			{q.isLoading ? (
				<div className="mt-4">Loading…</div>
			) : q.isError ? (
				<div className="mt-4 text-red-400">Failed to load candidates</div>
			) : (
				<div className="mt-4 space-y-3">
					{job?.resumes?.length ? (
						job.resumes.map((r) => (
							<Card key={r.id}>
								<CardHeader>
									<div className="flex items-center justify-between w-full">
										<div className="font-medium">{r.fileName}</div>
										<div className="flex items-center gap-2">
											<div className="text-sm text-muted-foreground">
												{r.user?.email ?? "unknown"}
											</div>
											<Button
												size="sm"
												variant="outline"
												onClick={() => setSelectedResumeId(r.id)}
											>
												Details
											</Button>
										</div>
									</div>
								</CardHeader>
								<CardContent>
									<div className="text-sm">Score: {r.score ?? "-"}%</div>
									{r.scoreJustification && (
										<div className="text-xs text-muted-foreground mt-2">
											{r.scoreJustification}
										</div>
									)}
								</CardContent>
							</Card>
						))
					) : (
						<div className="text-muted-foreground">
							No candidates have applied yet.
						</div>
					)}
				</div>
			)}

			{selectedResume && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
					<Card className="max-w-3xl w-full max-h-[90vh] overflow-y-auto">
						<CardHeader className="sticky top-0 bg-background border-b">
							<div className="flex items-center justify-between">
								<div>
									<h3 className="text-lg font-semibold">
										{selectedResume.fileName}
									</h3>
									<div className="text-sm text-muted-foreground">
										{selectedResume.user?.email ?? "unknown"}
									</div>
								</div>
								<Button
									size="sm"
									variant="ghost"
									onClick={() => setSelectedResumeId(null)}
								>
									Close
								</Button>
							</div>
						</CardHeader>
						<CardContent className="space-y-4 mt-4">
							<div>
								<div className="text-sm font-medium">Match Score</div>
								<div className="text-2xl font-bold">
									{selectedResume.score ?? "-"}%
								</div>
							</div>

							{selectedResume.scoreJustification && (
								<div>
									<div className="text-sm font-medium mb-1">
										Score Justification
									</div>
									<div className="text-sm text-muted-foreground">
										{selectedResume.scoreJustification}
									</div>
								</div>
							)}

							{selectedResume.currentLocation && (
								<div>
									<div className="text-sm font-medium mb-1">Location</div>
									<div className="text-sm text-muted-foreground">
										{selectedResume.currentLocation}
									</div>
								</div>
							)}
							{(selectedResume.email || selectedResume.phone) && (
								<div>
									<div className="text-sm font-medium mb-1">
										Contact Information
									</div>
									<div className="text-sm text-muted-foreground space-y-1">
										{selectedResume.email && (
											<div className="flex items-center gap-2">
												<span className="font-medium">Email:</span>
												<a
													href={`mailto:${selectedResume.email}`}
													className="hover:underline"
												>
													{selectedResume.email}
												</a>
											</div>
										)}
										{selectedResume.phone && (
											<div className="flex items-center gap-2">
												<span className="font-medium">Phone:</span>
												<a
													href={`tel:${selectedResume.phone}`}
													className="hover:underline"
												>
													{selectedResume.phone}
												</a>
											</div>
										)}
									</div>
								</div>
							)}
							{selectedResume.totalExperienceMonths !== null &&
								selectedResume.totalExperienceMonths !== undefined && (
									<div>
										<div className="text-sm font-medium mb-1">
											Total Experience
										</div>
										<div className="text-sm text-muted-foreground">
											{Math.floor(selectedResume.totalExperienceMonths / 12)}{" "}
											years {selectedResume.totalExperienceMonths % 12} months
										</div>
									</div>
								)}

							{selectedResume.education &&
								Array.isArray(selectedResume.education) &&
								selectedResume.education.length > 0 && (
									<div>
										<div className="text-sm font-medium mb-2">Education</div>
										<div className="space-y-2">
											{(selectedResume.education as Education[]).map(
												(edu, idx) => (
													<div
														key={`${edu.institution}-${idx}`}
														className="text-sm border-l-2 pl-3"
													>
														<div className="font-medium">
															{edu.degree || "Degree"}{" "}
															{edu.field && `in ${edu.field}`}
														</div>
														<div className="text-muted-foreground">
															{edu.institution}
														</div>
														{(edu.startDate || edu.endDate) && (
															<div className="text-xs text-muted-foreground">
																{edu.startDate} - {edu.endDate || "Present"}
															</div>
														)}
													</div>
												),
											)}
										</div>
									</div>
								)}

							{selectedResume.experience &&
								Array.isArray(selectedResume.experience) &&
								selectedResume.experience.length > 0 && (
									<div>
										<div className="text-sm font-medium mb-2">Experience</div>
										<div className="space-y-3">
											{(selectedResume.experience as Experience[]).map(
												(exp, idx) => (
													<div
														key={`${exp.company}-${idx}`}
														className="text-sm border-l-2 pl-3"
													>
														<div className="font-medium">
															{exp.title || "Position"}
														</div>
														<div className="text-muted-foreground">
															{exp.company}
														</div>
														{(exp.startDate || exp.endDate) && (
															<div className="text-xs text-muted-foreground">
																{exp.startDate} - {exp.endDate || "Present"}
															</div>
														)}
														{exp.summary && (
															<div className="text-xs text-muted-foreground mt-1">
																{exp.summary}
															</div>
														)}
													</div>
												),
											)}
										</div>
									</div>
								)}

							{selectedResume.projects &&
								Array.isArray(selectedResume.projects) &&
								selectedResume.projects.length > 0 && (
									<div>
										<div className="text-sm font-medium mb-2">Projects</div>
										<div className="space-y-2">
											{(selectedResume.projects as Project[]).map(
												(proj, idx) => (
													<div
														key={`${proj.name}-${idx}`}
														className="text-sm border-l-2 pl-3"
													>
														<div className="font-medium">{proj.name}</div>
														{proj.description && (
															<div className="text-xs text-muted-foreground mt-1">
																{proj.description}
															</div>
														)}
														{proj.technologies &&
															Array.isArray(proj.technologies) &&
															proj.technologies.length > 0 && (
																<div className="flex flex-wrap gap-1 mt-1">
																	{proj.technologies.map((tech: string) => (
																		<span
																			key={tech}
																			className="text-xs bg-gray-200 dark:bg-gray-800 px-2 py-0.5 rounded"
																		>
																			{tech}
																		</span>
																	))}
																</div>
															)}
													</div>
												),
											)}
										</div>
									</div>
								)}

							{selectedResume.skills &&
								Array.isArray(selectedResume.skills) &&
								selectedResume.skills.length > 0 && (
									<div>
										<div className="text-sm font-medium mb-2">Skills</div>
										<div className="flex flex-wrap gap-2">
											{(selectedResume.skills as Skill[]).map((skill, idx) => (
												<span
													key={`${skill.name}-${idx}`}
													className="text-sm bg-gray-200 dark:bg-gray-800 px-3 py-1 rounded-full"
												>
													{skill.name}
													{skill.level && (
														<span className="text-xs text-muted-foreground ml-1">
															({skill.level})
														</span>
													)}
												</span>
											))}
										</div>
									</div>
								)}

							{selectedResume.interviewQuestions &&
								Array.isArray(selectedResume.interviewQuestions) &&
								selectedResume.interviewQuestions.length > 0 && (
									<div>
										<div className="text-sm font-medium mb-2">
											Interview Questions
										</div>
										<ol className="list-decimal ml-6 space-y-2">
											{(
												selectedResume.interviewQuestions as InterviewQuestion[]
											).map((q, idx) => (
												<li key={`q-${idx}`} className="text-sm">
													<div>{q.text}</div>
													{q.correctAnswer && (
														<div className="text-xs text-muted-foreground mt-1">
															Suggested answer: {q.correctAnswer}
														</div>
													)}
													{(q.topic || q.confidence !== undefined) && (
														<div className="text-xs text-muted-foreground mt-0.5">
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
						</CardContent>
					</Card>
				</div>
			)}
		</Container>
	);
}
