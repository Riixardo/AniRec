import { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import AnimeAtlasCard from './AnimeAtlasCard';

export default function AtlasMapPage() {
  const [atlasData, setAtlasData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [selectedAnimeData, setSelectedAnimeData] = useState(null);
  const [cardLoading, setCardLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  const containerRef = useRef(null);
  const selectedPointRef = useRef(null);

  const vizRef = useRef({
    xScale: null,
    yScale: null,
    radiusScale: null,
    colorScale: null,
    quadtree: null,
    currentTransform: d3.zoomIdentity,
  });

  useEffect(() => {
    fetchAtlasData();
  }, []);

  const fetchAtlasData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/atlas`);
      if (!response.ok) throw new Error('Failed to fetch atlas data');
      const data = await response.json();
      setAtlasData(data.atlas_data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (atlasData && containerRef.current) {
      createAtlasVisualization();
    }

    return () => {
      d3.select(containerRef.current).selectAll('*').remove();
    };
  }, [atlasData]);

  useEffect(() => {
    if (atlasData && containerRef.current) {
      drawPoints();
    }
  }, [selectedPoint]);

  // Handle clicking outside search results
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showSearchResults && !event.target.closest('.search-container')) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSearchResults]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setShowSearchResults(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const createAtlasVisualization = () => {
    const container = d3.select(containerRef.current);
    container.selectAll('*').remove();

    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    const width = 800 - margin.left - margin.right;
    const height = 600 - margin.top - margin.bottom;

    const svg = container
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .style('position', 'absolute')
      .style('top', 0)
      .style('left', 0)
      .style('pointer-events', 'none');

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const canvas = container
      .append('canvas')
      .attr('width', width)
      .attr('height', height)
      .style('margin-left', `${margin.left}px`)
      .style('margin-top', `${margin.top}px`);

    const context = canvas.node().getContext('2d');

    const xScale = d3.scaleLinear()
      .domain(d3.extent(atlasData, d => d.x_coord))
      .range([0, width]);
    const yScale = d3.scaleLinear()
      .domain(d3.extent(atlasData, d => d.y_coord))
      .range([height, 0]);
    vizRef.current.xScale = xScale;
    vizRef.current.yScale = yScale;

    const radiusScale = d3.scaleSqrt()
      .domain(d3.extent(atlasData, d => d.num_list_users))
      .range([1, 10]);
    vizRef.current.radiusScale = radiusScale;

    const colorScale = d3.scaleSequential(d3.interpolateRainbow)
      .domain(d3.extent(atlasData, d => d.num_list_users));
    vizRef.current.colorScale = colorScale;

    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);
    const gX = g.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${height})`)
      .call(xAxis);
    const gY = g.append("g")
      .attr("class", "y-axis")
      .call(yAxis);

    g.selectAll(".tick text").style("fill", "white");
    g.selectAll(".tick line").style("stroke", "rgba(255, 255, 255, 0.2)");
    g.selectAll(".domain").style("stroke", "rgba(255, 255, 255, 0.5)");

    const quadtree = d3.quadtree()
      .x(d => d.x_coord)
      .y(d => d.y_coord)
      .addAll(atlasData);
    vizRef.current.quadtree = quadtree;

    const draw = (transform) => {
        vizRef.current.currentTransform = transform;
        const newXScale = transform.rescaleX(xScale);
        const newYScale = transform.rescaleY(yScale);

        gX.call(xAxis.scale(newXScale));
        gY.call(yAxis.scale(newYScale));
        
        drawPoints(newXScale, newYScale);

    };

    draw(vizRef.current.currentTransform);

    const zoom = d3.zoom()
      .scaleExtent([0.5, 20])
      .on("zoom", (event) => {
        draw(event.transform);
      });
    
    // Attach zoom to the canvas, and disable double-click zoom
    canvas.call(zoom);
    canvas.on("dblclick.zoom", null);

    // Handle clicks using the quadtree
    canvas.on('click', (event) => {
      // ===== THE FIX IS HERE =====
      // Destructure ALL required D3 objects from the ref inside the handler
      const { currentTransform, quadtree, xScale, yScale } = vizRef.current;
      
      // A safety check in case the handler fires before the ref is populated
      if (!xScale || !yScale || !quadtree) return;

      const [mx, my] = d3.pointer(event);
      
      // Use the now-guaranteed-to-be-correct scales for inversion
      const newXScale = currentTransform.rescaleX(xScale);
      const newYScale = currentTransform.rescaleY(yScale);
      const dataX = newXScale.invert(mx);
      const dataY = newYScale.invert(my);
      
      const closestPoint = quadtree.find(dataX, dataY, 2 / currentTransform.k);
      
      if (closestPoint) {
        // Use ref to check current selected point
        if (selectedPointRef.current === closestPoint.anime_id) {
          // If clicking the same point, close the card
          selectedPointRef.current = null;
          setSelectedPoint(null);
          setSelectedAnimeData(null);
        } else {
          // If clicking a new point, fetch its data
          selectedPointRef.current = closestPoint.anime_id;
          setSelectedPoint(closestPoint.anime_id);
          fetchAnimeDetails(closestPoint.anime_id);
        }
      } else {
        selectedPointRef.current = null;
        setSelectedPoint(null);
        setSelectedAnimeData(null);
      }
    });
  };

  const fetchAnimeDetails = async (animeId) => {
    setCardLoading(true);
    setSelectedAnimeData(null);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/get/anime/${animeId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch anime details');
      }
      const data = await response.json();
      setSelectedAnimeData(data);
    } catch (err) {
      console.error(err);
      // Optionally set an error state to show in the UI
    } finally {
      setCardLoading(false);
    }
  };

  const drawPoints = (
    newXScale = vizRef.current.currentTransform.rescaleX(vizRef.current.xScale),
    newYScale = vizRef.current.currentTransform.rescaleY(vizRef.current.yScale)
  ) => {
    const canvas = d3.select(containerRef.current).select('canvas').node();
    if (!canvas || !vizRef.current.xScale) return;

    const context = canvas.getContext('2d');
    const { width, height } = canvas;

    context.clearRect(0, 0, width, height);
    context.save();

    const { radiusScale, colorScale } = vizRef.current;
    const currentSelectedPoint = selectedPointRef.current; // Use ref instead of state

    // Store selected point data for drawing later
    let selectedPointData = null;

    // Draw all normal points first
    atlasData.forEach(d => {
      const cx = newXScale(d.x_coord);
      const cy = newYScale(d.y_coord);

      if (cx >= 0 && cx <= width && cy >= 0 && cy <= height) {
        const radius = radiusScale(d.num_list_users);
        
        // Check if this is the selected point
        if (d.anime_id === currentSelectedPoint) {
          // Store data for drawing later
          selectedPointData = { d, cx, cy, radius };
        } else {
          // Draw normal point
          context.beginPath();
          context.arc(cx, cy, radius, 0, 2 * Math.PI);
          context.fillStyle = colorScale(d.num_list_users);
          context.fill();
        }
      }
    });

    // Draw the selected point last so it appears on top
    if (selectedPointData) {
      const { d, cx, cy, radius } = selectedPointData;
      
      // Draw selected point with light pink highlight
      context.beginPath();
      context.arc(cx, cy, radius, 0, 2 * Math.PI);
      context.fillStyle = '#ffb3d9'; // Light pink
      context.fill();
      
      // Add white border for selected point
      context.strokeStyle = 'white';
      context.lineWidth = 1.5;
      context.stroke();
      
      // Draw larger circle for selected point
      context.beginPath();
      context.arc(cx, cy, radius * 1.5, 0, 2 * Math.PI);
      context.strokeStyle = '#ffb3d9'; // Light pink
      context.lineWidth = 2;
      context.stroke();
    }

    context.restore();
  };

  // Search functionality
  const handleSearch = (query) => {
    setSearchQuery(query);
    
    if (!query.trim() || !atlasData) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const results = atlasData
      .filter(anime => 
        anime.title && 
        anime.title.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, 10); // Limit to 10 results
    
    setSearchResults(results);
    setShowSearchResults(results.length > 0);
  };

  const selectAnimeFromSearch = (anime) => {
    selectedPointRef.current = anime.anime_id;
    setSelectedPoint(anime.anime_id);
    setSearchQuery(anime.title);
    setShowSearchResults(false);
    fetchAnimeDetails(anime.anime_id);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
    selectedPointRef.current = null;
    setSelectedPoint(null);
    setSelectedAnimeData(null);
  };

  return (
    <div className="flex-1 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">Atlas Map</h1>
        
        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-4"></div>
            <p className="text-xl high-contrast-text">Loading atlas data...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="text-center py-12">
            <p className="text-red-400 bg-red-900/20 p-3 rounded-md mb-4">{error}</p>
            <button 
              onClick={fetchAtlasData}
              className="px-4 py-2 high-contrast-bg rounded hover:bg-gray-700 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Atlas Content */}
        {!loading && !error && atlasData && (
          <div className="high-contrast-bg p-6 rounded-lg">
            <div className="mb-4 text-center">
              <h2 className="text-xl font-semibold mb-2 high-contrast-text">Interactive Anime Atlas</h2>
              <p className="text-gray-300 text-sm mb-4">
                This graph represents what the AI model has learned about the relationships between different anime.
                <br />
                Anime positioned closer together are considered more similar by the model.
              </p>
              <p className="text-gray-400 text-sm mb-4">
                Each point represents an anime. Click to highlight, scroll to zoom, drag to pan.
              </p>
              
              {/* Search Bar */}
              <div className="relative max-w-md mx-auto mb-4 search-container">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search for anime by title..."
                  className="w-full p-3 rounded-md high-contrast-bg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-white focus:glow-border text-white text-sm"
                  onFocus={() => {
                    if (searchResults.length > 0) {
                      setShowSearchResults(true);
                    }
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    ✕
                  </button>
                )}
                
                {/* Search Results Dropdown */}
                {showSearchResults && searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-lg z-30 max-h-60 overflow-y-auto">
                    {searchResults.map((anime) => (
                      <button
                        key={anime.anime_id}
                        onClick={() => selectAnimeFromSearch(anime)}
                        className="w-full text-left p-3 hover:bg-gray-700 transition-colors border-b border-gray-600 last:border-b-0"
                      >
                        <div className="text-white text-sm font-medium">{anime.title}</div>
                        <div className="text-gray-400 text-xs">ID: {anime.anime_id}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <p className="text-gray-300 text-sm">
                Selected Anime ID: {selectedPoint}
              </p>
            </div>

            <div 
              ref={containerRef} 
              className="flex justify-center relative w-[80%] h-[80%] mx-auto"
            >
              {cardLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-20">
                  <p className="text-white">Loading details...</p>
                </div>
              )}
              <AnimeAtlasCard anime={selectedAnimeData} onClose={() => setSelectedAnimeData(null)} />
            </div>
            
            <div className="mt-4 text-center text-sm text-gray-400">
              <p>Total anime points: {atlasData?.length || 0}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}