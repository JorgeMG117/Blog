import useSWR from "swr";
import { Reaction, ReactionType } from "../types/api/types";
import AnchorButton from "./anchor-button";
import ClipboardButton from "./clipboard-button";
import ButtonIcon from "./button-icon";
import { icons } from "../types/icons";

interface Props {
  postSlug: string;
  url: string;
}

async function getReactions(url: string): Promise<Reaction[]> {
  const res = await fetch(url).then((r) => r.json());
  return JSON.parse(res) as Reaction[];
}

async function sendReaction(
  slug: string,
  type: ReactionType,
  count: number
): Promise<Reaction[]> {
  const res = await fetch(
    `/api/post/reaction?slug=${slug}
&type=${type}&count=${count}`,
    { method: "POST" }
  ).then((r) => r.json());
  return JSON.parse(res) as Reaction[];
}

async function deleteReaction(
  slug: string,
  type: ReactionType,
  count: number
): Promise<Reaction[]> {
  const res = await fetch(
    `/api/post/reaction?slug=${slug}
&type=${type}&count=${count}`,
    { method: "DELETE" }
  ).then((r) => r.json());
  return JSON.parse(res) as Reaction[];
}

export default function ReactionRow({ postSlug, url }: Props) {
  const { data, mutate, error } = useSWR<Reaction[]>(
    `/api/post/reaction?slug=${postSlug}`,
    getReactions,
    {
      revalidateIfStale: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      shouldRetryOnError: false,
    }
  );

  return (
    <>
      <hr className="mt-6" />
      <div className="my-2 pt-2 flex flex-wrap">
        {!error && (
          <button
            type="button"
            className={`text-sm mb-3 mr-2 py-2 px-3 rounded-lg bg-gray-100 dark:bg-stone-900 hover:ring-2 ring-stone-400 transition-all ${
              data && data[0].hasReacted ? "opacity-60 ring-2" : ""
            }`}
            onClick={() =>
              mutate(
                data && data[0].hasReacted
                  ? deleteReaction(postSlug, "like", data[0].count)
                  : data && sendReaction(postSlug, "like", data[0].count),
                {
                  populateCache: (updatedReaction, current) => {
                    return updatedReaction;
                  },
                  revalidate: false,
                }
              )
            }
          >
            👍{data && <span className="text-sm ml-1">{data[0].count}</span>}
          </button>
        )}
        <AnchorButton
          href={`https://twitter.com/intent/tweet?url=${encodeURI(url)}`}
        >
          <ButtonIcon
            fill="rgb(29,155,240)"
            path={icons.twitter}
            dimensions={[17, 17]}
          />
          <span className="text-sm ml-2">Share</span>
        </AnchorButton>
        <AnchorButton href="https://jorgemartinezgil.com/feed.xml">
          <ButtonIcon
            fill="currentColor"
            path={icons.bell}
            dimensions={[17, 17]}
          />
          <span className="text-sm ml-2">Subscribe</span>
        </AnchorButton>
        <ClipboardButton url={url} />
      </div>
    </>
  );
}
