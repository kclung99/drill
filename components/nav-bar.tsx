'use client';

import Link from 'next/link';
import { useAuth } from '@/app/contexts/AuthContext';

interface NavBarProps {
  currentPage: 'home' | 'live' | 'chord' | 'reference' | 'settings' | 'admin';
  showMidiStatus?: boolean;
  midiActive?: boolean;
}

export function NavBar({ currentPage, showMidiStatus = false, midiActive = false }: NavBarProps) {
  const { user, isAdmin, signIn, signOut } = useAuth();

  return (
    <nav className="p-8">
      <div className="flex justify-between items-center">
        <div className="flex-1 flex justify-start items-center gap-2">
          {showMidiStatus && (
            <>
              {/* <div className={`w-2 h-2 rounded-full ${midiActive ? 'bg-green-500' : 'bg-yellow-500'}`} /> */}
              <span className="text-sm text-gray-500">
                {midiActive ? 'midi' : 'keyboard'}
              </span>
            </>
          )}
        </div>
        <div className="flex justify-center gap-4 text-sm">
          <Link
            href="/"
            className={currentPage === 'home' ? 'text-black underline' : 'text-gray-500 hover:text-black'}
          >
            home
          </Link>
          <Link
            href="/live"
            className={currentPage === 'live' ? 'text-black underline' : 'text-gray-500 hover:text-black'}
          >
            live
          </Link>
          <Link
            href="/practice"
            className={currentPage === 'chord' ? 'text-black underline' : 'text-gray-500 hover:text-black'}
          >
            chord
          </Link>
          <Link
            href="/drawing"
            className={currentPage === 'reference' ? 'text-black underline' : 'text-gray-500 hover:text-black'}
          >
            reference
          </Link>
          <Link
            href="/settings"
            className={currentPage === 'settings' ? 'text-black underline' : 'text-gray-500 hover:text-black'}
          >
            settings
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              className={currentPage === 'admin' ? 'text-black underline' : 'text-gray-500 hover:text-black'}
            >
              admin
            </Link>
          )}
        </div>
        <div className="flex-1 flex justify-end items-center gap-2">
          {user ? (
            <>
              <span className="text-sm text-gray-500">{user.user_metadata?.full_name || user.email}</span>
              <span className="text-sm text-gray-500">/</span>
              <button
                onClick={signOut}
                className="text-sm text-gray-500 hover:text-black"
              >
                sign out
              </button>
            </>
          ) : (
            <>
              <span className="text-sm text-gray-500">guest</span>
              <span className="text-sm text-gray-500">/</span>
              <button
                onClick={signIn}
                className="text-sm text-gray-500 hover:text-black"
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
