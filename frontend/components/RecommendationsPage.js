import { useState, useRef, useEffect } from 'react';
import AnimeCard from './AnimeCard';
import Filter from './Filter';

export default function RecommendationsPage({ 
  username, 
  setUsername,
  recommendations,
  totalFilteredCount,
  currentPage,
  isFiltering,
  isLoading,
  error,
  selectedGenres,
  setSelectedGenres,
  selectedMediaTypes,
  setSelectedMediaTypes,
  minUsers,
  setMinUsers,
  maxUsers,
  setMaxUsers,
  onApplyFilters,
  onPageChange,
  totalPages
}) {
  return (
    <div className="flex flex-col lg:flex-row">
      {/* Filter Component */}
      <Filter
        selectedGenres={selectedGenres}
        setSelectedGenres={setSelectedGenres}
        selectedMediaTypes={selectedMediaTypes}
        setSelectedMediaTypes={setSelectedMediaTypes}
        minUsers={minUsers}
        setMinUsers={setMinUsers}
        maxUsers={maxUsers}
        setMaxUsers={setMaxUsers}
        onApplyFilters={onApplyFilters}
      />

      {/* Main Content */}
      <div className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="w-full">
          {/* Error Message */}
          {error && (
            <div className="text-center mb-6">
              <p className="text-red-400 bg-red-900/20 p-3 rounded-md">{error}</p>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-4"></div>
              <p className="text-xl high-contrast-text">Loading recommendations...</p>
            </div>
          )}

          {/* Recommendations */}
          {recommendations && !isLoading && (
            <div className="relative">
              {isFiltering && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
                  <p className="text-xl high-contrast-text">Filtering...</p>
                </div>
              )}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold high-contrast-text">
                  Recommendations 
                </h2>
                <span className="text-gray-400">
                  {totalFilteredCount} results
                </span>
              </div>
              <div className="flex flex-col gap-6">
                {recommendations.map((anime, index) => (
                  <AnimeCard key={index} anime={anime} />
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="mt-8 flex justify-center items-center gap-4">
                  <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1 || isFiltering}
                    className="px-4 py-2 high-contrast-bg rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-gray-400">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || isFiltering}
                    className="px-4 py-2 high-contrast-bg rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}

          {/* No Recommendations State */}
          {!recommendations && !isLoading && !error && (
            <div className="text-center py-12">
              <h2 className="text-2xl font-semibold high-contrast-text mb-4">
                Get Started
              </h2>
              <p className="text-gray-400">
                Enter a MyAnimeList username above to get personalized recommendations.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 