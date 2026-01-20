import type { Resume } from "../prisma-generated/client";
import {
	type Education,
	educationSchema,
	type Experience,
	experienceSchema,
	type Project,
	projectSchema,
} from "../schemas/resume";

export function parseEducation(resume: Resume): Education[] {
	if (!resume.education) return [];
	const parsed = educationSchema.array().safeParse(resume.education);
	return parsed.success ? parsed.data : [];
}

export function parseExperience(resume: Resume): Experience[] {
	if (!resume.experience) return [];
	const parsed = experienceSchema.array().safeParse(resume.experience);
	return parsed.success ? parsed.data : [];
}

export function parseProjects(resume: Resume): Project[] {
	if (!resume.projects) return [];
	const parsed = projectSchema.array().safeParse(resume.projects);
	return parsed.success ? parsed.data : [];
}

export function validateEducation(data: Education[]): Education[] {
	return educationSchema.array().parse(data);
}

export function validateExperience(data: Experience[]): Experience[] {
	return experienceSchema.array().parse(data);
}

export function validateProjects(data: Project[]): Project[] {
	return projectSchema.array().parse(data);
}

// Utility to compute total months of experience from entries
export function computeTotalExperienceMonths(entries: Experience[]): number {
	const toMonthIndex = (d: string | undefined): number => {
		if (!d) return 0;
		const date = new Date(d);
		if (Number.isNaN(date.getTime())) return 0;
		return date.getUTCFullYear() * 12 + date.getUTCMonth();
	};

	// Merge intervals and sum
	const ranges = entries
		.filter((e) => e.startDate)
		.map((e) => ({
			start: toMonthIndex(e.startDate),
			end: e.endDate
				? toMonthIndex(e.endDate)
				: toMonthIndex(new Date().toISOString()),
		}))
		.filter((r) => r.end >= r.start)
		.sort((a, b) => a.start - b.start);

	const merged: { start: number; end: number }[] = [];
	for (const r of ranges) {
		if (!merged.length || r.start > merged[merged.length - 1].end + 1) {
			merged.push({ ...r });
		} else {
			merged[merged.length - 1].end = Math.max(
				merged[merged.length - 1].end,
				r.end,
			);
		}
	}

	const totalMonths = merged.reduce((sum, r) => sum + (r.end - r.start + 1), 0);
	return Math.max(0, totalMonths);
}

export async function readFileAsBase64(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = () => reject(new Error("Failed to read file"));
		reader.readAsDataURL(file);
	});
}
