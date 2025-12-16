import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import React, { useState } from "react";
import { applyResumeFn, listJobsFn } from "./apply.fn";

export const Route = createFileRoute("/_authed/apply")({
  component: ApplyPage,
});

function ApplyPage() {
  const [jobDescription, setJobDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: useServerFn(applyResumeFn),
  });
  const listJobsServer = useServerFn(listJobsFn);
  const jobsQuery = useQuery({
    queryKey: ["jobs"],
    queryFn: async () => {
      const res = await listJobsServer();
      return res;
    },
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return alert("Please select a PDF resume");

    if (!selectedJobId) return alert("Please select a job before uploading");

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
            jobId: selectedJobId,
            orgId: selectedOrgId ?? undefined,
          },
        },
        {
          onError(err) {
            console.log(err);
          },
        }
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      alert("Failed to read file: " + msg);
    }
  };

  return (
    <div className="p-4 max-w-2xl">
      <h2 className="text-xl font-bold mb-2">Apply</h2>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="block font-medium">Select Job (required)</label>
          <select
            value={selectedJobId ?? ""}
            onChange={(e) => {
              const id = e.target.value || null;
              setSelectedJobId(id);
              if (!id) {
                setSelectedOrgId(null);
                setJobDescription("");
                return;
              }
              const job = jobsQuery.data?.jobs?.find((j) => j.id === id);
              if (job) {
                setSelectedOrgId(job.organization?.id ?? null);
                setJobDescription(job.description ?? "");
              }
            }}
            className="border p-2 w-full"
          >
            <option value="">-- None / Custom Job Description --</option>
            {jobsQuery.data?.jobs?.map((j) => (
              <option key={j.id} value={j.id}>
                {j.organization.name + " - " + (j.title ?? "Untitled")}
              </option>
            ))}
          </select>
        </div>
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
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Uploading..." : "Apply and Analyze"}
          </button>
        </div>
      </form>

      {mutation.data ? (
        <div className="mt-4 p-3 border rounded bg-gray-900">
          <div>
            Saved id: <strong>{mutation.data.id}</strong>
          </div>
          <div>
            Match Score: <strong>{mutation.data.score}%</strong>
          </div>
          {mutation.data.scoreJustification && (
            <div className="mt-2">
              <div className="font-semibold">Score Justification</div>
              <p className="text-gray-300 mt-1">{mutation.data.scoreJustification}</p>
            </div>
          )}
          {mutation.data.questions && (
            <div className="mt-2">
              <div className="font-semibold">Generated Questions</div>
              <ol className="list-decimal ml-6">
                {mutation.data.questions.map((q, i) => (
                  <li key={i}>
                    {q.text} - {q.topic} - {q.confidence}
                  </li>
                ))}
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
