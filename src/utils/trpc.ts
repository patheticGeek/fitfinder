import { useRouteContext } from "@tanstack/react-router";

export const useTRPC = () => useRouteContext({ from: "__root__" }).trpc;
