import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { EnrollButton } from "./enroll-button";
import { getSkin, getSkinCSSVars } from "@/lib/skins";

export default async function SalesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const program = await prisma.program.findUnique({
    where: { slug },
    include: { creator: true, weeks: { include: { sessions: true }, orderBy: { weekNumber: "asc" } } },
  });

  if (!program || !program.published) notFound();

  const skin = getSkin(program.skinId);
  const skinCSSVars = getSkinCSSVars(skin);

  const priceDisplay =
    program.priceInCents === 0
      ? "Free"
      : `$${(program.priceInCents / 100).toFixed(2)}`;

  return (
    <div className="min-h-screen bg-white" data-skin={program.skinId} style={skinCSSVars as React.CSSProperties}>
      <main className="max-w-xl mx-auto px-6 py-12">
        <div className="space-y-6">
          <div>
            <p className="text-sm text-brand-600 font-medium mb-1">
              {program.durationWeeks}-week program
            </p>
            <h1 className="text-3xl font-bold tracking-tight">{program.title}</h1>
            {program.creator.name && (
              <p className="text-gray-500 mt-1">by {program.creator.name}</p>
            )}
          </div>

          {program.description && (
            <p className="text-gray-600 leading-relaxed">{program.description}</p>
          )}

          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <p className="text-sm font-medium text-gray-700">What you&apos;ll get:</p>
            {program.weeks.map((w) => (
              <div key={w.id} className="flex items-start gap-2 text-sm text-gray-500">
                <span className="text-brand-600 mt-0.5">•</span>
                <span>
                  Week {w.weekNumber}: {w.title} ({w.sessions.length} session
                  {w.sessions.length !== 1 ? "s" : ""})
                </span>
              </div>
            ))}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6 text-center space-y-4">
            <p className="text-3xl font-bold">{priceDisplay}</p>
            <EnrollButton
              programId={program.id}
              isFree={program.priceInCents === 0}
              priceDisplay={priceDisplay}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
