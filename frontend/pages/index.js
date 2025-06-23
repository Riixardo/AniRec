import { useState } from 'react';
import { useRouter } from 'next/router';

export default function Index() {
  const router = useRouter();
  const [username, setUsername] = useState('');

  const handleRedirect = () => {
    if (username.trim()) {
      sessionStorage.setItem('username', username.trim());
      sessionStorage.setItem('shouldFetchOnLoad', 'true');
      router.push('/home');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleRedirect();
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
      <div className="flex flex-col items-center justify-center text-center w-full">
        <h1 className="text-6xl font-bold mb-4">AniRec</h1>
        <p className="text-lg text-gray-400 mb-8">Get personalized anime recommendations.</p>
        <div className="flex w-full max-w-md focus-within:ring-2 focus-within:ring-white rounded-sm transition">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter your MyAnimeList username..."
            className="w-full p-3 rounded-l-sm high-contrast-bg border-y border-l border-gray-600 focus:outline-none text-white text-lg"
            autoFocus
          />
          <button
            onClick={handleRedirect}
            className="p-3 bg-gray-700 hover:bg-gray-600 rounded-r-sm transition-colors border-y border-r border-gray-600"
          >
            Go
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-4">Press Enter or click Go</p>
      </div>
      <p className="text-xs text-gray-500 text-center mt-12 mb-4 w-full">
        Anime information is as of June 2025.
      </p>
    </div>
  );
}
