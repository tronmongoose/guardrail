import { prisma } from "@/lib/prisma";
import { getCurrentUser, getEntitlement } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { resolveTokens } from "@/lib/resolve-tokens";
import { SkinThemeProvider } from "@/components/skins/SkinThemeProvider";
import { SessionViewer } from "./viewer";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ programId: string; sessionId: string }>;
}) {
  const { programId, sessionId } = await params;

  const user = await getCurrentUser();
  if (!user) redirect("/");

  // Fetch session + program in one query to check creator ownership
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      week: {
        include: {
          program: true,
        },
      },
      actions: {
        orderBy: { orderIndex: "asc" },
        include: {
          youtubeVideo: true,
          progress: { where: { userId: user.id } },
        },
      },
      compositeSession: {
        include: {
          clips: {
            orderBy: { orderIndex: "asc" },
            include: { youtubeVideo: true },
          },
          overlays: {
            orderBy: { orderIndex: "asc" },
          },
        },
      },
    },
  });

  if (!session) notFound();

  const program = session.week.program;
  if (program.id !== programId) notFound();

  // Creators can always view their own program's sessions (even unpublished)
  const isCreator = program.creatorId === user.id;

  if (!isCreator) {
    if (!program.published) notFound();

    const entitlement = await getEntitlement(user.id, programId);
    if (!entitlement || entitlement.status !== "ACTIVE") {
      redirect("/");
    }

    // Check week-level access for learners
    let currentWeek: number;
    if (program.pacingMode === "DRIP_BY_WEEK") {
      const daysSinceEnrollment = Math.floor(
        (Date.now() - entitlement.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      currentWeek = Math.min(
        Math.floor(daysSinceEnrollment / 7) + 1,
        program.durationWeeks
      );
    } else {
      currentWeek = entitlement.currentWeek;
    }

    if (session.week.weekNumber > currentWeek) {
      redirect(`/learn/${programId}`);
    }
  }

  const tokens = await resolveTokens(program);

  // Build clip playlist: use CompositeSession clips if available,
  // otherwise fall back to WATCH actions' videos
  const clips = session.compositeSession?.clips ?? [];
  const overlays = session.compositeSession?.overlays ?? [];
  const autoAdvance = session.compositeSession?.autoAdvance ?? true;

  // Fallback: auto-build playlist from WATCH actions if no composite
  const fallbackClips =
    clips.length === 0
      ? session.actions
          .filter((a) => a.type === "WATCH" && (a.youtubeVideo || a.muxPlaybackId || a.muxStatus))
          .map((a, i) => ({
            id: `fallback-${a.id}`,
            compositeSessionId: "",
            youtubeVideoId: a.youtubeVideo?.id ?? "",
            youtubeVideo: a.youtubeVideo ?? { id: "", videoId: "", url: "", title: a.title, thumbnailUrl: null, durationSeconds: null, muxPlaybackId: null },
            startSeconds: null,
            endSeconds: null,
            orderIndex: i,
            transitionType: "NONE" as const,
            transitionDurationMs: 0,
            chapterTitle: a.title,
            chapterDescription: null,
            // Mux fields threaded from the Action record
            muxPlaybackId: a.muxPlaybackId ?? undefined,
            muxStatus: a.muxStatus ?? undefined,
          }))
      : [];

  const finalClips = clips.length > 0 ? clips : fallbackClips;

  return (
    <SkinThemeProvider tokens={tokens}>
      <SessionViewer
        programId={programId}
        session={{
          id: session.id,
          title: session.title,
          summary: session.summary,
          keyTakeaways: session.keyTakeaways,
        }}
        clips={finalClips.map((c) => ({
          id: c.id,
          youtubeVideoId: c.youtubeVideo.videoId,
          // Action-level Mux fields take priority; fall back to YouTubeVideo-level for composite clips
          muxPlaybackId:
            (c as { muxPlaybackId?: string }).muxPlaybackId ??
            c.youtubeVideo.muxPlaybackId ??
            undefined,
          // For composite clips, muxStatus lives on the Action record (direct uploads) but
          // NOT on YouTubeVideo. Derive it from YouTubeVideo fields so the viewer can show
          // the correct state (ready → MuxVideoPlayer, waiting → spinner, undefined → YouTube).
          muxStatus:
            (c as { muxStatus?: string }).muxStatus ??
            (c.youtubeVideo.muxPlaybackId
              ? "ready"
              : (c.youtubeVideo as { muxUploadId?: string | null }).muxUploadId != null
              ? "waiting"
              : undefined),
          blobUrl: c.youtubeVideo.url.includes("blob.vercel-storage.com")
            ? c.youtubeVideo.url
            : undefined,
          title: c.youtubeVideo.title ?? c.chapterTitle ?? "Untitled",
          chapterTitle: c.chapterTitle ?? c.youtubeVideo.title ?? "Untitled",
          chapterDescription: c.chapterDescription ?? undefined,
          thumbnailUrl: c.youtubeVideo.thumbnailUrl ?? undefined,
          startSeconds: c.startSeconds ?? undefined,
          endSeconds: c.endSeconds ?? undefined,
          durationSeconds: c.youtubeVideo.durationSeconds ?? undefined,
          transitionType: c.transitionType,
          transitionDurationMs: c.transitionDurationMs,
        }))}
        overlays={overlays.map((o) => ({
          id: o.id,
          type: o.type,
          content: o.content as Record<string, unknown>,
          clipOrderIndex: o.clipOrderIndex ?? undefined,
          triggerAtSeconds: o.triggerAtSeconds ?? undefined,
          durationMs: o.durationMs,
          position: o.position,
        }))}
        actions={session.actions.map((a) => ({
          id: a.id,
          title: a.title,
          type: a.type,
          instructions: a.instructions,
          reflectionPrompt: a.reflectionPrompt,
          completed: a.progress[0]?.completed ?? false,
          reflectionText: a.progress[0]?.reflectionText ?? undefined,
        }))}
        autoAdvance={autoAdvance}
        userId={user.id}
        transitionMode={program.transitionMode ?? "NONE"}
        hideTransition={session.hideTransition ?? false}
      />
    </SkinThemeProvider>
  );
}
