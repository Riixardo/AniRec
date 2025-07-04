import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';

const AnimeCard = ({ anime }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const synopsisRef = useRef(null);

  const {
    anime_id,
    title,
    score,
    num_list_users,
    mean,
    genres,
    synopsis,
    image_url,
    media_type
  } = anime;

  // Reset expansion state when synopsis changes
  useEffect(() => {
    setIsExpanded(false);
  }, [anime_id]);

  // Check if synopsis needs expansion (after render)
  useEffect(() => {
    if (synopsisRef.current) {
      const element = synopsisRef.current;
      // Check if the element is actually truncated (scrollHeight > clientHeight)
      setShowButton(element.scrollHeight > element.clientHeight);
    }
  }, []);

  const toggleExpansion = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="high-contrast-bg rounded-sm overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
      <div className="flex h-48 lg:h-auto overflow-y-auto">
        {/* Image Section */}
        <div className="w-1/5">
          {image_url ? (
            <Image 
              src={image_url} 
              alt={title}
              width={192}
              height={400}
              className="w-48 h-full object-cover"
              onError={(e) => {
                e.target.src = 'https://via.placeholder.com/300x400/111111/FFFFFF?text=No+Image';
              }}
            />
          ) : (
            <div className="w-full h-48 bg-gray-700 flex items-center justify-center">
              <span className="text-gray-400">No Image</span>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="w-4/5 p-4 flex flex-col">
          {/* Header */}
          <div className="mb-3 flex justify-between">
            <h3 className="text-xl font-bold high-contrast-text mb-1 line-clamp-2">
              {title}
            </h3>
            <a className="flex justify-center items-center text-gray-400 hover:text-white text-sm font-medium transition-colors text-white bg-[#2e51a2] px-2 py-1 rounded" href={`https://myanimelist.net/anime/${anime_id}`} target="_blank" rel="noopener noreferrer">Link to MAL Page</a>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-2 text-xs text-gray-300 mb-3">
            <span 
              className="bg-green-600 px-2 py-1 rounded font-medium relative group cursor-help"
              title="AI Score: How much the recommendation system thinks you'll like this anime based on your MyAnimeList profile"
            >
              AI Score: {score.toFixed(3)}
                <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10 border border-gray-600">
                  How much the AI thinks you&apos;ll like this anime. 0.9 and above is a confident score.
                  <span className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black"></span>
                </span>
            </span>
            <span className="bg-orange-600 px-2 py-1 rounded font-medium">{media_type || 'Unknown'}</span>
            <span className="bg-purple-700 px-2 py-1 rounded font-medium">Users: {num_list_users?.toLocaleString() || 'N/A'}</span>
            <span className="bg-blue-700 px-2 py-1 rounded font-medium">Rating: {mean ? mean.toFixed(2) : 'N/A'}</span>
          </div>

          {/* Genres */}
          {genres && (
            <div className="mb-3">
              <span className="text-sm font-medium text-gray-300">Genres:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {genres.split(',').map((genre, index) => (
                  <span 
                    key={index}
                    className="bg-gray-700 px-2 py-1 rounded text-xs text-gray-300"
                  >
                    {genre.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Synopsis */}
          {synopsis && (
            <div className="flex-1 relative">
              <span className="text-sm font-medium text-gray-300">Synopsis:</span>
              <div className="relative">
                <p 
                  ref={synopsisRef}
                  className={`text-sm text-gray-400 mt-1 ${
                    isExpanded ? '' : 'line-clamp-3'
                  } pr-25`}
                >
                  {synopsis}
                </p>
                
                {/* Show More/Less Button */}
                {showButton && (
                  <button
                    onClick={toggleExpansion}
                    className="absolute bottom-0 right-0 text-gray-400 hover:text-white text-sm font-medium transition-colors high-contrast-bg px-2 py-1 rounded"
                  >
                    {isExpanded ? 'Show Less' : 'Show More'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnimeCard; 