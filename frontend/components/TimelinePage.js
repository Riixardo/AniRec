import { useState, useMemo } from 'react';
import AnimeTimelineCard from './AnimeTimelineCard';

export default function TimelinePage({ username, userAnimeDetails }) {
  const [selectedSeason, setSelectedSeason] = useState(null);

  // Group anime by season and year
  const timelineData = useMemo(() => {
    if (!userAnimeDetails || userAnimeDetails.length === 0) return [];

    const seasonGroups = {};
    
    userAnimeDetails.forEach(anime => {
      const year = anime.start_year;
      const season = anime.start_season;
      
      if (year && season) {
        const seasonKey = `${year}-${season}`;
        if (!seasonGroups[seasonKey]) {
          seasonGroups[seasonKey] = {
            year: parseInt(year),
            season: season,
            anime: []
          };
        }
        seasonGroups[seasonKey].anime.push(anime);
      }
    });

    // Sort by year (descending) and season
    const seasonOrder = { 'winter': 1, 'spring': 2, 'summer': 3, 'fall': 4 };
    return Object.values(seasonGroups)
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year; // Most recent first
        return seasonOrder[a.season] - seasonOrder[b.season];
      });
  }, [userAnimeDetails]);

  const getSeasonDisplayName = (season) => {
    const seasonNames = {
      'winter': 'Winter',
      'spring': 'Spring', 
      'summer': 'Summer',
      'fall': 'Fall'
    };
    return seasonNames[season] || season;
  };

  const getSeasonColor = (season) => {
    const colors = {
      'winter': 'bg-blue-500',
      'spring': 'bg-green-500',
      'summer': 'bg-yellow-500', 
      'fall': 'bg-orange-500'
    };
    return colors[season] || 'bg-gray-500';
  };

  if (!userAnimeDetails || userAnimeDetails.length === 0) {
    return (
      <div className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold mb-8 text-center">Timeline</h1>
          <div className="text-center text-gray-400">
            <p>No timeline data available. Get recommendations first.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">Anime Timeline for {username}</h1>
        
        <div className="relative">
          {/* Central Timeline Line */}
          <div className="absolute left-1/2 transform -translate-x-1/2 w-1 bg-gray-600 h-full z-0"></div>
          
          {/* Timeline Items */}
          <div className="space-y-8 relative z-10">
            {timelineData.map((seasonData, index) => (
              <div key={`${seasonData.year}-${seasonData.season}`} className="relative">
                {/* Season Node */}
                <div className="flex items-center justify-center mb-4">
                  <div className="relative">
                    <div className={`w-6 h-6 rounded-full ${getSeasonColor(seasonData.season)} border-4 border-gray-800 cursor-pointer hover:scale-110 transition-transform z-20 relative`}
                         onClick={() => setSelectedSeason(selectedSeason === `${seasonData.year}-${seasonData.season}` ? null : `${seasonData.year}-${seasonData.season}`)}>
                    </div>
                    {/* Connecting line to center */}
                    <div className="absolute top-3 left-1/2 transform -translate-x-1/2 w-1 bg-gray-600 h-8 z-0"></div>
                  </div>
                </div>

                {/* Season Label */}
                <div className="text-center mb-4">
                  <h2 className="text-xl font-bold text-white">
                    {getSeasonDisplayName(seasonData.season)} {seasonData.year}
                  </h2>
                  <p className="text-gray-400 text-sm">
                    {seasonData.anime.length} anime
                  </p>
                </div>

                {/* Anime Cards */}
                {selectedSeason === `${seasonData.year}-${seasonData.season}` && (
                  <div className="max-w-2xl mx-auto">
                    <div className="space-y-4">
                      {seasonData.anime.map((anime) => (
                        <AnimeTimelineCard key={anime.id} anime={anime} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 