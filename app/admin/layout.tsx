import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full bg-zinc-50 dark:bg-black">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="text-sm font-semibold text-zinc-900 dark:text-zinc-50"
            >
              Hanna Shit
            </Link>
            <nav className="flex items-center gap-4 text-sm font-semibold">
              <Link
                href="/admin/dashboard"
                className="text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50"
              >
                Dashboard
              </Link>
              <Link
                href="/admin/service-types"
                className="text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50"
              >
                Service types
              </Link>
            </nav>
          </div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">Admin</div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
