import { z } from "zod";

export const educationSchema = z.object({
	institution: z.string(),
	degree: z.string().optional(),
	field: z.string().optional(),
	startDate: z.string().optional(),
	endDate: z.string().optional(),
	location: z.string().optional(),
});

export const experienceSchema = z.object({
	company: z.string(),
	title: z.string().optional(),
	startDate: z.string().optional(),
	endDate: z.string().optional(),
	summary: z.string().optional(),
	location: z.string().optional(),
});

export const projectSchema = z.object({
	name: z.string(),
	description: z.string().optional(),
	technologies: z.array(z.string()).optional(),
});

export const skillItemSchema = z.object({
	name: z.string().min(1),
	level: z.enum(["beginner", "intermediate", "expert"]),
});

export const interviewQuestionItemSchema = z.object({
	id: z.string().min(1),
	question: z.string().min(1),
	order: z.number().optional(),
});

export const resumeJSONSchema = z.object({
	education: educationSchema.array().optional(),
	experience: experienceSchema.array().optional(),
	projects: projectSchema.array().optional(),
});

export type Education = z.infer<typeof educationSchema>;
export type Experience = z.infer<typeof experienceSchema>;
export type Project = z.infer<typeof projectSchema>;
export type SkillItem = z.infer<typeof skillItemSchema>;
export type InterviewQuestionItem = z.infer<typeof interviewQuestionItemSchema>;
export type ResumeJSON = z.infer<typeof resumeJSONSchema>;
