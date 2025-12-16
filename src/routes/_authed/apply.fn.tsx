import { GoogleGenAI } from "@google/genai";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import pdfParse from "pdf-parse";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { prismaClient } from "~/utils/prisma";
import { useAppSession } from "~/utils/session";

type ApplyInput = {
  fileName: string;
  mimeType: string;
  contentBase64: string;
  jobDescription?: string;
  jobId?: string;
  orgId?: string;
};

const ApplySchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().regex(/^application\/pdf$/i),
  contentBase64: z.string().min(20),
  jobDescription: z.string().optional(),
  jobId: z.string().optional(),
  orgId: z.string().optional(),
});

export const applyResumeFn = createServerFn({ method: "POST" })
  .inputValidator((d: ApplyInput) => d)
  .handler(async ({ data }) => {
    try {
      if (data == null) {
        return {
          error: true,
          message: "No input data received (client sent undefined).",
        };
      }

      const parsed = ApplySchema.safeParse(data);
      if (!parsed.success) {
        return { error: true, message: parsed.error.message };
      }
      const {
        fileName,
        mimeType,
        contentBase64,
        jobDescription,
        jobId,
        orgId,
      } = parsed.data;

      const session = await useAppSession();
      const userEmail = session?.data?.userEmail;
      const user = userEmail
        ? await prismaClient.user.findUnique({ where: { email: userEmail } })
        : null;

      const id = uuidv4();

      const buf = Buffer.from(contentBase64, "base64");

      const pdf = await pdfParse(buf);
      const text = (pdf.text || "").replace(/\s+/g, " ").trim();

      if (!process.env.GEMINI_API_KEY) {
        return {
          error: true,
          message:
            "GEMINI_API_KEY is required to generate structured match and questions.",
        };
      }

      const geminiOut = await generateMatchAndQuestionsWithGemini(
        text,
        jobDescription || ""
      );

      let resumeRecord: any = null;
      try {
        resumeRecord = await prismaClient.resume.create({
          data: {
            fileName,
            path: `/uploaded/${id}/resume.pdf`,
            score: geminiOut.score,
            questions: geminiOut.questions,
            userId: user?.id ?? undefined,
            jobId: jobId ?? undefined,
            organizationId: orgId ?? undefined,
          },
        });
      } catch (e: any) {
        console.warn("Failed to persist resume record:", e?.message || e);
      }

      return {
        id,
        path: `/uploaded/${id}/resume.pdf`,
        score: geminiOut.score,
        questions: geminiOut.questions,
        jobId: jobId ?? null,
        orgId: orgId ?? null,
        resumeId: resumeRecord?.id ?? null,
      };
    } catch (err: any) {
      const message = err?.message || String(err) || "Unknown error";
      return { error: true, message };
    }
  });

export const listJobsFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const session = await useAppSession();
    const userEmail = (session as any).data?.userEmail;
    if (!userEmail) return { error: true, message: "Not authenticated" };

    const jobs = await prismaClient.job.findMany({
      include: { organization: true },
      orderBy: { createdAt: "desc" },
    });

    return { jobs };
  }
);

const GeminiStructuredSchema = z.object({
  score: z.number().min(0).max(100),
  questions: z.array(
    z.object({
      text: z.string(),
      topic: z.string().optional(),
      confidence: z.number().min(0).max(1).optional(),
    })
  ),
});

async function generateMatchAndQuestionsWithGemini(
  resumeText: string,
  jobDescription: string
) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY must be set to call Gemini.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const prompt = `
  Generate a match score and 5 short interview questions to test a candidate's knowledge based on the following resume and job description.
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

    let out =
      resp?.text || resp?.candidates?.map((c) => c?.content).join("\n") || "";

    if (!out) throw new Error("@google/genai returned empty output.");

    const validated = GeminiStructuredSchema.parse(JSON.parse(out));

    const questions = validated.questions.map((q: any) => ({
      text: String(q.text),
      topic: q.topic ? String(q.topic) : undefined,
      confidence: typeof q.confidence === "number" ? q.confidence : undefined,
    }));

    return { score: Math.round(validated.score), questions };
  } catch (e: any) {
    throw new Error(
      `@google/genai invocation/parse failed: ${e?.message || String(e)}`
    );
  }
}

export const Route = createFileRoute("/_authed/apply/fn")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/apply/fn"!</div>;
}
