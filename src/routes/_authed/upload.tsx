import { createFileRoute } from "@tanstack/react-router";
import React, { useEffect } from "react";

export const Route = createFileRoute("/_authed/upload")({
  component: UploadRedirect,
});

function UploadRedirect() {
  useEffect(() => {
    window.location.pathname = "/apply";
  }, []);
  return <div>Redirecting to Apply…</div>;
}
