import Link from "next/link";

function RoleCard({
  title,
  subtitle,
  href,
}: {
  title: string;
  subtitle: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div className="flex items-start justify-between gap-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            {title}
          </h2>
          <p className="mt-2 text-base leading-7 text-zinc-600 dark:text-zinc-400">
            {subtitle}
          </p>
        </div>
        <div className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-700 transition group-hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-200 dark:group-hover:bg-zinc-800">
          →
        </div>
      </div>
    </Link>
  );
}

export default function HomePage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-black">
      <div className="w-full max-w-4xl">
        <header className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl">
            Hanna Shit
          </h1>
          <p className="mt-3 text-base leading-7 text-zinc-600 dark:text-zinc-400">
            Book a student appointment online, or manage appointments as an administrator.
          </p>
        </header>

        <main className="mt-10 grid gap-5 sm:grid-cols-2">
          <RoleCard
            title="Student with wala ligo (hanna)"
            subtitle="Book an appointment"
            href="/student"
          />
          <RoleCard
            title="Admin"
            subtitle="Like me po"
            href="/admin/login"
          />
        </main>

        <footer className="mt-10 text-center text-sm text-zinc-500 dark:text-zinc-500">
          Students don’t need an account — just your full name ,student ID and GCASH
        </footer>
      </div>
    </div>
  );
}
