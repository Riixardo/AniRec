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
  
  const containerRef = useRef(null);

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
      
      const closestPoint = quadtree.find(dataX, dataY, 10 / currentTransform.k);
      
      if (closestPoint) {
        if (selectedPoint === closestPoint.anime_id) {
          // If clicking the same point, close the card
          setSelectedPoint(null);
          setSelectedAnimeData(null);
        } else {
          // If clicking a new point, fetch its data
          setSelectedPoint(closestPoint.anime_id);
          fetchAnimeDetails(closestPoint.anime_id);
        }
      } else {
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

    atlasData.forEach(d => {
      const cx = newXScale(d.x_coord);
      const cy = newYScale(d.y_coord);

      if (cx >= 0 && cx <= width && cy >= 0 && cy <= height) {
        const radius = radiusScale(d.num_list_users);
        context.beginPath();
        context.arc(cx, cy, radius, 0, 2 * Math.PI);
        context.fillStyle = (d.anime_id === selectedPoint) ? '#ff6b6b' : colorScale(d.num_list_users);
        context.fill();
      }
    });

    if (selectedPoint) {
      const selectedData = atlasData.find(d => d.anime_id === selectedPoint);
      if (selectedData) {
        const cx = newXScale(selectedData.x_coord);
        const cy = newYScale(selectedData.y_coord);
        const radius = radiusScale(selectedData.num_list_users);
        context.beginPath();
        context.arc(cx, cy, radius * 1.5, 0, 2 * Math.PI);
        context.fillStyle = '#ff6b6b';
        context.strokeStyle = 'white';
        context.lineWidth = 1.5;
        context.fill();
        context.stroke();
      }
    }
    context.restore();
  };

  return (
    <div className="flex-1 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">Atlas Map</h1>
        
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
            <p className="text-gray-300 text-sm">
              Selected Anime ID: {selectedPoint}
            </p>
          </div>

          <div 
            ref={containerRef} 
            className="flex justify-center"
            style={{ position: 'relative', width: '800px', height: '600px', margin: '0 auto' }}
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
      </div>
    </div>
  );
}