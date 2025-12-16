// src/services/session.server.ts
import { useSession } from "@tanstack/react-start/server";
import { User } from "~/prisma-generated/client";

type SessionUser = {
  userEmail: User["email"];
};

export function useAppSession() {
  if (!process.env.SESSION_PASSWORD) {
    throw new Error("SESSION_PASSWORD is not set in environment variables");
  }
  return useSession<SessionUser>({
    password: process.env.SESSION_PASSWORD,
  });
}
