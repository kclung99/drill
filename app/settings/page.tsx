'use client';

import { useState, useEffect } from 'react';
import { NavBar } from '@/components/nav-bar';
import { fetchSettings, updateSettings, UserSettings } from '@/app/services/settingsService';

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const loaded = await fetchSettings();
    setSettings(loaded);
  };

  const handleSave = async () => {
    if (!settings) return;

    setIsSaving(true);
    setSaveMessage(null);

    try {
      await updateSettings(settings);
      setSaveMessage('Settings saved');
      setTimeout(() => setSaveMessage(null), 2000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveMessage('Error saving settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (!settings) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <NavBar currentPage="settings" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <NavBar currentPage="settings" />

      <main className="flex-1 p-8 flex flex-col items-center">
        <div className="w-full max-w-2xl space-y-8">
          <div>
            <h1 className="text-2xl font-normal mb-6">settings</h1>
          </div>

          {/* Heatmap Targets */}
          <div className="space-y-4">
            <h2 className="text-sm text-gray-500">heatmap targets</h2>

            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-600">music daily target</label>
              <input
                type="number"
                min="1"
                max="10"
                value={settings.musicDailyTarget}
                onChange={(e) => setSettings({ ...settings, musicDailyTarget: parseInt(e.target.value) || 1 })}
                className="w-20 px-3 py-2 text-sm border border-gray-400 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-600">drawing daily target</label>
              <input
                type="number"
                min="1"
                max="10"
                value={settings.drawingDailyTarget}
                onChange={(e) => setSettings({ ...settings, drawingDailyTarget: parseInt(e.target.value) || 1 })}
                className="w-20 px-3 py-2 text-sm border border-gray-400 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Session Validation */}
          <div className="space-y-4">
            <h2 className="text-sm text-gray-500">session validation (minimum thresholds)</h2>

            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-600">music session duration (minutes)</label>
              <input
                type="number"
                min="1"
                max="60"
                value={settings.minMusicDurationMinutes}
                onChange={(e) => setSettings({ ...settings, minMusicDurationMinutes: parseInt(e.target.value) || 1 })}
                className="w-20 px-3 py-2 text-sm border border-gray-400 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-600">drawing session refs (count)</label>
              <input
                type="number"
                min="1"
                max="100"
                value={settings.minDrawingRefs}
                onChange={(e) => setSettings({ ...settings, minDrawingRefs: parseInt(e.target.value) || 1 })}
                className="w-20 px-3 py-2 text-sm border border-gray-400 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-600">drawing session duration (seconds per ref)</label>
              <input
                type="number"
                min="10"
                max="600"
                value={settings.minDrawingDurationSeconds}
                onChange={(e) => setSettings({ ...settings, minDrawingDurationSeconds: parseInt(e.target.value) || 10 })}
                className="w-20 px-3 py-2 text-sm border border-gray-400 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Timezone */}
          <div className="space-y-4">
            <h2 className="text-sm text-gray-500">timezone</h2>

            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-600">UTC offset (hours)</label>
              <select
                value={settings.timezoneOffset}
                onChange={(e) => setSettings({ ...settings, timezoneOffset: parseInt(e.target.value) })}
                className="px-3 py-2 text-sm border border-gray-400 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Array.from({ length: 25 }, (_, i) => i - 12).map(offset => (
                  <option key={offset} value={offset}>
                    UTC{offset >= 0 ? '+' : ''}{offset} {offset === -6 && '(Chicago)'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 text-sm bg-black text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'saving...' : 'save'}
            </button>
            {saveMessage && (
              <span className={`text-sm ${saveMessage.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
                {saveMessage}
              </span>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
