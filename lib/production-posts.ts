import type { BlogPost } from "./posts";
import type { ApiResponse, SearchHit } from "../types/api/types";

const productionOrigin = "https://jorgemartinezgil.com";

interface ProductionPageData {
  props?: {
    pageProps?: {
      post?: BlogPost;
    };
  };
}

let postSummariesPromise: Promise<BlogPost[]> | null = null;

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "America/Chicago",
  });
}

async function fetchPostSummaries(): Promise<BlogPost[]> {
  const response = await fetch(`${productionOrigin}/api/post/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: "" }),
  });
  if (!response.ok) {
    throw new Error(`Production post index returned ${response.status}.`);
  }

  const result = (await response.json()) as ApiResponse<SearchHit[]>;
  if (!result.isSuccess || !result.data) {
    throw new Error("Production post index returned an invalid response.");
  }

  return result.data
    .map((post) => ({
      id: post.objectID,
      title: post.title,
      content: "",
      contentIsHtml: false,
      slug: post.slug,
      date: formatDate(post.date),
      description: post.description,
      tags: post.metadata,
    }))
    .sort((left, right) => Date.parse(right.date) - Date.parse(left.date));
}

export function getProductionPostSummaries(): Promise<BlogPost[]> {
  postSummariesPromise ??= fetchPostSummaries();
  return postSummariesPromise;
}

export async function getProductionPost(slug: string): Promise<BlogPost> {
  const response = await fetch(
    `${productionOrigin}/posts/${encodeURIComponent(slug)}`,
  );
  if (!response.ok) {
    throw new Error(`Production post page returned ${response.status}.`);
  }

  const html = await response.text();
  const match = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/,
  );
  if (!match) throw new Error("Production post data was not found.");

  const pageData = JSON.parse(match[1]) as ProductionPageData;
  const post = pageData.props?.pageProps?.post;
  if (!post || post.slug !== slug) {
    throw new Error("Production post data was invalid.");
  }

  return { ...post, contentIsHtml: true };
}
