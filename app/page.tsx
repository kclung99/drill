'use client';

import HabitTracker from "./components/HabitTracker";
import { NavBar } from "@/components/nav-bar";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <NavBar currentPage="home" showMidiStatus={false} />

      <main className="flex-1 flex items-center justify-center">
        <HabitTracker />
      </main>
    </div>
  );
}
