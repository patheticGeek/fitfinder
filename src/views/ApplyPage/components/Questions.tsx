"use client";

import { Textarea } from "~/components/ui/textarea";

interface Question {
	id: string;
	question: string;
}

interface QuestionsProps {
	questions: Question[];
	answers: { id: string; answer: string }[];
	setAnswers: (
		answers:
			| { id: string; answer: string }[]
			| ((
					prev: { id: string; answer: string }[],
			  ) => { id: string; answer: string }[]),
	) => void;
}

export function Questions({ questions, answers, setAnswers }: QuestionsProps) {
	return (
		<div className="space-y-4">
			<h2 className="text-xl font-semibold">Interview Questions</h2>
			<div className="space-y-3">
				{questions.map((qa, idx: number) => (
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
		</div>
	);
}
