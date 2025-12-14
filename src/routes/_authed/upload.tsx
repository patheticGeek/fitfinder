import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import React, { useState } from "react";
import { uploadResumeFn } from "./upload.fn";

export const Route = createFileRoute("/_authed/upload")({
  component: UploadPage,
});

function UploadPage() {
  const [jobDescription, setJobDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const mutation = useMutation({
    mutationFn: useServerFn(uploadResumeFn),
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return alert("Please select a PDF resume");
    setLoading(true);
    try {
      const base64 = (await readFileAsBase64(file)) as string;
      const contentBase64 = base64.replace(/^data:.*;base64,/, "");
      mutation.mutate(
        {
          data: {
            fileName: file.name,
            mimeType: file.type,
            contentBase64,
            jobDescription,
          },
        },
        {
          onSuccess(data) {
            setResult(data);
          },
          onError(err: any) {
            console.log(err);
          },
          onSettled() {
            setLoading(false);
          },
        }
      );
    } catch (err: any) {
      setLoading(false);
      alert("Failed to read file: " + err.message);
    }
  };

  return (
    <div className="p-4 max-w-2xl">
      <h2 className="text-xl font-bold mb-2">Upload Resume</h2>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="block font-medium">Resume (PDF)</label>
          <input
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            type="file"
          />
        </div>
        <div>
          <label className="block font-medium">Job Description</label>
          <textarea
            rows={6}
            className="w-full border p-2"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
          />
        </div>
        <div>
          <button
            className="px-3 py-1 bg-blue-600 text-white rounded"
            disabled={loading}
          >
            {loading ? "Uploading..." : "Upload and Analyze"}
          </button>
        </div>
      </form>

      {mutation.data || result ? (
        <div className="mt-4 p-3 border rounded bg-gray-900">
          <div>
            Saved id: <strong>{(mutation.data || result)?.id}</strong>
          </div>
          <div>
            Match Score: <strong>{(mutation.data || result)?.score}%</strong>
          </div>
          {(mutation.data || result)?.path && (
            <div>
              Resume URL:{" "}
              <a
                className="text-blue-600"
                href={`${(mutation.data || result).path}`}
                target="_blank"
                rel="noreferrer"
              >
                Open
              </a>
            </div>
          )}
          {(mutation.data || result)?.questions && (
            <div className="mt-2">
              <div className="font-semibold">Generated Questions</div>
              <ol className="list-decimal ml-6">
                {(mutation.data || result).questions.map(
                  (q: string, i: number) => (
                    <li key={i}>{q}</li>
                  )
                )}
              </ol>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function readFileAsBase64(file: File) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("File read error"));
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}
