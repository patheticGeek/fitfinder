export interface ResumeEducation {
	school: string;
	degree: string;
	field: string;
	graduated?: string; // e.g. YYYY-MM or ISO date
}

export interface ResumeExperience {
	company: string;
	role: string;
	description?: string;
	startDate: string; // e.g. YYYY-MM or ISO date
	endDate?: string; // undefined/null means current
}

export interface ResumeProject {
	name: string;
	description: string;
	link?: string;
}

export interface ResumeSkillItem {
	name: string;
	level: "beginner" | "intermediate" | "expert";
}

export interface InterviewQuestionItem {
	id: string;
	question: string;
	order?: number;
}

export interface ResumeJSONShape {
	education?: ResumeEducation[];
	experience?: ResumeExperience[];
	projects?: ResumeProject[];
}
