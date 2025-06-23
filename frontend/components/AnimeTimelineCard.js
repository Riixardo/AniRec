import { useState } from 'react';

export default function AnimeTimelineCard({ anime }) {
  const [expanded, setExpanded] = useState(false);

  const truncateSynopsis = (synopsis, maxLength = 150) => {
    if (!synopsis || synopsis.length <= maxLength) return synopsis;
    return synopsis.substring(0, maxLength) + '...';
  };

  const getStatusColor = (status) => {
    const colors = {
      'completed': 'bg-green-500',
      'watching': 'bg-blue-500',
      'plan_to_watch': 'bg-yellow-500',
      'on_hold': 'bg-orange-500',
      'dropped': 'bg-red-500'
    };
    return colors[status] || 'bg-gray-500';
  };

  const getStatusText = (status) => {
    const statusMap = {
      'completed': 'Completed',
      'watching': 'Watching',
      'plan_to_watch': 'Plan to Watch',
      'on_hold': 'On Hold',
      'dropped': 'Dropped'
    };
    return statusMap[status] || status;
  };

  return (
    <div className="high-contrast-bg rounded-sm p-4 mb-3 border border-gray-700 hover:border-gray-600 transition-colors">
      <div className="flex items-start space-x-4">
        {/* Anime Image */}
        <div className="flex-shrink-0">
          <img
            src={anime.image_url || '/placeholder-image.jpg'}
            alt={anime.title}
            className="w-16 h-24 object-cover rounded"
            onError={(e) => {
              e.target.src = '/placeholder-image.jpg';
            }}
          />
        </div>

        {/* Anime Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold high-contrast-text mb-1 truncate whitespace-nowrap overflow-hidden" title={anime.title}>
                {anime.title}
              </h3>
              
              <div className="flex items-center space-x-4 text-sm text-gray-400 mb-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(anime.status)}`}>
                  {getStatusText(anime.status)}
                </span>
                {anime.score > 0 && (
                  <span className="flex items-center">
                    <span className="text-yellow-400 mr-1">★</span>
                    {anime.score}/10
                  </span>
                )}
                {anime.media_type && (
                  <span className="capitalize">{anime.media_type}</span>
                )}
              </div>

              {/* Genres */}
              {anime.genres && anime.genres.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {anime.genres.map((genre, index) => {
                    // Handle both string and object genre formats
                    const genreName = typeof genre === 'string' ? genre : genre.name;
                    return (
                      <span
                        key={index}
                        className="px-2 py-1 bg-gray-700 text-xs rounded text-gray-300"
                      >
                        {genreName}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Synopsis */}
              {anime.synopsis && (
                <div className="text-sm text-gray-300">
                  {expanded ? (
                    <div>
                      {anime.synopsis}
                      <button
                        onClick={() => setExpanded(false)}
                        className="text-gray-400 hover:text-white ml-2 text-sm"
                      >
                        Show Less
                      </button>
                    </div>
                  ) : (
                    <div>
                      {truncateSynopsis(anime.synopsis)}
                      {anime.synopsis.length > 150 && (
                        <button
                          onClick={() => setExpanded(true)}
                          className="text-gray-400 hover:text-white ml-2 text-sm"
                        >
                          Show More
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 