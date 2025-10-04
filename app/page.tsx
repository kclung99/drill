import Link from "next/link";
import HabitTracker from "./components/HabitTracker";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="p-8">
        <div className="flex justify-center gap-4">
          <Link href="/" className="text-blue-600 font-medium underline">
            home
          </Link>
          <Link href="/live" className="text-blue-600 hover:underline font-medium">
            live
          </Link>
          <Link href="/practice" className="text-blue-600 hover:underline font-medium">
            chord
          </Link>
          <Link href="/drawing" className="text-blue-600 hover:underline font-medium">
            reference
          </Link>
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center">
        <HabitTracker />
      </main>
    </div>
  );
}
