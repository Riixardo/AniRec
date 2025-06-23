export default function StatisticsPage({ username, userStats }) {
  if (!userStats) {
    return (
      <div className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold mb-8 text-center">Statistics</h1>
          <div className="text-center text-gray-400">
            <p>Get recommendations for a user to see their statistics.</p>
          </div>
        </div>
      </div>
    );
  }

  const { 
    genre_preferences = {}, 
    score_distribution = {}, 
    status_distribution = {},
    total_anime = 0, 
    scored_anime = 0, 
    completed_anime = 0,
    average_score = 0,
    completion_rate = 0 
  } = userStats;

  // Sort genres by preference
  const sortedGenres = Object.entries(genre_preferences)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10); // Top 10 genres

  // Filter score distribution to only show scores with anime
  const filteredScoreDistribution = Object.entries(score_distribution)
    .filter(([, count]) => count > 0)
    .sort(([a], [b]) => parseInt(a) - parseInt(b));

  // Filter status distribution to only show statuses with anime
  const filteredStatusDistribution = Object.entries(status_distribution)
    .filter(([, count]) => count > 0)
    .sort(([,a], [,b]) => b - a); // Sort by count descending

  // Status color mapping
  const statusColors = {
    'completed': 'bg-green-500',
    'watching': 'bg-blue-500',
    'plan_to_watch': 'bg-yellow-500',
    'on_hold': 'bg-orange-500',
    'dropped': 'bg-red-500'
  };

  // Status display names
  const statusNames = {
    'completed': 'Completed',
    'watching': 'Watching',
    'plan_to_watch': 'Plan to Watch',
    'on_hold': 'On Hold',
    'dropped': 'Dropped'
  };

  return (
    <div className="flex-1 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">Statistics for {username}</h1>
        
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-300 mb-2">Total Anime</h3>
            <p className="text-3xl font-bold text-white">{total_anime}</p>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-300 mb-2">Completed</h3>
            <p className="text-3xl font-bold text-white">{completed_anime}</p>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-300 mb-2">Average Score</h3>
            <p className="text-3xl font-bold text-white">{average_score}</p>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-300 mb-2">Completion Rate</h3>
            <p className="text-3xl font-bold text-white mb-2">{completion_rate}%</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Genre Preferences */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-2xl font-bold mb-6">Top Genre Preferences</h2>
            <div className="space-y-4">
              {sortedGenres.map(([genre, preference]) => (
                <div key={genre} className="flex items-center justify-between">
                  <span className="text-gray-300">{genre}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${preference * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-400 w-12 text-right">
                      {(preference * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Status Distribution */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-2xl font-bold mb-6">Anime Status</h2>
            <div className="space-y-4">
              {filteredStatusDistribution.map(([status, count]) => {
                const percentage = total_anime > 0 ? (count / total_anime) * 100 : 0;
                return (
                  <div key={status} className="flex items-center justify-between">
                    <span className="text-gray-300 w-24">{statusNames[status]}</span>
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex-1 bg-gray-700 rounded-full h-2 min-w-0">
                        <div 
                          className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%`, minWidth: '2px' }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-400 w-12 text-right">
                        {count} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Score Distribution */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-2xl font-bold mb-6">Score Distribution</h2>
            <div className="space-y-4">
              {filteredScoreDistribution.map(([score, count]) => (
                <div key={score} className="flex items-center justify-between">
                  <span className="text-gray-300 w-8">Score {score}</span>
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex-1 bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ width: `${(count / scored_anime) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-400 w-12 text-right">
                      {count} ({((count / scored_anime) * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 