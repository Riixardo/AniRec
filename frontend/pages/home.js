import { useState } from 'react';

export default function HomePage() {
  const [username, setUsername] = useState('');
  const [recommendations, setRecommendations] = useState(null);
  const [error, setError] = useState('');

  const handlePredict = async () => {
    if (!username) {
      setError('Please enter a username.');
      return;
    }

    try {
      const response = await fetch('http://localhost:8000/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Something went wrong');
      }

      const data = await response.json();
      setRecommendations(data.recommendations);

    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-gray-900 text-white">
      <h1 className="text-4xl font-bold">Anime Recommender</h1>
      <div className="flex gap-2">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter MyAnimeList username"
          className="p-2 rounded-md bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handlePredict}
          className="p-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
        >
          Get Recommendations
        </button>
      </div>
      {error && <p className="text-red-400">{error}</p>}
      {recommendations && (
        <div className="p-4 mt-4 bg-gray-800 rounded-lg">
          <h2 className="text-2xl font-semibold">Recommendations for {username}:</h2>
          <ul className="mt-2 list-disc list-inside">
            {recommendations.map((anime, index) => (
              <li key={index}>
                {anime.title} — Score: {anime.score}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
} 