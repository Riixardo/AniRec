import Image from 'next/image';

export default function AnimeAtlasCard({ anime, onClose }) {
  if (!anime) return null;

  return (
    <div className="absolute top-4 left-4 w-64 bg-gray-900 bg-opacity-80 backdrop-blur-sm border border-gray-700 rounded-sm shadow-lg z-20">
      <div className="relative p-3 flex space-x-2">
        <button 
          onClick={onClose} 
          className="absolute top-1 right-1 text-gray-400 hover:text-white"
          aria-label="Close"
        >
          ✕
        </button>
        
        <Image
          src={anime.image_url}
          alt={anime.title}
          width={80}
          height={128}
          className="w-20 h-32 object-cover rounded-t-sm mb-1"
          onError={(e) => {
            e.target.src = 'https://via.placeholder.com/256x128/111111/FFFFFF?text=No+Image';
          }}
        />
        <div className="flex flex-col">
          <h3 className="font-bold text-md text-white mb-2" title={anime.title}>
            {anime.title}
          </h3>
          <div className="text-xs text-gray-300 space-y-1">
            <p>
              <span className="font-semibold">Rating:</span> {anime.mean ? anime.mean.toFixed(2) : 'N/A'}
            </p>
            <p>
              <span className="font-semibold">Users:</span> {anime.num_list_users ? anime.num_list_users.toLocaleString() : 'N/A'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 