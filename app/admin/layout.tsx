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
              {isSuperAdmin ? (
                <>
                  <Link
                    href="/admin/service-types"
                    className="text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50"
                  >
                    Service types
                  </Link>
                  <Link
                    href="/admin/admins"
                    className="text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50"
                  >
                    Admins
                  </Link>
                  <Link
                    href="/admin/schools"
                    className="text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50"
                  >
                    Schools
                  </Link>
                </>
              ) : null}
            </nav>
          </div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            {isSuperAdmin ? "Super Admin" : "Admin"}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
