'use client';

import Link from 'next/link';
import { useAuth } from '@/app/contexts/AuthContext';

interface NavBarProps {
  currentPage: 'home' | 'live' | 'chord' | 'reference' | 'settings';
  showMidiStatus?: boolean;
  midiActive?: boolean;
}

export function NavBar({ currentPage, showMidiStatus = false, midiActive = false }: NavBarProps) {
  const { user, signIn, signOut } = useAuth();

  return (
    <nav className="p-8">
      <div className="flex justify-between items-center">
        <div className="flex-1 flex justify-start items-center gap-2">
          {showMidiStatus && (
            <>
              <div className={`w-2 h-2 rounded-full ${midiActive ? 'bg-green-500' : 'bg-yellow-500'}`} />
              <span className="text-sm text-gray-600">
                {midiActive ? 'midi' : 'keyboard'}
              </span>
            </>
          )}
        </div>
        <div className="flex justify-center gap-4">
          <Link
            href="/"
            className={`text-blue-600 font-medium ${currentPage === 'home' ? 'underline' : 'hover:underline'}`}
          >
            home
          </Link>
          <Link
            href="/live"
            className={`text-blue-600 font-medium ${currentPage === 'live' ? 'underline' : 'hover:underline'}`}
          >
            live
          </Link>
          <Link
            href="/practice"
            className={`text-blue-600 font-medium ${currentPage === 'chord' ? 'underline' : 'hover:underline'}`}
          >
            chord
          </Link>
          <Link
            href="/drawing"
            className={`text-blue-600 font-medium ${currentPage === 'reference' ? 'underline' : 'hover:underline'}`}
          >
            reference
          </Link>
          <Link
            href="/settings"
            className={`text-blue-600 font-medium ${currentPage === 'settings' ? 'underline' : 'hover:underline'}`}
          >
            settings
          </Link>
        </div>
        <div className="flex-1 flex justify-end items-center gap-2">
          {user ? (
            <>
              <span className="text-sm text-gray-500">{user.user_metadata?.full_name || user.email}</span>
              <span className="text-gray-400">/</span>
              <button
                onClick={signOut}
                className="text-sm text-gray-600 hover:underline"
              >
                sign out
              </button>
            </>
          ) : (
            <>
              <span className="text-sm text-gray-500">guest</span>
              <span className="text-gray-400">/</span>
              <button
                onClick={signIn}
                className="text-sm text-gray-600 hover:underline"
              >
                sign in
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
