import Link from "next/link";
import { TitleBar } from "@/components/TitleBar";
import Image from "next/image";

export default function HomePage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-black">
      <div className="w-full max-w-4xl">
        <header className="text-center">
          <Image
            src="/smartqueue.png"
            alt="Logo"
            width={400}
            height={400}
            className="mx-auto"
          />
          <h1 className="text-4xl tracking-tight font-bold text-blue-950 dark:text-blue-50 sm:text-3xl">
            SMARTQUEUE
          </h1>
          <p className="mt-3 text-base leading-7 text-blue-400 dark:text-blue-50">
            DIGITAL QUEUE MANAGEMENT SYSTEM
          </p>

          <p>
            A smart and convenient queue management system that allows students to get a queue number, monitor their turn in real-time and save time
          </p>
          <div>
            <h2 className="mt-10 text-2xl tracking-tight font-bold text-blue-950 dark:text-blue-50 sm:text-4xl">
              BENEFITS FOR STUDENTS
            </h2>
          <TitleBar
            title="Real-Time Queue Monitoring"
            subtitle="Check your queue status anytime, anywhere."
            logoSrc="/smartqueue.png"
          />
          <TitleBar
            title="Turn Notifications"
            subtitle="Get notified when your turn is approaching or it's your turn."
            logoSrc="/smartqueue.png"
          />
          <TitleBar
            title="Estimated Waiting Time"
            subtitle="Know the estimated waiting time before your turn."
            logoSrc="/smartqueue.png"
          />
          <TitleBar
            title="More convenience & Time Savings"
            subtitle="Spend your time productively while waiting."
            logoSrc="/smartqueue.png"
          />
                    </div>
        </header>

        <main className="mt-10 grid gap-5 sm:grid-cols-2">
          <button className="flex items-center justify-center rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold leading-7 text-white hover:bg-blue-500">
          <Link href="/student/">
            Im a student
          </Link>
          </button>
          <button className="flex items-center justify-center rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold leading-7 text-white hover:bg-blue-500">
           <Link href="/admin/login">
            Im an admin
          </Link>
          </button>
        </main>

        <footer className="mt-10 text-center text-sm text-zinc-500 dark:text-zinc-500">
          Students don’t need an account — just your full name ,student ID 
        </footer>
      </div>
    </div>
  );
}
