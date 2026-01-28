import Link from "next/link";
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
    <div className="min-h-screen bg-gray-50">
      <nav className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          GuideRail
        </Link>
        <span className="text-sm text-gray-500">{user.name ?? user.email}</span>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Your Programs</h1>
          <form action="/api/programs/create" method="POST">
            <button
              type="submit"
              className="px-4 py-2 bg-brand-600 text-white text-sm rounded-lg font-medium hover:bg-brand-700 transition"
            >
              + New Program
            </button>
          </form>
        </div>

        {programs.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg">No programs yet</p>
            <p className="text-sm mt-1">Create your first guided program</p>
          </div>
        ) : (
          <div className="space-y-3">
            {programs.map((p) => (
              <Link
                key={p.id}
                href={`/programs/${p.id}/edit`}
                className="block bg-white rounded-xl border border-gray-100 p-4 hover:shadow-sm transition"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold">{p.title}</h2>
                    <p className="text-sm text-gray-400">
                      {p.durationWeeks} weeks · {p.published ? "Published" : "Draft"}
                    </p>
                  </div>
                  <span className="text-xs text-gray-300">→</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
