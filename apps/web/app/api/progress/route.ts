import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { actionId, reflectionText, programId, weekNumber } = await req.json();

  // Save the progress
  const progress = await prisma.learnerProgress.upsert({
    where: { userId_actionId: { userId: user.id, actionId } },
    create: {
      userId: user.id,
      actionId,
      completed: true,
      completedAt: new Date(),
      reflectionText: reflectionText || null,
    },
    update: {
      completed: true,
      completedAt: new Date(),
      reflectionText: reflectionText || undefined,
    },
  });

  // If programId and weekNumber provided, check if week is complete
  let weekCompleted = false;
  let nextWeekUnlocked = false;
  let newCurrentWeek: number | null = null;

  if (programId && weekNumber) {
    // Get the entitlement
    const entitlement = await prisma.entitlement.findUnique({
      where: { userId_programId: { userId: user.id, programId } },
    });

    if (entitlement) {
      // Get all actions for this week
      const week = await prisma.week.findFirst({
        where: { programId, weekNumber },
        include: {
          sessions: {
            include: {
              actions: {
                include: {
                  progress: { where: { userId: user.id } },
                },
              },
            },
          },
        },
      });

      if (week) {
        const allActions = week.sessions.flatMap((s) => s.actions);
        const completedActions = allActions.filter(
          (a) => a.progress.some((p) => p.completed)
        );

        // Check if all actions in the week are complete
        if (allActions.length > 0 && completedActions.length === allActions.length) {
          // Check if we already recorded this week completion
          const existingCompletion = await prisma.weekCompletion.findUnique({
            where: {
              entitlementId_weekNumber: {
                entitlementId: entitlement.id,
                weekNumber,
              },
            },
          });

          if (!existingCompletion) {
            // Record week completion
            await prisma.weekCompletion.create({
              data: {
                entitlementId: entitlement.id,
                weekNumber,
              },
            });

            weekCompleted = true;

            logger.info({
              operation: "progress.week_completed",
              userId: user.id,
              programId,
              weekNumber,
            });

            // Get program details including pacing mode
            const program = await prisma.program.findUnique({
              where: { id: programId },
              select: { durationWeeks: true, pacingMode: true },
            });

            // Only unlock next week for UNLOCK_ON_COMPLETE mode
            // For DRIP_BY_WEEK mode, unlocking is handled by time-based calculation in learner UI
            if (program && program.pacingMode === "UNLOCK_ON_COMPLETE" && weekNumber < program.durationWeeks) {
              const nextWeek = weekNumber + 1;

              // Only unlock if this was the current week
              if (entitlement.currentWeek === weekNumber) {
                await prisma.entitlement.update({
                  where: { id: entitlement.id },
                  data: { currentWeek: nextWeek },
                });

                nextWeekUnlocked = true;
                newCurrentWeek = nextWeek;

                logger.info({
                  operation: "progress.week_unlocked",
                  userId: user.id,
                  programId,
                  pacingMode: program.pacingMode,
                  newWeek: nextWeek,
                });
              }
            }
          }
        }
      }
    }
  }

  return NextResponse.json({
    ...progress,
    weekCompleted,
    nextWeekUnlocked,
    newCurrentWeek,
  });
}
