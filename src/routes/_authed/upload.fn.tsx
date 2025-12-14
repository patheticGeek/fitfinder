import { GoogleGenAI } from "@google/genai";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import fs from "fs";
import path from "path";
import pdfParse from "pdf-parse";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

type UploadInput = {
  fileName: string;
  mimeType: string;
  contentBase64: string;
  jobDescription?: string;
};

const UploadSchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().regex(/^application\/pdf$/i),
  contentBase64: z.string().min(20),
  jobDescription: z.string().optional(),
});

export const uploadResumeFn = createServerFn({ method: "POST" })
  .inputValidator((d: UploadInput) => d)
  .handler(async ({ data }) => {
    try {
      // Early check: if no data was sent, return a clear error instead of
      // letting Zod produce an 'expected object received undefined' message.
      if (data == null) {
        return {
          error: true,
          message: "No input data received (client sent undefined).",
        };
      }

      // Validate inside handler to avoid throwing a ZodError that the
      // dev-server runtime may attempt to inspect (which can cause the
      // observed TypeError). Use safeParse and return a simple error shape.
      const parsed = UploadSchema.safeParse(data as any);
      if (!parsed.success) {
        return { error: true, message: parsed.error.message };
      }
      const { fileName, mimeType, contentBase64, jobDescription } = parsed.data;

      const UPLOAD_DIR = path.join(process.cwd(), "uploaded");
      if (!fs.existsSync(UPLOAD_DIR))
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });

      const id = uuidv4();
      const destDir = path.join(UPLOAD_DIR, id);
      fs.mkdirSync(destDir, { recursive: true });

      const buf = Buffer.from(contentBase64, "base64");
      const destPath = path.join(destDir, "resume.pdf");
      await fs.promises.writeFile(destPath, buf);

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

      return {
        id,
        path: `/uploaded/${id}/resume.pdf`,
        score: geminiOut.score,
        questions: geminiOut.questions,
      };
    } catch (err: any) {
      // Return a simple error object to avoid the server runtime attempting
      // to inspect complex error shapes which can cause util.inspect failures.
      const message = err?.message || String(err) || "Unknown error";
      return { error: true, message };
    }
  });

function computeMatchScore(resumeText: string, jobDescription: string) {
  if (!jobDescription) return 0;
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  const jdTokens = Array.from(
    new Set(normalize(jobDescription).split(/\s+/).filter(Boolean))
  );
  const resumeTokens = new Set(
    normalize(resumeText).split(/\s+/).filter(Boolean)
  );
  if (jdTokens.length === 0) return 0;
  const matches = jdTokens.filter((t) => resumeTokens.has(t)).length;
  return Math.round((matches / jdTokens.length) * 100);
}

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

    // Normalize questions to expected shape (strings -> objects)
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

export const Route = createFileRoute("/_authed/upload/fn")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/upload/fn"!</div>;
}
