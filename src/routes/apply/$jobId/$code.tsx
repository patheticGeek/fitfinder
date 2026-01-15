"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useMatch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import type { AppRouterInputs } from "~/routes/api/trpc/$";
import { useGlobalContext } from "~/utils/hooks";

export const Route = createFileRoute("/apply/$jobId/$code")({
	component: ApplyPage,
});

type SubmitInput = AppRouterInputs["submitInviteApplication"];

// Use Record<string, unknown> for JSON fields from Prisma/tRPC
type EducationEntry = Record<string, unknown>;
type ExperienceEntry = Record<string, unknown>;
type ProjectEntry = Record<string, unknown>;

type WithId<T> = T & { __id: string };

// Helper to safely get string value from Record
const getString = (obj: Record<string, unknown>, key: string): string =>
	String(obj[key] ?? "");

function ApplyPage() {
	const { trpc } = useGlobalContext();
	const { jobId, code } = useMatch({
		from: "/apply/$jobId/$code",
		select: (s) => s.params,
	});

	const inviteQ = useQuery(trpc.getInviteData.queryOptions({ jobId, code }));
	const submitM = useMutation(trpc.submitInviteApplication.mutationOptions());

	const [email, setEmail] = useState("");
	const [phone, setPhone] = useState("");
	const [skills, setSkills] = useState<string[]>([]);
	const [newSkill, setNewSkill] = useState("");
	const [education, setEducation] = useState<WithId<EducationEntry>[]>([]);
	const [experience, setExperience] = useState<WithId<ExperienceEntry>[]>([]);
	const [projects, setProjects] = useState<WithId<ProjectEntry>[]>([]);
	const [answers, setAnswers] = useState<
		NonNullable<SubmitInput["answers"]>[number][]
	>([]);

	// Initialize state when data loads
	useEffect(() => {
		const resume = inviteQ.data?.resume;
		if (!resume) return;

		setEmail(resume.email ?? "");
		setPhone(resume.phone ?? "");

		const educationData = Array.isArray(resume.education)
			? (resume.education as EducationEntry[])
			: [];
		setEducation(
			educationData.map((e) => ({
				...(e || {}),
				__id: crypto.randomUUID(),
			})),
		);

		const experienceData = Array.isArray(resume.experience)
			? (resume.experience as ExperienceEntry[])
			: [];
		setExperience(
			experienceData.map((e) => ({
				...(e || {}),
				__id: crypto.randomUUID(),
			})),
		);

		const projectsData = Array.isArray(resume.projects)
			? (resume.projects as ProjectEntry[])
			: [];
		setProjects(
			projectsData.map((p) => ({
				...(p || {}),
				__id: crypto.randomUUID(),
			})),
		);

		setSkills(
			(resume.resumeSkills ?? [])
				.map((rs) => rs?.skill?.name || "")
				.filter(Boolean),
		);

		setAnswers(
			(resume.questionAnswers ?? []).map((qa) => ({
				id: qa.id,
				answer: qa.answer ?? "",
			})),
		);
	}, [inviteQ.data]);

	const onSubmit = async () => {
		const input: SubmitInput = {
			code,
			jobId,
			email: email || undefined,
			phone: phone || undefined,
			education: education.map(({ __id, ...rest }) => rest),
			experience: experience.map(({ __id, ...rest }) => rest),
			projects: projects.map(({ __id, ...rest }) => rest),
			skills,
			answers: answers.filter((a) => a.answer && a.answer.trim().length > 0),
		};
		await submitM.mutateAsync(input);
		alert("Application submitted successfully!");
	};

	if (inviteQ.isLoading) {
		return <div className="p-6">Loading invitation...</div>;
	}
	if (inviteQ.isError) {
		return (
			<div className="p-6 text-red-500">
				Failed to load invite. It may be invalid or expired.
			</div>
		);
	}

	const resume = inviteQ.data?.resume;

	return (
		<div className="max-w-3xl mx-auto p-6 space-y-8">
			<header className="space-y-1">
				<h1 className="text-2xl font-bold">
					Apply for {resume?.job?.title ?? "the job"}
				</h1>
				<p className="text-sm text-muted-foreground">
					Your invite code authorizes access to this page. No login required.
				</p>
			</header>

			<section className="space-y-4">
				<h2 className="text-xl font-semibold">Contact</h2>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div>
						<label htmlFor="email" className="text-sm text-muted-foreground">
							Email
						</label>
						<Input
							id="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder="you@example.com"
						/>
					</div>
					<div>
						<label htmlFor="phone" className="text-sm text-muted-foreground">
							Phone
						</label>
						<Input
							id="phone"
							value={phone}
							onChange={(e) => setPhone(e.target.value)}
							placeholder="+1 234 567 8910"
						/>
					</div>
				</div>
			</section>

			<section className="space-y-4">
				<h2 className="text-xl font-semibold">Skills</h2>
				<div className="flex gap-2">
					<Input
						value={newSkill}
						onChange={(e) => setNewSkill(e.target.value)}
						placeholder="Add a skill"
					/>
					<Button
						type="button"
						onClick={() => {
							if (newSkill.trim()) {
								setSkills([...skills, newSkill.trim()]);
								setNewSkill("");
							}
						}}
					>
						Add
					</Button>
				</div>
				<div className="flex gap-2 flex-wrap">
					{skills.map((s) => (
						<span key={`${s}`} className="px-2 py-1 bg-muted rounded text-sm">
							{s}
							<button
								type="button"
								className="ml-2 text-xs text-red-500"
								onClick={() => setSkills(skills.filter((x) => x !== s))}
							>
								Remove
							</button>
						</span>
					))}
				</div>
			</section>

			<section className="space-y-4">
				<h2 className="text-xl font-semibold">Education</h2>
				<Button
					type="button"
					variant="outline"
					onClick={() => {
						const newEntry: WithId<EducationEntry> = {
							institution: "",
							degree: undefined,
							field: undefined,
							startDate: undefined,
							endDate: undefined,
							location: undefined,
							__id: crypto.randomUUID(),
						};
						setEducation([...education, newEntry]);
					}}
				>
					Add Education
				</Button>
				<div className="space-y-3">
					{education.map((item) => (
						<div
							key={item.__id}
							className="grid grid-cols-1 sm:grid-cols-2 gap-2 border rounded p-3"
						>
							<Input
								placeholder="Institution"
								value={getString(item, "institution")}
								onChange={(e) => {
									setEducation((prev) =>
										prev.map((it) =>
											it.__id === item.__id
												? { ...it, institution: e.target.value }
												: it,
										),
									);
								}}
							/>
							<Input
								placeholder="Degree"
								value={getString(item, "degree")}
								onChange={(e) => {
									setEducation((prev) =>
										prev.map((it) =>
											it.__id === item.__id
												? { ...it, degree: e.target.value }
												: it,
										),
									);
								}}
							/>
							<Input
								placeholder="Field"
								value={getString(item, "field")}
								onChange={(e) => {
									setEducation((prev) =>
										prev.map((it) =>
											it.__id === item.__id
												? { ...it, field: e.target.value }
												: it,
										),
									);
								}}
							/>
							<Input
								placeholder="Start Date"
								value={getString(item, "startDate")}
								onChange={(e) => {
									setEducation((prev) =>
										prev.map((it) =>
											it.__id === item.__id
												? { ...it, startDate: e.target.value }
												: it,
										),
									);
								}}
							/>
							<Input
								placeholder="End Date"
								value={getString(item, "endDate")}
								onChange={(e) => {
									setEducation((prev) =>
										prev.map((it) =>
											it.__id === item.__id
												? { ...it, endDate: e.target.value }
												: it,
										),
									);
								}}
							/>
							<Input
								placeholder="Location"
								value={getString(item, "location")}
								onChange={(e) => {
									setEducation((prev) =>
										prev.map((it) =>
											it.__id === item.__id
												? { ...it, location: e.target.value }
												: it,
										),
									);
								}}
							/>
							<Button
								type="button"
								variant="destructive"
								onClick={() =>
									setEducation((prev) =>
										prev.filter((it) => it.__id !== item.__id),
									)
								}
							>
								Remove
							</Button>
						</div>
					))}
				</div>
			</section>

			<section className="space-y-4">
				<h2 className="text-xl font-semibold">Experience</h2>
				<Button
					type="button"
					variant="outline"
					onClick={() => {
						const newEntry: WithId<ExperienceEntry> = {
							company: "",
							title: undefined,
							startDate: undefined,
							endDate: undefined,
							summary: undefined,
							location: undefined,
							__id: crypto.randomUUID(),
						};
						setExperience([...experience, newEntry]);
					}}
				>
					Add Experience
				</Button>
				<div className="space-y-3">
					{experience.map((item) => (
						<div
							key={item.__id}
							className="grid grid-cols-1 sm:grid-cols-2 gap-2 border rounded p-3"
						>
							<Input
								placeholder="Company"
								value={getString(item, "company")}
								onChange={(e) => {
									setExperience((prev) =>
										prev.map((it) =>
											it.__id === item.__id
												? { ...it, company: e.target.value }
												: it,
										),
									);
								}}
							/>
							<Input
								placeholder="Title"
								value={getString(item, "title")}
								onChange={(e) => {
									setExperience((prev) =>
										prev.map((it) =>
											it.__id === item.__id
												? { ...it, title: e.target.value }
												: it,
										),
									);
								}}
							/>
							<Input
								placeholder="Start Date"
								value={getString(item, "startDate")}
								onChange={(e) => {
									setExperience((prev) =>
										prev.map((it) =>
											it.__id === item.__id
												? { ...it, startDate: e.target.value }
												: it,
										),
									);
								}}
							/>
							<Input
								placeholder="End Date"
								value={getString(item, "endDate")}
								onChange={(e) => {
									setExperience((prev) =>
										prev.map((it) =>
											it.__id === item.__id
												? { ...it, endDate: e.target.value }
												: it,
										),
									);
								}}
							/>
							<Textarea
								placeholder="Summary"
								value={getString(item, "summary")}
								onChange={(e) => {
									setExperience((prev) =>
										prev.map((it) =>
											it.__id === item.__id
												? { ...it, summary: e.target.value }
												: it,
										),
									);
								}}
							/>
							<Input
								placeholder="Location"
								value={getString(item, "location")}
								onChange={(e) => {
									setExperience((prev) =>
										prev.map((it) =>
											it.__id === item.__id
												? { ...it, location: e.target.value }
												: it,
										),
									);
								}}
							/>
							<Button
								type="button"
								variant="destructive"
								onClick={() =>
									setExperience((prev) =>
										prev.filter((it) => it.__id !== item.__id),
									)
								}
							>
								Remove
							</Button>
						</div>
					))}
				</div>
			</section>

			<section className="space-y-4">
				<h2 className="text-xl font-semibold">Projects</h2>
				<Button
					type="button"
					variant="outline"
					onClick={() => {
						const newEntry: WithId<ProjectEntry> = {
							name: "",
							description: undefined,
							technologies: undefined,
							__id: crypto.randomUUID(),
						};
						setProjects([...projects, newEntry]);
					}}
				>
					Add Project
				</Button>
				<div className="space-y-3">
					{projects.map((item) => (
						<div
							key={item.__id}
							className="grid grid-cols-1 sm:grid-cols-2 gap-2 border rounded p-3"
						>
							<Input
								placeholder="Name"
								value={getString(item, "name")}
								onChange={(e) => {
									setProjects((prev) =>
										prev.map((it) =>
											it.__id === item.__id
												? { ...it, name: e.target.value }
												: it,
										),
									);
								}}
							/>
							<Textarea
								placeholder="Description"
								value={getString(item, "description")}
								onChange={(e) => {
									setProjects((prev) =>
										prev.map((it) =>
											it.__id === item.__id
												? { ...it, description: e.target.value }
												: it,
										),
									);
								}}
							/>
							<Input
								placeholder="Technologies (comma separated)"
								value={
									Array.isArray(item.technologies)
										? item.technologies.join(", ")
										: ""
								}
								onChange={(e) => {
									const techs = e.target.value
										.split(",")
										.map((s) => s.trim())
										.filter(Boolean);
									setProjects((prev) =>
										prev.map((it) =>
											it.__id === item.__id
												? { ...it, technologies: techs }
												: it,
										),
									);
								}}
							/>
							<Button
								type="button"
								variant="destructive"
								onClick={() =>
									setProjects((prev) =>
										prev.filter((it) => it.__id !== item.__id),
									)
								}
							>
								Remove
							</Button>
						</div>
					))}
				</div>
			</section>

			<section className="space-y-4">
				<h2 className="text-xl font-semibold">Interview Questions</h2>
				<div className="space-y-3">
					{(resume?.questionAnswers ?? []).map((qa, idx: number) => (
						<div key={qa.id} className="space-y-1">
							<div className="font-medium">
								Q{idx + 1}. {qa.question}
							</div>
							<Textarea
								placeholder="Your answer"
								value={answers.find((a) => a.id === qa.id)?.answer ?? ""}
								onChange={(e) => {
									setAnswers((prev) => {
										const i = prev.findIndex((p) => p.id === qa.id);
										const next = [...prev];
										if (i >= 0) next[i] = { id: qa.id, answer: e.target.value };
										else next.push({ id: qa.id, answer: e.target.value });
										return next;
									});
								}}
							/>
						</div>
					))}
				</div>
			</section>

			<footer className="flex justify-end gap-3">
				<Button
					type="button"
					variant="outline"
					onClick={() => window.location.reload()}
				>
					Reset
				</Button>
				<Button type="button" onClick={onSubmit} disabled={submitM.isPending}>
					{submitM.isPending ? "Submitting..." : "Submit Application"}
				</Button>
			</footer>
		</div>
	);
}
