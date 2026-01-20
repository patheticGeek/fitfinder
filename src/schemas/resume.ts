import { z } from "zod";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
	message: "Date must be in YYYY-MM-DD format",
});

export const educationSchema = z.object({
	institution: z.string(),
	degree: z.string().optional(),
	field: z.string().optional(),
	startDate: dateSchema.optional(),
	endDate: dateSchema.optional(),
	location: z.string().optional(),
});

export const experienceSchema = z.object({
	company: z.string(),
	title: z.string().optional(),
	startDate: dateSchema.optional(),
	endDate: dateSchema.optional(),
	summary: z.string().optional(),
	location: z.string().optional(),
});

export const projectSchema = z.object({
	name: z.string(),
	description: z.string().optional(),
	technologies: z.array(z.string()).optional(),
});

export const interviewQuestionSchema = z.object({
	text: z.string(),
	topic: z.string().optional(),
	confidence: z.number().min(0).max(1).optional(),
	correctAnswer: z.string().optional(),
});

export const skillSchema = z.object({
	name: z.string(),
	level: z.enum(["beginner", "intermediate", "expert"]).optional(),
});

export type Education = z.infer<typeof educationSchema>;
export type Experience = z.infer<typeof experienceSchema>;
export type Project = z.infer<typeof projectSchema>;
export type InterviewQuestion = z.infer<typeof interviewQuestionSchema>;
export type Skill = z.infer<typeof skillSchema>;
