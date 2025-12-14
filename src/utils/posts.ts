// Posts API removed — keep stub exports to avoid runtime import errors
import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

export type PostType = {
  id: string;
  title: string;
  body: string;
};

export const fetchPost = createServerFn({ method: "GET" }).handler(async () => {
  // Previously fetched posts from external API; now disabled.
  throw notFound();
});

export const fetchPosts = createServerFn({ method: "GET" }).handler(
  async () => {
    // Disabled
    return [] as PostType[];
  }
);
