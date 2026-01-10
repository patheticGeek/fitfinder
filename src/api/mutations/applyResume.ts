import { GoogleGenAI } from "@google/genai";
import { TRPCError } from "@trpc/server";
import pdfParse from "pdf-parse";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { prismaClient } from "~/utils/prisma";
import { authedProcedure } from "~/utils/trpcServer";

const ApplySchema = z.object({
	fileName: z.string().min(1),
	mimeType: z.string().regex(/^application\/pdf$/i),
	contentBase64: z.string().min(20),
	jobDescription: z.string().optional(),
	jobId: z.string().optional(),
	orgId: z.string().optional(),
});

const GeminiStructuredSchema = z.object({
	score: z.number().min(0).max(100),
	scoreJustification: z.string(),
	questions: z.array(
		z.object({
			text: z.string(),
			topic: z.string().optional(),
			confidence: z.number().min(0).max(1).optional(),
		}),
	),
});

async function generateMatchAndQuestionsWithGemini(
	resumeText: string,
	jobDescription: string,
) {
	if (!process.env.GEMINI_API_KEY) {
		throw new Error("GEMINI_API_KEY must be set to call Gemini.");
	}

	const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

	const prompt = `
  Generate a match score (0-100), a brief justification for that score, and 5 short interview questions to test a candidate's knowledge based on the following resume and job description.
  
  The scoreJustification should be a 2-3 sentence summary explaining why the candidate received this score, highlighting key matches or gaps between their experience and the job requirements.
  
  <resume>\n${resumeText}\n</resume>
  <job-description>\n${jobDescription}\n</job-description>
  `.trim();

	try {
		const resp = await ai.models.generateContent({
			model: "gemini-flash-lite-latest",
			contents: prompt,
			config: {
				responseMimeType: "application/json",
				responseJsonSchema: zodToJsonSchema(GeminiStructuredSchema),
			},
		});

		const out =
			resp?.text || resp?.candidates?.map((c) => c?.content).join("\n") || "";

		if (!out) throw new Error("@google/genai returned empty output.");

		const validated = GeminiStructuredSchema.parse(JSON.parse(out));

		const questions = validated.questions.map((q) => ({
			text: String(q.text),
			topic: q.topic ? String(q.topic) : undefined,
			confidence: typeof q.confidence === "number" ? q.confidence : undefined,
		}));

		return {
			score: Math.round(validated.score),
			scoreJustification: validated.scoreJustification,
			questions,
		};
	} catch (e) {
		throw new Error(
			`@google/genai invocation/parse failed: ${(e as Error)?.message || String(e)}`,
		);
	}
}

export const applyResume = authedProcedure
	.input(ApplySchema)
	.mutation(async ({ ctx, input }) => {
		try {
			const { fileName, contentBase64, jobDescription, jobId, orgId } = input;

			const user = ctx.user;

			const buf = Buffer.from(contentBase64, "base64");
			const pdf = await pdfParse(buf);
			const text = (pdf.text || "").replace(/\s+/g, " ").trim();

			const geminiOut = await generateMatchAndQuestionsWithGemini(
				text,
				jobDescription || "",
			);

			const id = crypto.randomUUID();

			let resumeRecord = null;
			try {
				resumeRecord = await prismaClient.resume.create({
					data: {
						fileName,
						score: geminiOut.score,
						scoreJustification: geminiOut.scoreJustification,
						questions: geminiOut.questions,
						userId: user.id,
						jobId: jobId ?? undefined,
						organizationId: orgId ?? undefined,
					},
				});
			} catch (e) {
				console.warn(
					"Failed to persist resume record:",
					(e as Error)?.message || e,
				);
			}

			return {
				id,
				path: `/uploaded/${id}/resume.pdf`,
				score: geminiOut.score,
				scoreJustification: geminiOut.scoreJustification,
				questions: geminiOut.questions,
				jobId: jobId ?? null,
				orgId: orgId ?? null,
				resumeId: resumeRecord?.id ?? null,
			};
		} catch (err) {
			const message = (err as Error)?.message || String(err) || "Unknown error";
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message,
			});
		}
	});
