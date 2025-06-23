import { useState, useRef } from 'react';
import RecommendationsPage from '../components/RecommendationsPage';
import StatisticsPage from '../components/StatisticsPage';
import TimelinePage from '../components/TimelinePage';
import AtlasMapPage from '../components/AtlasMapPage';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState('recommendations');
  const [username, setUsername] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [totalFilteredCount, setTotalFilteredCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isFiltering, setIsFiltering] = useState(false);
  const [error, setError] = useState('');
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [selectedMediaTypes, setSelectedMediaTypes] = useState([]);
  const [minUsers, setMinUsers] = useState(0);
  const [maxUsers, setMaxUsers] = useState(4200000);
  const [userStats, setUserStats] = useState(null);
  const [userAnimeDetails, setUserAnimeDetails] = useState([]);
  const [loading, setLoading] = useState(false);

  // Ref for all recommendation IDs
  const itemScorePairsSortedRef = useRef([]);

  const tabs = [
    { id: 'recommendations', name: 'Recommendations' },
    { id: 'statistics', name: 'Statistics' },
    { id: 'timeline', name: 'Timeline' },
    { id: 'atlas', name: 'Atlas Map' }
  ];

  const handleGetRecommendations = async () => {
    setError('');
    setRecommendations(null);
    setUserStats(null);
    itemScorePairsSortedRef.current = [];
    setCurrentPage(1);

    // Clear all filters when getting new recommendations
    setSelectedGenres([]);
    setSelectedMediaTypes([]);
    setMinUsers(0);
    setMaxUsers(4200000);

    if (!username) {
      setError('Please enter a username.');
      return;
    }
    
    setIsFiltering(true);
    try {
      const response = await fetch('http://localhost:8000/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Something went wrong');
      }

      const data = await response.json();
      setRecommendations(data.recommendations);
      setUserStats(data.user_stats);
      setUserAnimeDetails(data.user_stats?.user_anime_details || []);
      itemScorePairsSortedRef.current = data.item_score_pairs_sorted;
      setTotalFilteredCount(data.item_score_pairs_sorted.length);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsFiltering(false);
    }
  };

  const handleApplyFilters = async () => {
    if (itemScorePairsSortedRef.current.length === 0) return;

    setIsFiltering(true);
    setCurrentPage(1);
    
    try {
      const response = await fetch('http://localhost:8000/predict/filtered', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_score_pairs_sorted: itemScorePairsSortedRef.current,
          selected_genres: selectedGenres,
          selected_media_types: selectedMediaTypes,
          min_users: minUsers,
          max_users: maxUsers,
          page: 1,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Something went wrong');
      }

      const data = await response.json();
      setRecommendations(data.recommendations);
      setTotalFilteredCount(data.total_count);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsFiltering(false);
    }
  };

  const handlePageChange = async (newPage) => {
    if (newPage < 1 || newPage > totalPages || itemScorePairsSortedRef.current.length === 0) return;
    
    setIsFiltering(true);
    setCurrentPage(newPage);
    
    try {
      const response = await fetch('http://localhost:8000/predict/filtered', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_score_pairs_sorted: itemScorePairsSortedRef.current,
          selected_genres: selectedGenres,
          selected_media_types: selectedMediaTypes,
          min_users: minUsers,
          max_users: maxUsers,
          page: newPage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Something went wrong');
      }

      const data = await response.json();
      setRecommendations(data.recommendations);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsFiltering(false);
    }
  };

  const totalPages = Math.ceil(totalFilteredCount / 20);

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'recommendations':
        return <RecommendationsPage 
          username={username} 
          setUsername={setUsername}
          recommendations={recommendations}
          totalFilteredCount={totalFilteredCount}
          currentPage={currentPage}
          isFiltering={isFiltering}
          error={error}
          selectedGenres={selectedGenres}
          setSelectedGenres={setSelectedGenres}
          selectedMediaTypes={selectedMediaTypes}
          setSelectedMediaTypes={setSelectedMediaTypes}
          minUsers={minUsers}
          setMinUsers={setMinUsers}
          maxUsers={maxUsers}
          setMaxUsers={setMaxUsers}
          onApplyFilters={handleApplyFilters}
          onPageChange={handlePageChange}
          totalPages={totalPages}
        />;
      case 'statistics':
        return <StatisticsPage username={username} userStats={userStats} userAnimeDetails={userAnimeDetails} />;
      case 'timeline':
        return <TimelinePage username={username} recommendations={recommendations} userStats={userStats} />;
      case 'atlas':
        return <AtlasMapPage username={username} recommendations={recommendations} userStats={userStats} />;
      default:
        return <RecommendationsPage 
          username={username} 
          setUsername={setUsername}
          recommendations={recommendations}
          totalFilteredCount={totalFilteredCount}
          currentPage={currentPage}
          isFiltering={isFiltering}
          error={error}
          selectedGenres={selectedGenres}
          setSelectedGenres={setSelectedGenres}
          selectedMediaTypes={selectedMediaTypes}
          setSelectedMediaTypes={setSelectedMediaTypes}
          minUsers={minUsers}
          setMinUsers={setMinUsers}
          maxUsers={maxUsers}
          setMaxUsers={setMaxUsers}
          onApplyFilters={handleApplyFilters}
          onPageChange={handlePageChange}
          totalPages={totalPages}
        />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-6xl mx-auto px-8 py-6">
          <h1 className="text-4xl font-bold text-center">Anime Recommender</h1>
        </div>
      </div>

      {/* Navigation Tabs with Username Input */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-6xl mx-auto px-8">
          <div className="flex items-center justify-between">
            {/* Tabs */}
            <div className="flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-gray-300 hover:text-white hover:border-gray-300'
                  }`}
                >
                  {tab.name}
                </button>
              ))}
            </div>

            {/* Username Input */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter MyAnimeList username"
                className="p-2 rounded-md bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white text-sm"
              />
              <button
                onClick={handleGetRecommendations}
                className="p-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors text-sm"
              >
                Get Recommendations
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Page Content */}
      {renderActiveTab()}
    </div>
  );
} 