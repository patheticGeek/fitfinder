import { useRouteContext } from "@tanstack/react-router";

export const useGlobalContext = () => useRouteContext({ from: "__root__" });
