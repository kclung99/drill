import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-4xl mx-auto text-center p-8">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">Drill</h1>
        <p className="text-xl text-gray-600 mb-12">
          Your all-in-one practice toolbox for music and art
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow">
            <div className="text-4xl mb-4">🎵</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Live Mode</h2>
            <p className="text-gray-600 mb-6">
              Connect your MIDI keyboard and see real-time chord detection as you play.
            </p>
            <Link
              href="/live"
              className="inline-block bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 font-semibold transition-colors"
            >
              Start Live Mode
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow">
            <div className="text-4xl mb-4">🎯</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Practice Mode</h2>
            <p className="text-gray-600 mb-6">
              Challenge yourself with target chords and track your response time.
            </p>
            <Link
              href="/practice"
              className="inline-block bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 font-semibold transition-colors"
            >
              Start Practice
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow">
            <div className="text-4xl mb-4">🎨</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Drawing Practice</h2>
            <p className="text-gray-600 mb-6">
              Practice figure drawing with AI-generated references and timed sessions.
            </p>
            <Link
              href="/drawing"
              className="inline-block bg-purple-500 text-white px-6 py-3 rounded-lg hover:bg-purple-600 font-semibold transition-colors"
            >
              Start Drawing
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-sm text-gray-600">
            <div>
              <div className="font-semibold text-gray-900 mb-2">🎹 MIDI & Keyboard</div>
              <p>Connect MIDI hardware or use computer keyboard input</p>
            </div>
            <div>
              <div className="font-semibold text-gray-900 mb-2">🔍 Chord Detection</div>
              <p>Powered by Tonal.js for accurate chord recognition</p>
            </div>
            <div>
              <div className="font-semibold text-gray-900 mb-2">⏱️ Timing Practice</div>
              <p>Measure and improve your chord recognition speed</p>
            </div>
            <div>
              <div className="font-semibold text-gray-900 mb-2">🤖 AI References</div>
              <p>Generated figure drawing references with smart pooling</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
