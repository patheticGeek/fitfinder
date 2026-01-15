"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { Spinner } from "~/components/ui/spinner";
import {
	Stepper,
	StepperBody,
	StepperHeader,
	StepperIcon,
	StepperItem,
	StepperSeparator,
} from "~/components/ui/stepper";
import type { AppRouterInputs } from "~/routes/api/trpc/$";
import type { Education, Experience, Project } from "~/schemas/resume";
import { cn } from "~/utils/cn";
import { useGlobalContext } from "~/utils/hooks";
import { Details } from "./components/Details";
import { Questions } from "./components/Questions";

type SubmitInput = AppRouterInputs["submitInviteApplication"];

type WithId<T> = T & { __id: string };

interface ApplyPageProps {
	jobId: string;
	code: string;
}

export function ApplyPage({ jobId, code }: ApplyPageProps) {
	const { trpc } = useGlobalContext();

	const inviteQ = useQuery(trpc.getInviteData.queryOptions({ jobId, code }));
	const submitM = useMutation(trpc.submitInviteApplication.mutationOptions());

	const [currentStep, setCurrentStep] = useState(0);
	const [isSubmitted, setIsSubmitted] = useState(false);
	const [email, setEmail] = useState("");
	const [phone, setPhone] = useState("");
	const [skills, setSkills] = useState<string[]>([]);
	const [newSkill, setNewSkill] = useState("");
	const [education, setEducation] = useState<WithId<Education>[]>([]);
	const [experience, setExperience] = useState<WithId<Experience>[]>([]);
	const [projects, setProjects] = useState<WithId<Project>[]>([]);
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
			? resume.education
			: [];
		setEducation(
			educationData.map((e) => ({
				...e,
				__id: crypto.randomUUID(),
			})),
		);

		const experienceData = Array.isArray(resume.experience)
			? resume.experience
			: [];
		setExperience(
			experienceData.map((e) => ({
				...e,
				__id: crypto.randomUUID(),
			})),
		);

		const projectsData = Array.isArray(resume.projects) ? resume.projects : [];
		setProjects(
			projectsData.map((p) => ({
				...p,
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
				answer: "",
			})),
		);
	}, [inviteQ.data]);

	const onSubmit = async () => {
		await submitM.mutateAsync({
			code,
			jobId,
			email: email || undefined,
			phone: phone || undefined,
			education: education.map(({ __id, ...rest }) => rest),
			experience: experience.map(({ __id, ...rest }) => rest),
			projects: projects.map(({ __id, ...rest }) => rest),
			skills,
			answers: answers.filter((a) => a.answer && a.answer.trim().length > 0),
		});
		setIsSubmitted(true);
	};

	if (inviteQ.isLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center p-6">
				<Card className="w-full max-w-md">
					<CardHeader className="text-center">
						<div className="flex justify-center">
							<Spinner className="size-8" />
						</div>
						<CardTitle className="mt-4">Loading invitation</CardTitle>
						<CardDescription>
							Please wait while we verify your invite code...
						</CardDescription>
					</CardHeader>
				</Card>
			</div>
		);
	}
	if (inviteQ.isError) {
		return (
			<div className="flex min-h-screen items-center justify-center p-6">
				<Card className="w-full max-w-md">
					<CardHeader className="text-center">
						<CardTitle className="text-destructive">
							Failed to load invitation
						</CardTitle>
						<CardDescription className="mt-2">
							{inviteQ.error instanceof Error
								? inviteQ.error.message
								: "The invite may be invalid or expired. Please check your invite code and try again."}
						</CardDescription>
					</CardHeader>
				</Card>
			</div>
		);
	}

	const resume = inviteQ.data?.resume;
	const questions = resume?.questionAnswers ?? [];

	if (isSubmitted) {
		return (
			<div className="flex flex-col h-screen">
				<header className="fixed top-0 left-0 right-0 z-50 bg-background border-b">
					<div className="max-w-3xl mx-auto p-6">
						<div className="space-y-1">
							<p className="text-sm text-muted-foreground">
								{resume?.job?.organization?.name ?? "Organization"}
							</p>
							<h1 className="text-lg font-bold">
								Apply for {resume?.job?.title ?? "the job"}
							</h1>
						</div>
					</div>
				</header>

				<div className="flex-1 overflow-y-auto pt-[100px] pb-[100px]">
					<div className="max-w-3xl mx-auto p-6">
						<Card className="w-full">
							<CardHeader className="text-center space-y-4">
								<div className="flex justify-center">
									<CheckCircle2 className="size-16 text-primary" />
								</div>
								<CardTitle className="text-2xl">That's all we need!</CardTitle>
								<CardDescription className="text-base">
									Your application has been submitted successfully. We'll review
									your information and get back to you soon.
								</CardDescription>
							</CardHeader>
						</Card>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col h-screen">
			<header className="fixed top-0 left-0 right-0 z-50 bg-background border-b">
				<div className="max-w-3xl mx-auto p-6">
					<div className="space-y-1">
						<p className="text-sm text-muted-foreground">
							{resume?.job?.organization?.name ?? "Organization"}
						</p>
						<h1 className="text-lg font-bold">
							Apply for {resume?.job?.title ?? "the job"}
						</h1>
					</div>
				</div>
			</header>

			<div className="flex-1 overflow-y-auto pt-[100px] pb-[100px]">
				<div className="max-w-3xl mx-auto space-y-8">
					<Stepper
						value={currentStep}
						onChange={setCurrentStep}
						className="mb-8"
					>
						<div className="flex w-full items-start">
							<StepperItem
								value={0}
								disabled={currentStep < 0}
								className="flex-1"
							>
								<div className="relative flex justify-center items-center w-full">
									<StepperSeparator
										className={cn(
											"absolute top-0 left-1/2 h-0.5 w-full -translate-x-1/2 transition-colors",
											currentStep > 0 ? "bg-primary" : "bg-muted",
										)}
									/>
									<div className="flex items-center gap-3 py-4">
										<StepperHeader className="flex justify-center">
											<StepperIcon
												className={cn(
													"flex size-10 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
													currentStep >= 0
														? "border-primary bg-primary text-primary-foreground"
														: "border-muted bg-background text-muted-foreground",
												)}
											>
												{currentStep > 0 ? "✓" : "1"}
											</StepperIcon>
										</StepperHeader>
										<StepperBody className="flex-1 text-center">
											<h6
												className={cn(
													"text-base font-semibold text-foreground",
												)}
											>
												Update Details
											</h6>
										</StepperBody>
									</div>
								</div>
							</StepperItem>
							<StepperItem
								value={1}
								disabled={currentStep < 1}
								className="flex-1"
							>
								<div className="relative flex justify-center items-center w-full">
									<StepperSeparator
										className={cn(
											"absolute top-0 left-1/2 h-0.5 w-full -translate-x-1/2 transition-colors",
											currentStep > 1 ? "bg-primary" : "bg-muted",
										)}
									/>
									<div className="flex items-center gap-3 py-4">
										<StepperHeader className="flex justify-center">
											<StepperIcon
												className={cn(
													"flex size-10 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
													currentStep >= 1
														? "border-primary bg-primary text-primary-foreground"
														: "border-muted bg-background text-muted-foreground",
												)}
											>
												2
											</StepperIcon>
										</StepperHeader>
										<StepperBody className="text-center">
											<h6
												className={cn(
													"text-base font-semibold text-foreground",
												)}
											>
												Some questions
											</h6>
										</StepperBody>
									</div>
								</div>
							</StepperItem>
						</div>
					</Stepper>

					{currentStep === 0 && (
						<Details
							email={email}
							setEmail={setEmail}
							phone={phone}
							setPhone={setPhone}
							skills={skills}
							setSkills={setSkills}
							newSkill={newSkill}
							setNewSkill={setNewSkill}
							education={education}
							setEducation={setEducation}
							experience={experience}
							setExperience={setExperience}
							projects={projects}
							setProjects={setProjects}
						/>
					)}

					{currentStep === 1 && (
						<Questions
							questions={questions}
							answers={answers}
							setAnswers={setAnswers}
						/>
					)}
				</div>
			</div>

			<footer className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t">
				<div className="max-w-3xl mx-auto p-6">
					<div className="flex justify-between gap-3">
						<Button
							type="button"
							variant="outline"
							onClick={() => window.location.reload()}
						>
							Reset
						</Button>
						<div className="flex gap-3">
							{currentStep > 0 && (
								<Button
									type="button"
									variant="outline"
									onClick={() => setCurrentStep(currentStep - 1)}
								>
									Previous
								</Button>
							)}
							{currentStep < 1 ? (
								<Button
									type="button"
									onClick={() => setCurrentStep(currentStep + 1)}
								>
									Next
								</Button>
							) : (
								<Button
									type="button"
									onClick={onSubmit}
									disabled={submitM.isPending}
								>
									{submitM.isPending ? "Submitting..." : "Submit Application"}
								</Button>
							)}
						</div>
					</div>
				</div>
			</footer>
		</div>
	);
}
