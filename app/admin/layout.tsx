import Link from "next/link";
import { getAdminFromRequestCookies } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getAdminFromRequestCookies();
  const isSuperAdmin = admin?.isSuperAdmin ?? false;

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-black">
      <header className="border-b border-blue-100 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex min-w-0 items-center gap-4">
            <Link
              href="/"
              className="shrink-0 text-sm font-bold tracking-tight text-blue-900 dark:text-blue-50"
            >
              SMARTQUEUE
            </Link>

            <nav className="hidden min-w-0 items-center gap-4 text-sm font-semibold md:flex">
              <Link
                href="/admin/dashboard"
                className="text-blue-700 hover:text-blue-900 dark:text-zinc-300 dark:hover:text-zinc-50"
              >
                Dashboard
              </Link>
              {isSuperAdmin ? (
                <>
                  <Link
                    href="/admin/service-types"
                    className="text-blue-700 hover:text-blue-900 dark:text-zinc-300 dark:hover:text-zinc-50"
                  >
                    Service types
                  </Link>
                  <Link
                    href="/admin/admins"
                    className="text-blue-700 hover:text-blue-900 dark:text-zinc-300 dark:hover:text-zinc-50"
                  >
                    Admins
                  </Link>
                  <Link
                    href="/admin/schools"
                    className="text-blue-700 hover:text-blue-900 dark:text-zinc-300 dark:hover:text-zinc-50"
                  >
                    Schools
                  </Link>
                </>
              ) : null}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800 dark:bg-zinc-900/40 dark:text-zinc-200">
              {isSuperAdmin ? "Super Admin" : "Admin"}
            </div>

            <details className="relative md:hidden">
              <summary className="list-none inline-flex h-10 items-center justify-center rounded-xl border border-blue-100 bg-white px-3 text-sm font-semibold text-blue-900 hover:bg-blue-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900">
                Menu
              </summary>
              <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-blue-100 bg-white p-2 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                <Link
                  href="/admin/dashboard"
                  className="block rounded-xl px-3 py-2 text-sm font-semibold text-blue-900 hover:bg-blue-50 dark:text-zinc-50 dark:hover:bg-zinc-900"
                >
                  Dashboard
                </Link>
                {isSuperAdmin ? (
                  <>
                    <Link
                      href="/admin/service-types"
                      className="block rounded-xl px-3 py-2 text-sm font-semibold text-blue-900 hover:bg-blue-50 dark:text-zinc-50 dark:hover:bg-zinc-900"
                    >
                      Service types
                    </Link>
                    <Link
                      href="/admin/admins"
                      className="block rounded-xl px-3 py-2 text-sm font-semibold text-blue-900 hover:bg-blue-50 dark:text-zinc-50 dark:hover:bg-zinc-900"
                    >
                      Admins
                    </Link>
                    <Link
                      href="/admin/schools"
                      className="block rounded-xl px-3 py-2 text-sm font-semibold text-blue-900 hover:bg-blue-50 dark:text-zinc-50 dark:hover:bg-zinc-900"
                    >
                      Schools
                    </Link>
                  </>
                ) : null}
              </div>
            </details>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl min-w-0 px-4 py-8">{children}</main>
    </div>
  );
}
