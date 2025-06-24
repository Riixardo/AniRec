import { useState } from 'react';

export default function Filter({ 
  selectedGenres, 
  setSelectedGenres, 
  selectedMediaTypes, 
  setSelectedMediaTypes, 
  minUsers, 
  setMinUsers, 
  maxUsers, 
  setMaxUsers, 
  onApplyFilters 
}) {
  const [showGenreModal, setShowGenreModal] = useState(false);
  const [tempSelectedGenres, setTempSelectedGenres] = useState([]);

  // Complete list of genres
  const allGenres = [
    'Action', 'Adult Cast', 'Adventure', 'Anthropomorphic', 'Avant Garde', 'Award Winning',
    'Boys Love', 'CGDCT', 'Childcare', 'Combat Sports', 'Comedy', 'Crossdressing',
    'Delinquents', 'Detective', 'Drama', 'Ecchi', 'Educational', 'Erotica', 'Fantasy',
    'Gag Humor', 'Girls Love', 'Gore', 'Gourmet', 'Harem', 'Hentai', 'High Stakes Game',
    'Historical', 'Horror', 'Idols (Female)', 'Idols (Male)', 'Isekai', 'Iyashikei',
    'Josei', 'Kids', 'Love Polygon', 'Love Status Quo', 'Magical Sex Shift',
    'Mahou Shoujo', 'Martial Arts', 'Mecha', 'Medical', 'Military', 'Music', 'Mystery',
    'Mythology', 'Organized Crime', 'Otaku Culture', 'Parody', 'Performing Arts',
    'Pets', 'Psychological', 'Racing', 'Reincarnation', 'Reverse Harem', 'Romance',
    'Samurai', 'School', 'Sci-Fi', 'Seinen', 'Shoujo', 'Shounen', 'Showbiz',
    'Slice of Life', 'Space', 'Sports', 'Strategy Game', 'Super Power', 'Supernatural',
    'Survival', 'Suspense', 'Team Sports', 'Time Travel', 'Urban Fantasy', 'Vampire',
    'Video Game', 'Villainess', 'Visual Arts', 'Workplace'
  ];

  const mediaTypes = ['tv', 'ova', 'movie', 'special', 'ona', 'music'];

  const handleGenreToggle = (genre) => {
    setTempSelectedGenres(prev => 
      prev.includes(genre) 
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
    );
  };

  const handleMediaTypeToggle = (mediaType) => {
    setSelectedMediaTypes(prev => 
      prev.includes(mediaType) 
        ? prev.filter(m => m !== mediaType)
        : [...prev, mediaType]
    );
  };

  const formatUserCount = (count) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(0)}K`;
    }
    return count.toString();
  };

  const openGenreModal = () => {
    setTempSelectedGenres([...selectedGenres]);
    setShowGenreModal(true);
  };

  const saveGenreFilters = () => {
    setSelectedGenres([...tempSelectedGenres]);
    setShowGenreModal(false);
  };

  const cancelGenreFilters = () => {
    setTempSelectedGenres([...selectedGenres]);
    setShowGenreModal(false);
  };

  const clearGenreFilters = () => {
    setSelectedGenres([]);
    setTempSelectedGenres([]);
  };

  const clearAllFilters = () => {
    setSelectedGenres([]);
    setTempSelectedGenres([]);
    setSelectedMediaTypes([]);
    setMinUsers(0);
    setMaxUsers(4200000);
  };

  const handleApplyFilters = () => {
    onApplyFilters();
  };

  return (
    <>
      {/* Sidebar */}
      <div className="w-full lg:w-80 high-contrast-bg p-4 sm:p-6 lg:min-h-0 lg:overflow-y-auto">
        <h2 className="text-xl font-bold mb-4 high-contrast-text">Filters</h2>
        
        {/* Genres Filter */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold high-contrast-text">Genres</h3>
            <button
              onClick={openGenreModal}
              className="text-sm text-gray-400 hover:text-white"
            >
              Edit
            </button>
          </div>
          
          {selectedGenres.length === 0 ? (
            <p className="text-gray-400 text-sm">No genres selected</p>
          ) : (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1">
                {selectedGenres.map((genre) => (
                  <span key={genre} className="bg-gray-600 text-white px-2 py-1 rounded text-xs font-medium">
                    {genre}
                  </span>
                ))}
              </div>
              <button
                onClick={clearGenreFilters}
                className="text-sm text-red-400 hover:text-red-300"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Media Type Filter */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold high-contrast-text">Media Type</h3>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {mediaTypes.map((mediaType) => (
              <label key={mediaType} className="flex items-center space-x-2 cursor-pointer p-2 hover:bg-gray-700 rounded">
                <input
                  type="checkbox"
                  checked={selectedMediaTypes.includes(mediaType)}
                  onChange={() => handleMediaTypeToggle(mediaType)}
                  className="rounded border-gray-600 bg-gray-700 text-gray-400 focus:ring-gray-500"
                />
                <span className="text-sm text-gray-300">{mediaType}</span>
              </label>
            ))}
          </div>
        </div>

        {/* User Count Filter */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold high-contrast-text">User Count</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-300 mb-2 block">Min Users: {formatUserCount(minUsers)}</label>
              <input
                type="range"
                min="0"
                max="4200000"
                step="100000"
                value={minUsers}
                onChange={(e) => setMinUsers(Number(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>
            
            <div>
              <label className="text-sm text-gray-300 mb-2 block">Max Users: {formatUserCount(maxUsers)}</label>
              <input
                type="range"
                min="0"
                max="4200000"
                step="100000"
                value={maxUsers}
                onChange={(e) => setMaxUsers(Number(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>
          </div>
          
          <div className="flex justify-between text-xs text-gray-400 mt-2 w-[95%]">
            <span>0</span>
            <span>1M</span>
            <span>2M</span>
            <span>3M</span>
            <span>4M</span>
          </div>
        </div>

        {/* Clear All Filters Button */}
        <div className="mb-6">
          <button
            onClick={clearAllFilters}
            className="w-full text-sm text-red-400 hover:text-red-300 bg-red-900/20 hover:bg-red-900/30 py-2 rounded transition-colors"
          >
            Clear All Filters
          </button>
        </div>
        <div className="mb-6">
          <button
            onClick={handleApplyFilters}
            className="w-full text-sm font-bold text-white bg-gray-700 hover:bg-gray-600 py-2 rounded transition-colors"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* Genre Filter Modal */}
      {showGenreModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="high-contrast-bg rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold high-contrast-text">Select Genres</h2>
              <button
                onClick={cancelGenreFilters}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto mb-4">
              <div className="grid grid-cols-2 gap-2">
                {allGenres.map((genre) => (
                  <label key={genre} className="flex items-center space-x-2 cursor-pointer p-2 hover:bg-gray-700 rounded">
                    <input
                      type="checkbox"
                      checked={tempSelectedGenres.includes(genre)}
                      onChange={() => handleGenreToggle(genre)}
                      className="rounded border-gray-600 bg-gray-700 text-gray-400 focus:ring-gray-500"
                    />
                    <span className="text-sm text-gray-300">{genre}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div className="flex justify-between items-center pt-4 border-t border-gray-700">
              <span className="text-sm text-gray-400">
                {tempSelectedGenres.length} genres selected
              </span>
              <div className="flex gap-2">
                <button
                  onClick={cancelGenreFilters}
                  className="px-4 py-2 text-gray-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={saveGenreFilters}
                  className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 