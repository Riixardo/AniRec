import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [selectedMediaTypes, setSelectedMediaTypes] = useState([]);
  const [minUsers, setMinUsers] = useState(0);
  const [maxUsers, setMaxUsers] = useState(4200000);
  const [userStats, setUserStats] = useState(null);
  const [userAnimeDetails, setUserAnimeDetails] = useState([]);

  // Ref for all recommendation IDs
  const itemScorePairsSortedRef = useRef([]);

  const router = useRouter();

  const tabs = [
    { id: 'recommendations', name: 'Recommendations' },
    { id: 'statistics', name: 'Statistics' },
    { id: 'timeline', name: 'Timeline' },
    { id: 'atlas', name: 'Atlas Map' }
  ];

  // Generate SEO-friendly title and description based on active tab
  const getPageTitle = () => {
    const tabNames = {
      'recommendations': 'Anime Recommendations',
      'statistics': 'Anime Statistics & Insights',
      'timeline': 'Anime Watching Timeline',
      'atlas': 'Anime Atlas Map'
    };
    const tabName = tabNames[activeTab] || 'Anime Recommendations';
    return `${tabName} | AniRec - Personalized Anime Discovery`;
  };

  const getPageDescription = () => {
    const tabDescriptions = {
      'recommendations': 'Get personalized anime recommendations based on your MyAnimeList profile. Filter by genre, media type, and popularity to discover your next favorite anime series and movies.',
      'statistics': 'Explore detailed anime watching statistics and insights. Analyze your genre preferences, watching patterns, and anime history with comprehensive data visualization.',
      'timeline': 'View your anime watching timeline and history. Track when you started and completed different anime series with an interactive chronological view.',
      'atlas': 'Explore your anime journey on an interactive map. Visualize your anime watching patterns and preferences with our innovative atlas visualization tool.'
    };
    return tabDescriptions[activeTab] || 'Get personalized anime recommendations based on your MyAnimeList profile. Filter by genre, media type, and popularity to discover your next favorite anime series and movies.';
  };

  const handleGetRecommendations = async (userToFetch) => {
    const finalUsername = userToFetch || username;
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

    if (!finalUsername.trim()) {
      setError('Please enter a username.');
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: finalUsername }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Something went wrong');
      }

      const data = await response.json();
      setRecommendations(data.recommendations);
      setUserStats(data.user_stats);
      setUserAnimeDetails(data.user_anime_details || []);
      itemScorePairsSortedRef.current = data.item_score_pairs_sorted;
      setTotalFilteredCount(data.item_score_pairs_sorted.length);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyFilters = async () => {
    if (itemScorePairsSortedRef.current.length === 0) return;

    setIsFiltering(true);
    setCurrentPage(1);
    setIsLoading(true);
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/predict/filtered`, {
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
      setIsLoading(false);
    }
  };

  const handlePageChange = async (newPage) => {
    if (newPage < 1 || newPage > totalPages || itemScorePairsSortedRef.current.length === 0) return;
    
    setIsFiltering(true);
    setCurrentPage(newPage);
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/predict/filtered`, {
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

  useEffect(() => {
    const storedUsername = sessionStorage.getItem('username');
    if (storedUsername) {
      setUsername(storedUsername);
      const shouldFetch = sessionStorage.getItem('shouldFetchOnLoad') === 'true';
      if (shouldFetch) {
        sessionStorage.removeItem('shouldFetchOnLoad');
        handleGetRecommendations(storedUsername);
      }
    }
  }, []);

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
          isLoading={isLoading}
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
        return <StatisticsPage userStats={userStats} />;
      case 'timeline':
        return <TimelinePage userAnimeDetails={userAnimeDetails} />;
      case 'atlas':
        return <AtlasMapPage/>;
      default:
        return <RecommendationsPage 
          username={username} 
          setUsername={setUsername}
          recommendations={recommendations}
          totalFilteredCount={totalFilteredCount}
          currentPage={currentPage}
          isFiltering={isFiltering}
          isLoading={isLoading}
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
    <>
      <Head>
        <title>{getPageTitle()}</title>
        <meta name="description" content={getPageDescription()} />
        <meta name="keywords" content="anime recommendations, MyAnimeList, AI anime suggestions, machine learning, personalized anime, anime statistics, anime timeline, anime atlas" />
        <meta property="og:title" content={getPageTitle()} />
        <meta property="og:description" content={getPageDescription()} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://anirec.com/home" />
        <meta name="twitter:title" content={getPageTitle()} />
        <meta name="twitter:description" content={getPageDescription()} />
      </Head>
      <div className="w-full min-h-screen bg-black text-white overflow-x-auto">
      {/* Header */}
      <div className="w-full high-contrast-bg border-b border-gray-700">
        <div className="h-24 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-center items-center">
          <button onClick={() => {router.push('/')}} className="text-4xl font-bold text-center glow-text focus:outline-none hover:text-black">
            AniRec
          </button>
        </div>
      </div>

      {/* Navigation Tabs with Username Input */}
      <div className="high-contrast-bg border-b border-gray-700">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center flex-col sm:flex-row justify-between">
            {/* Tabs */}
            <div className="flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-white text-white glow-text'
                      : 'border-transparent text-gray-300 hover:text-white hover:border-gray-300'
                  }`}
                >
                  {tab.name}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 mb-2 mt-2 sm:mt-0 sm:mb-0">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter MyAnimeList username"
                className="p-2 rounded-md high-contrast-bg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-white focus:glow-border text-white text-sm"
              />
              <button
                onClick={() => handleGetRecommendations()}
                className="p-2 text-white bg-gray-700 rounded-md hover:bg-gray-600 transition-colors text-sm"
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
    </>
  );
} 