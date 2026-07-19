"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { API_URL } from "@/lib/api";

type Comment = {
  id: string;
  author_type: string;
  comment_text: string;
  created_at: string;
};

type ApprovalLink = {
  content_item: {
    title: string;
    content_text?: string | null;
    platform: string;
    scheduled_date?: string | null;
    status: string;
  };
  status: string;
  comments: Comment[];
};

export default function ApprovalPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [data, setData] = useState<ApprovalLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [postingComment, setPostingComment] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/approval-links/${token}`, { cache: "no-store" });
      if (res.status === 410) throw new Error("This approval link has expired. Ask your freelancer to send a new one.");
      if (res.status === 404) throw new Error("This approval link couldn't be found.");
      if (!res.ok) throw new Error("Couldn't load this content.");
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function updateStatus(status: "Approved" | "Rejected" | "Changes Requested") {
    setUpdating(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/approval-links/${token}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Couldn't update the status.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setUpdating(false);
    }
  }

  async function addComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) return;
    setPostingComment(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/approval-links/${token}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author_type: "client", comment_text: commentText }),
      });
      if (!res.ok) throw new Error("Couldn't post your comment.");
      setCommentText("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPostingComment(false);
    }
  }

  return (
    <div className="mx-auto min-h-[100dvh] max-w-2xl bg-zinc-950 px-6 py-12 text-zinc-100">
      <div className="mb-8 flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-xl bg-[#d97745] text-sm font-bold text-zinc-950">F</span>
        <span className="text-[15px] font-semibold tracking-tight">FreelanceFlow</span>
      </div>

      {loading ? (
        <div className="h-64 animate-pulse rounded-2xl bg-zinc-900" />
      ) : error || !data ? (
        <section role="alert" className="rounded-2xl border border-[#d97745]/40 bg-[#d97745]/10 p-6">
          <p className="font-medium text-zinc-100">Unavailable</p>
          <p className="mt-2 text-sm text-zinc-400">{error}</p>
        </section>
      ) : (
        <>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#d97745]">Review content</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{data.content_item.title}</h1>
          <p className="mt-2 text-sm text-zinc-500">
            {data.content_item.platform}
            {data.content_item.scheduled_date ? ` · scheduled for ${data.content_item.scheduled_date}` : ""}
          </p>
          <span className="mt-4 inline-block rounded-md border border-[#d97745]/30 bg-[#d97745]/10 px-2 py-0.5 text-[11px] font-medium text-[#d97745]">
            {data.status}
          </span>

          {data.content_item.content_text && (
            <div className="mt-6 whitespace-pre-wrap rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5 text-sm text-zinc-200">
              {data.content_item.content_text}
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={updating}
              onClick={() => void updateStatus("Approved")}
              className="rounded-xl bg-[#d97745] px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-[#e18a5c] disabled:opacity-60"
            >
              Approve
            </button>
            <button
              type="button"
              disabled={updating}
              onClick={() => void updateStatus("Changes Requested")}
              className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-medium transition hover:bg-zinc-800 disabled:opacity-60"
            >
              Request changes
            </button>
            <button
              type="button"
              disabled={updating}
              onClick={() => void updateStatus("Rejected")}
              className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-medium transition hover:bg-zinc-800 disabled:opacity-60"
            >
              Reject
            </button>
          </div>

          <section className="mt-10">
            <h2 className="text-sm font-medium text-zinc-400">Comments</h2>
            <div className="mt-3 space-y-3">
              {data.comments.length === 0 ? (
                <p className="text-sm text-zinc-500">No comments yet.</p>
              ) : (
                data.comments.map((comment) => (
                  <div key={comment.id} className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{comment.author_type}</p>
                    <p className="mt-1 text-sm text-zinc-200">{comment.comment_text}</p>
                  </div>
                ))
              )}
            </div>
            <form onSubmit={addComment} className="mt-4 flex gap-3">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Leave feedback…"
                className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-[#d97745]"
              />
              <button
                type="submit"
                disabled={postingComment}
                className="rounded-xl bg-[#d97745] px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-[#e18a5c] disabled:opacity-60"
              >
                {postingComment ? "Posting…" : "Post"}
              </button>
            </form>
          </section>
        </>
      )}
    </div>
  );
}
