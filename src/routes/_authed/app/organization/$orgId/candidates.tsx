"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	useMatch,
	useNavigate,
	useSearch,
} from "@tanstack/react-router";
import {
	ArrowDown,
	ArrowUp,
	ArrowUpDown,
	CheckCircle,
	Copy,
} from "lucide-react";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "~/components/ui/table";
import type { AppRouter } from "~/routes/api/trpc/$";
import { useGlobalContext } from "~/utils/hooks";

type Candidate =
	AppRouter["getOrganizationCandidates"]["_def"]["$types"]["output"]["resumes"][number];

type CandidateRow = {
	id: string;
	score: number | null;
	scoreJustification: string | null;
	totalExperienceMonths: number | null;
	createdAt: Date | string;
	email: string | null;
	phone: string | null;
	currentLocation: string | null;
	addedByUser?: { email?: string } | null;
	job?: { title?: string; id?: string } | null;
};

// InviteLinkSection Component
function InviteLinkSection({
	resumeId,
	jobId,
}: {
	resumeId: string;
	jobId: string;
}) {
	const { trpc } = useGlobalContext();
	const [copiedCode, setCopiedCode] = useState<string | null>(null);
	const createInviteM = useMutation(trpc.createInvite.mutationOptions());

	const handleCreateInvite = async () => {
		const result = await createInviteM.mutateAsync({ resumeId, jobId });
		setCopiedCode(result.code);
		const origin =
			typeof window !== "undefined" && window.location.origin
				? window.location.origin
				: "";
		const inviteUrl = `${origin}/apply/${jobId}/${result.code}`;
		navigator.clipboard.writeText(inviteUrl);
		setTimeout(() => setCopiedCode(null), 2000);
	};

	return (
		<div className="border rounded-lg p-4 bg-muted/30">
			<div className="text-lg font-semibold mb-3">
				Generate Candidate Invite
			</div>
			<p className="text-sm text-muted-foreground mb-4">
				Create a unique invite link for this candidate to fill out and answer
				interview questions without logging in.
			</p>
			<Button
				onClick={handleCreateInvite}
				disabled={createInviteM.isPending || copiedCode !== null}
				className="gap-2"
			>
				{copiedCode ? (
					<>
						<CheckCircle className="h-4 w-4" />
						Link Copied!
					</>
				) : (
					<>
						<Copy className="h-4 w-4" />
						{createInviteM.isPending
							? "Creating..."
							: "Create & Copy Invite Link"}
					</>
				)}
			</Button>
		</div>
	);
}

// UI Components for structured data

const EducationCard = ({ item }: { item: unknown }) => {
	const edu = item as {
		degree?: string;
		field?: string;
		institution?: string;
		startDate?: string;
		endDate?: string;
		gpa?: number | string;
	};
	return (
		<div className="border-l-4 border-blue-500 pl-4 py-3">
			<div className="font-semibold text-foreground">
				{edu.degree || "Degree"}
				{edu.field ? ` in ${edu.field}` : ""}
			</div>
			<div className="text-sm text-muted-foreground">
				{edu.institution || "Institution"}
			</div>
			{(edu.startDate || edu.endDate) && (
				<div className="text-xs text-muted-foreground mt-1">
					{edu.startDate} {edu.startDate && edu.endDate ? "–" : ""}{" "}
					{edu.endDate || "Present"}
				</div>
			)}
			{edu.gpa && (
				<div className="text-xs text-muted-foreground mt-1">GPA: {edu.gpa}</div>
			)}
		</div>
	);
};

const ExperienceCard = ({ item }: { item: unknown }) => {
	const exp = item as {
		title?: string;
		company?: string;
		startDate?: string;
		endDate?: string;
		summary?: string;
	};
	return (
		<div className="border-l-4 border-green-500 pl-4 py-3">
			<div className="font-semibold text-foreground">
				{exp.title || "Position"}
			</div>
			<div className="text-sm text-muted-foreground">
				{exp.company || "Company"}
			</div>
			{(exp.startDate || exp.endDate) && (
				<div className="text-xs text-muted-foreground mt-1">
					{exp.startDate} {exp.startDate && exp.endDate ? "–" : ""}{" "}
					{exp.endDate || "Present"}
				</div>
			)}
			{exp.summary && (
				<div className="text-sm text-muted-foreground mt-2">{exp.summary}</div>
			)}
		</div>
	);
};

const ProjectCard = ({ item }: { item: unknown }) => {
	const proj = item as {
		name?: string;
		description?: string;
		link?: string;
		technologies?: string[];
	};
	return (
		<div className="border-l-4 border-purple-500 pl-4 py-3">
			<div className="font-semibold text-foreground">
				{proj.link ? (
					<a
						href={proj.link}
						target="_blank"
						rel="noopener noreferrer"
						className="hover:underline"
					>
						{proj.name || "Project"}
					</a>
				) : (
					proj.name || "Project"
				)}
			</div>
			{proj.description && (
				<div className="text-sm text-muted-foreground mt-1">
					{proj.description}
				</div>
			)}
			{proj.technologies &&
				Array.isArray(proj.technologies) &&
				proj.technologies.length > 0 && (
					<div className="mt-2 flex flex-wrap gap-1">
						{proj.technologies.map((tech) => (
							<span
								key={tech}
								className="inline-block bg-muted px-2 py-0.5 rounded text-xs"
							>
								{tech}
							</span>
						))}
					</div>
				)}
		</div>
	);
};

const SkillBadge = ({ item }: { item: unknown }) => {
	const skill = item as {
		name?: string;
		level?: "beginner" | "intermediate" | "expert" | string;
	};
	const levelColors = {
		beginner:
			"bg-yellow-100 text-yellow-900 dark:bg-yellow-900 dark:text-yellow-200",
		intermediate:
			"bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-200",
		expert: "bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-200",
	};
	const levelColor =
		levelColors[skill.level as keyof typeof levelColors] ||
		"bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-200";
	return (
		<div
			className={`inline-block px-3 py-1.5 rounded-full text-sm font-medium ${levelColor}`}
		>
			{skill.name}
			{skill.level && (
				<span className="ml-1.5 text-xs opacity-75">• {skill.level}</span>
			)}
		</div>
	);
};

const InterviewQuestionCard = ({ item }: { item: unknown }) => {
	const q = item as {
		text?: string;
		correctAnswer?: string;
		topic?: string;
		confidence?: number;
	};
	return (
		<div className="border rounded-lg p-3 bg-muted/50">
			<div className="font-medium text-foreground">{q.text || "Question"}</div>
			{q.correctAnswer && (
				<div className="mt-2 text-sm">
					<div className="text-xs font-semibold text-muted-foreground uppercase">
						Suggested Answer
					</div>
					<div className="text-muted-foreground mt-1">{q.correctAnswer}</div>
				</div>
			)}
			{(q.topic || q.confidence !== undefined) && (
				<div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
					{q.topic && <span>📌 Topic: {q.topic}</span>}
					{q.confidence !== undefined && (
						<span>🎯 Confidence: {Math.round(q.confidence * 100)}%</span>
					)}
				</div>
			)}
		</div>
	);
};

const candidatesSearchSchema = z.object({
	jobId: z.string().optional(),
});

export const Route = createFileRoute(
	"/_authed/app/organization/$orgId/candidates",
)({
	component: CandidatesPage,
	validateSearch: candidatesSearchSchema,
});

const allColumns = [
	{ key: "email", label: "Resume Email" },
	{ key: "jobTitle", label: "Job Applied For" },
	{ key: "score", label: "Match Score" },
	{ key: "scoreJustification", label: "Justification" },
	{ key: "phone", label: "Phone" },
	{ key: "currentLocation", label: "Location" },
	{ key: "totalExperienceMonths", label: "Experience (months)" },
	{ key: "createdAt", label: "Applied Date" },
	{ key: "addedByEmail", label: "Added By" },
];

function CandidatesPage() {
	const { trpc } = useGlobalContext();
	const navigate = useNavigate();

	const { orgId } = useMatch({
		from: "/_authed/app/organization/$orgId/candidates",
		select: (s) => s.params,
	});

	const { jobId } = useSearch({
		from: "/_authed/app/organization/$orgId/candidates",
	});

	const q = useQuery(trpc.getOrganizationCandidates.queryOptions({ orgId }));

	const selectedJob = jobId || null;
	const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
		() =>
			new Set([
				"addedByEmail",
				"jobTitle",
				"score",
				"scoreJustification",
				"email",
			]),
	);
	const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>(null);
	const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(
		null,
	);

	// Get unique jobs for filter
	const jobOptions = useMemo(() => {
		const jobs = new Map<string, string>();
		if (q.data?.resumes) {
			q.data.resumes.forEach((resume) => {
				if (resume.job?.id && resume.job?.title) {
					jobs.set(resume.job.id, resume.job.title);
				}
			});
		}
		return Array.from(jobs.entries()).map(([id, title]) => ({ id, title }));
	}, [q.data?.resumes]);

	// Filter candidates by selected job
	const filteredCandidates = useMemo<CandidateRow[]>(() => {
		if (!q.data?.resumes) return [];
		const candidates = q.data.resumes as unknown as CandidateRow[];
		const filtered = !selectedJob
			? candidates
			: candidates.filter((candidate) => candidate.job?.id === selectedJob);

		if (sortOrder) {
			return [...filtered].sort((a, b) => {
				const aScore = a.score ?? -1;
				const bScore = b.score ?? -1;
				return sortOrder === "asc" ? aScore - bScore : bScore - aScore;
			});
		}

		return filtered;
	}, [q.data?.resumes, selectedJob, sortOrder]);

	const toggleColumn = (columnKey: string) => {
		const newVisible = new Set(visibleColumns);
		if (newVisible.has(columnKey)) {
			newVisible.delete(columnKey);
		} else {
			newVisible.add(columnKey);
		}
		setVisibleColumns(newVisible);
	};

	const toggleSort = () => {
		if (sortOrder === null) {
			setSortOrder("desc");
		} else if (sortOrder === "desc") {
			setSortOrder("asc");
		} else {
			setSortOrder(null);
		}
	};

	const getSortIcon = () => {
		if (sortOrder === "asc") return <ArrowUp className="h-4 w-4" />;
		if (sortOrder === "desc") return <ArrowDown className="h-4 w-4" />;
		return <ArrowUpDown className="h-4 w-4 opacity-50" />;
	};

	const formatDate = (d: CandidateRow["createdAt"]) =>
		(typeof d === "string" ? new Date(d) : d).toLocaleDateString();

	const formatDateTimeValue = (d: Date | string) =>
		(typeof d === "string" ? new Date(d) : d).toLocaleString();

	const formatExperience = (months: number | null): string => {
		if (months === null || months === undefined) return "N/A";
		const years = Math.floor(months / 12);
		const remainingMonths = months % 12;
		const parts: string[] = [];
		if (years > 0) parts.push(`${years} year${years === 1 ? "" : "s"}`);
		if (remainingMonths > 0)
			parts.push(`${remainingMonths} month${remainingMonths === 1 ? "" : "s"}`);
		if (parts.length === 0) return "0 months";
		return parts.join(" ");
	};

	const renderCell = (resume: CandidateRow, columnKey: string): string => {
		switch (columnKey) {
			case "score":
				return resume.score === null ? "Not Scored" : `${resume.score}%`;
			case "scoreJustification": {
				if (!resume.scoreJustification) return "—";
				const text =
					resume.scoreJustification.length > 50
						? `${resume.scoreJustification.substring(0, 50)}...`
						: resume.scoreJustification;
				return text;
			}
			case "totalExperienceMonths":
				return formatExperience(resume.totalExperienceMonths);
			case "createdAt":
				return formatDate(resume.createdAt);
			case "email":
				return resume.email || "N/A";
			case "phone":
				return resume.phone || "N/A";
			case "currentLocation":
				return resume.currentLocation || "N/A";
			case "addedByEmail":
				return resume.addedByUser?.email || "Unknown";
			case "jobTitle":
				return resume.job?.title || "No Job";
			default:
				return "—";
		}
	};

	if (q.isLoading) {
		return (
			<div className="space-y-3">
				<div className="h-8 w-1/3 bg-gray-700 rounded animate-pulse" />
				<div className="h-32 bg-gray-800 rounded animate-pulse" />
			</div>
		);
	}

	if (q.isError) {
		return (
			<div className="text-red-400">
				Failed to load candidates.{" "}
				<button type="button" className="underline" onClick={() => q.refetch()}>
					Try again
				</button>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold">Candidates</h1>
				<p className="text-gray-400 mt-1">
					View all candidates who have applied to your jobs
				</p>
			</div>

			{/* Filters and Column Toggle */}
			<div className="flex flex-wrap items-center gap-4">
				{/* Job Filter */}
				<div className="flex items-center gap-2">
					<span className="text-sm font-medium">Filter by Job:</span>
					<Select
						value={selectedJob || ""}
						onValueChange={(value) => {
							navigate({
								to: ".",
								search: {
									jobId: value === "" ? undefined : (value as string),
								},
							});
						}}
					>
						<SelectTrigger className="w-48">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="">All Jobs</SelectItem>
							{jobOptions.map((job) => (
								<SelectItem key={job.id} value={job.id}>
									{job.title}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				{/* Column Visibility Toggle */}
				<DropdownMenu>
					<DropdownMenuTrigger>
						<Button variant="outline">Columns</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-56">
						{allColumns.map((column) => (
							<DropdownMenuCheckboxItem
								key={column.key}
								checked={visibleColumns.has(column.key)}
								onCheckedChange={() => toggleColumn(column.key)}
							>
								{column.label}
							</DropdownMenuCheckboxItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>

				{/* Results count */}
				<div className="text-sm text-gray-400">
					{filteredCandidates.length} candidate
					{filteredCandidates.length !== 1 ? "s" : ""}
				</div>
			</div>

			{/* Data Table */}
			{filteredCandidates.length === 0 ? (
				<div className="text-center py-8 text-gray-400">
					No candidates found.
				</div>
			) : (
				<Table>
					<TableHeader>
						<TableRow>
							{allColumns
								.filter((col) => visibleColumns.has(col.key))
								.map((column) => (
									<TableHead key={column.key}>
										{column.key === "score" ? (
											<button
												type="button"
												onClick={toggleSort}
												className="flex items-center gap-2 hover:text-foreground transition-colors"
											>
												{column.label}
												{getSortIcon()}
											</button>
										) : (
											column.label
										)}
									</TableHead>
								))}
						</TableRow>
					</TableHeader>
					<TableBody>
						{filteredCandidates.map((r) => (
							<TableRow
								key={r.id}
								onClick={() => setSelectedCandidate(r as unknown as Candidate)}
								className="cursor-pointer"
							>
								{allColumns
									.filter((col) => visibleColumns.has(col.key))
									.map((column) => (
										<TableCell key={column.key}>
											{renderCell(r, column.key)}
										</TableCell>
									))}
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}

			{/* Candidate Detail Modal */}
			<Dialog
				open={selectedCandidate !== null}
				onOpenChange={(open) => !open && setSelectedCandidate(null)}
			>
				<DialogContent className="max-w-[60vw] max-h-[80vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Candidate Details</DialogTitle>
					</DialogHeader>
					{selectedCandidate && (
						<div className="space-y-6">
							{/* Basic Info */}
							<div className="grid grid-cols-2 gap-4">
								<div>
									<div className="text-sm text-muted-foreground">Added By</div>
									<div className="font-medium">
										{selectedCandidate.addedByUser?.email || "Unknown"}
									</div>
								</div>
								<div>
									<div className="text-sm text-muted-foreground">
										Job Applied For
									</div>
									<div className="font-medium">
										{selectedCandidate.job?.title || "No Job"}
									</div>
								</div>
							</div>

							{/* Match Score */}
							<div>
								<div className="text-sm text-muted-foreground">Match Score</div>
								<div className="text-2xl font-bold">
									{selectedCandidate.score !== null
										? `${selectedCandidate.score}%`
										: "Not Scored"}
								</div>
							</div>

							{/* Score Justification */}
							{selectedCandidate.scoreJustification && (
								<div>
									<div className="text-sm text-muted-foreground">
										Justification
									</div>
									<div className="mt-1">
										{selectedCandidate.scoreJustification}
									</div>
								</div>
							)}

							{/* Contact Information */}
							<div className="grid grid-cols-2 gap-4">
								<div>
									<div className="text-sm text-muted-foreground">
										Resume Email
									</div>
									<div>{selectedCandidate.email || "N/A"}</div>
								</div>
								<div>
									<div className="text-sm text-muted-foreground">Phone</div>
									<div>{selectedCandidate.phone || "N/A"}</div>
								</div>
							</div>

							{/* Location & Experience */}
							<div className="grid grid-cols-2 gap-4">
								<div>
									<div className="text-sm text-muted-foreground">Location</div>
									<div>{selectedCandidate.currentLocation || "N/A"}</div>
								</div>
								<div>
									<div className="text-sm text-muted-foreground">
										Total Experience
									</div>
									<div>
										{formatExperience(selectedCandidate.totalExperienceMonths)}
									</div>
								</div>
							</div>

							{/* Applied Date */}
							<div>
								<div className="text-sm text-muted-foreground">
									Applied Date
								</div>
								<div>{formatDateTimeValue(selectedCandidate.createdAt)}</div>
							</div>

							{/* Education, Experience, Projects, Skills */}
							{selectedCandidate.education &&
								Array.isArray(selectedCandidate.education) &&
								selectedCandidate.education.length > 0 && (
									<div>
										<div className="text-lg font-semibold mb-3">Education</div>
										<div className="space-y-3">
											{selectedCandidate.education.map((item, idx) => (
												<EducationCard key={idx.toString()} item={item} />
											))}
										</div>
									</div>
								)}
							{selectedCandidate.experience &&
								Array.isArray(selectedCandidate.experience) &&
								selectedCandidate.experience.length > 0 && (
									<div>
										<div className="text-lg font-semibold mb-3">Experience</div>
										<div className="space-y-3">
											{selectedCandidate.experience.map((item, idx) => (
												<ExperienceCard key={idx.toString()} item={item} />
											))}
										</div>
									</div>
								)}
							{selectedCandidate.projects &&
								Array.isArray(selectedCandidate.projects) &&
								selectedCandidate.projects.length > 0 && (
									<div>
										<div className="text-lg font-semibold mb-3">Projects</div>
										<div className="space-y-3">
											{selectedCandidate.projects.map((item, idx) => (
												<ProjectCard key={idx.toString()} item={item} />
											))}
										</div>
									</div>
								)}
							{selectedCandidate.resumeSkills &&
								Array.isArray(selectedCandidate.resumeSkills) &&
								selectedCandidate.resumeSkills.length > 0 && (
									<div>
										<div className="text-lg font-semibold mb-3">Skills</div>
										<div className="flex flex-wrap gap-2">
											{selectedCandidate.resumeSkills.map(
												(rs: {
													id: string;
													skill?: { name?: string } | null;
												}) => (
													<SkillBadge
														key={rs.id}
														item={{ name: rs.skill?.name }}
													/>
												),
											)}
										</div>
									</div>
								)}
							{selectedCandidate.questionAnswers &&
								Array.isArray(selectedCandidate.questionAnswers) &&
								selectedCandidate.questionAnswers.length > 0 && (
									<div>
										<div className="text-lg font-semibold mb-3">
											Suggested Interview Questions
										</div>
										<div className="space-y-3">
											{selectedCandidate.questionAnswers.map(
												(qa: {
													id: string;
													question: string;
													answer?: string | null;
												}) => (
													<InterviewQuestionCard
														key={qa.id}
														item={{
															text: qa.question,
															correctAnswer: qa.answer,
														}}
													/>
												),
											)}
										</div>
									</div>
								)}

							{/* Invite Link Section */}
							{selectedCandidate?.job?.id && (
								<InviteLinkSection
									resumeId={selectedCandidate.id}
									jobId={selectedCandidate.job.id}
								/>
							)}
						</div>
					)}
				</DialogContent>
			</Dialog>
		</div>
	);
}
