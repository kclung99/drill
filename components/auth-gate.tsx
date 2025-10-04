'use client';

import { useState, useEffect } from 'react';

interface AuthGateProps {
  children: React.ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if we already have a valid token
    const token = localStorage.getItem('auth_token');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ passphrase }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError('incorrect');
        setPassphrase('');
        return;
      }

      // Store token and mark as authenticated
      localStorage.setItem('auth_token', data.token);
      setIsAuthenticated(true);
    } catch (err) {
      setError('failed');
      setPassphrase('');
    }
  };

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <form onSubmit={handleSubmit} className="text-center space-y-2">
        <input
          type="password"
          placeholder="passphrase"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          className="px-3 py-1 text-sm border text-black border-gray-400 focus:outline-none focus:border-black"
          autoFocus
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
      </form>
    </div>
  );
}
