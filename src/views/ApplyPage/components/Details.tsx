"use client";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import type { Education, Experience, Project } from "~/schemas/resume";

type WithId<T> = T & { __id: string };

interface DetailsProps {
	email: string;
	setEmail: (email: string) => void;
	phone: string;
	setPhone: (phone: string) => void;
	skills: string[];
	setSkills: (skills: string[]) => void;
	newSkill: string;
	setNewSkill: (skill: string) => void;
	education: WithId<Education>[];
	setEducation: (education: WithId<Education>[]) => void;
	experience: WithId<Experience>[];
	setExperience: (experience: WithId<Experience>[]) => void;
	projects: WithId<Project>[];
	setProjects: (projects: WithId<Project>[]) => void;
}

export function Details({
	email,
	setEmail,
	phone,
	setPhone,
	skills,
	setSkills,
	newSkill,
	setNewSkill,
	education,
	setEducation,
	experience,
	setExperience,
	projects,
	setProjects,
}: DetailsProps) {
	return (
		<div className="space-y-8">
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
							placeholder="+912345678910"
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
						const newEntry: WithId<Education> = {
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
						<div key={item.__id} className="space-y-3 border rounded p-3">
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
								<div>
									<label
										htmlFor={`edu-institution-${item.__id}`}
										className="text-sm text-muted-foreground"
									>
										Name of Institute
									</label>
									<Input
										id={`edu-institution-${item.__id}`}
										placeholder="Name of Institute"
										value={item.institution ?? ""}
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
								</div>
								<div>
									<label
										htmlFor={`edu-location-${item.__id}`}
										className="text-sm text-muted-foreground"
									>
										Location
									</label>
									<Input
										id={`edu-location-${item.__id}`}
										placeholder="Location"
										value={item.location ?? ""}
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
								</div>
							</div>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
								<div>
									<label
										htmlFor={`edu-degree-${item.__id}`}
										className="text-sm text-muted-foreground"
									>
										Degree
									</label>
									<Input
										id={`edu-degree-${item.__id}`}
										placeholder="Degree"
										value={item.degree ?? ""}
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
								</div>
								<div>
									<label
										htmlFor={`edu-field-${item.__id}`}
										className="text-sm text-muted-foreground"
									>
										Field
									</label>
									<Input
										id={`edu-field-${item.__id}`}
										placeholder="Field"
										value={item.field ?? ""}
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
								</div>
							</div>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
								<div>
									<label
										htmlFor={`edu-start-${item.__id}`}
										className="text-sm text-muted-foreground"
									>
										Start Year
									</label>
									<Input
										id={`edu-start-${item.__id}`}
										placeholder="Start Year"
										value={item.startDate ?? ""}
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
								</div>
								<div>
									<label
										htmlFor={`edu-end-${item.__id}`}
										className="text-sm text-muted-foreground"
									>
										End Year
									</label>
									<Input
										id={`edu-end-${item.__id}`}
										placeholder="End Year"
										value={item.endDate ?? ""}
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
								</div>
							</div>
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
						const newEntry: WithId<Experience> = {
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
						<div key={item.__id} className="space-y-3 border rounded p-3">
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
								<div>
									<label
										htmlFor={`exp-company-${item.__id}`}
										className="text-sm text-muted-foreground"
									>
										Company Name
									</label>
									<Input
										id={`exp-company-${item.__id}`}
										placeholder="Company Name"
										value={item.company ?? ""}
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
								</div>
								<div>
									<label
										htmlFor={`exp-location-${item.__id}`}
										className="text-sm text-muted-foreground"
									>
										Location
									</label>
									<Input
										id={`exp-location-${item.__id}`}
										placeholder="Location"
										value={item.location ?? ""}
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
								</div>
							</div>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
								<div>
									<label
										htmlFor={`exp-start-${item.__id}`}
										className="text-sm text-muted-foreground"
									>
										Start
									</label>
									<Input
										id={`exp-start-${item.__id}`}
										placeholder="Start"
										value={item.startDate ?? ""}
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
								</div>
								<div>
									<label
										htmlFor={`exp-end-${item.__id}`}
										className="text-sm text-muted-foreground"
									>
										End
									</label>
									<Input
										id={`exp-end-${item.__id}`}
										placeholder="End"
										value={item.endDate ?? ""}
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
								</div>
							</div>
							<div>
								<label
									htmlFor={`exp-summary-${item.__id}`}
									className="text-sm text-muted-foreground"
								>
									Summary
								</label>
								<Textarea
									id={`exp-summary-${item.__id}`}
									placeholder="Summary"
									value={item.summary ?? ""}
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
							</div>
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
						const newEntry: WithId<Project> = {
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
						<div key={item.__id} className="space-y-3 border rounded p-3">
							<div>
								<label
									htmlFor={`project-name-${item.__id}`}
									className="text-sm text-muted-foreground"
								>
									Project Name
								</label>
								<Input
									id={`project-name-${item.__id}`}
									placeholder="Project Name"
									value={item.name ?? ""}
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
							</div>
							<div>
								<label
									htmlFor={`project-description-${item.__id}`}
									className="text-sm text-muted-foreground"
								>
									Description
								</label>
								<Textarea
									id={`project-description-${item.__id}`}
									placeholder="Description"
									value={item.description ?? ""}
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
							</div>
							<div>
								<label
									htmlFor={`project-technologies-${item.__id}`}
									className="text-sm text-muted-foreground"
								>
									Technologies
								</label>
								<Input
									id={`project-technologies-${item.__id}`}
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
							</div>
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
		</div>
	);
}
