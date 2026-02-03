import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { getOrCreateUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const user = await getOrCreateUser();
  if (!user) redirect("/");

  const programs = await prisma.program.findMany({
    where: { creatorId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen gradient-bg-radial grid-bg">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-surface-border/50 backdrop-blur-sm">
        <Link href="/" className="text-xl font-bold tracking-tight neon-text-cyan text-neon-cyan">
          GuideRail
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">{user.name ?? user.email}</span>
          <UserButton />
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-white">Your Programs</h1>
          <form action="/api/programs/create" method="POST">
            <button
              type="submit"
              className="btn-neon px-5 py-2.5 rounded-xl text-surface-dark text-sm font-semibold"
            >
              + New Program
            </button>
          </form>
        </div>

        {programs.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-card border border-surface-border flex items-center justify-center">
              <span className="text-2xl">📚</span>
            </div>
            <p className="text-lg text-gray-300">No programs yet</p>
            <p className="text-sm text-gray-500 mt-1">Create your first guided program</p>
          </div>
        ) : (
          <div className="space-y-3">
            {programs.map((p) => (
              <Link
                key={p.id}
                href={`/programs/${p.id}/edit`}
                className="block bg-surface-card border border-surface-border rounded-xl p-5 hover:border-neon-cyan/40 transition-all hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-white">{p.title}</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      {p.durationWeeks} weeks ·
                      <span className={p.published ? "text-neon-cyan ml-1" : "text-gray-400 ml-1"}>
                        {p.published ? "Published" : "Draft"}
                      </span>
                    </p>
                  </div>
                  <span className="text-neon-cyan">→</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
