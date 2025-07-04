import pandas as pd
from fastapi import FastAPI, HTTPException, Request 
import traceback
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from contextlib import asynccontextmanager
from typing import List, Dict, Any
from pathlib import Path 
import uvicorn
import pickle

from predict import predict_scores, fetch_recs_from_filters, get_user_anime_status

BACKEND_DIR = Path(__file__).resolve().parent

CSV_FILE_PATH = BACKEND_DIR / "data" / "anime_data_with_images.csv"
MODEL_SAVE_PATH = BACKEND_DIR / "model_files" / "lightfm_anime_model.pkl"
DATASET_SAVE_PATH = BACKEND_DIR / "model_files" / "lightfm_anime_dataset.pkl"
ATLAS_DATA_PATH = BACKEND_DIR / "data" / "atlas_data.csv"

data_store = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load data on startup
    print(f"Loading anime data from {CSV_FILE_PATH}...")
    df = pd.read_csv(CSV_FILE_PATH, na_values=[], keep_default_na=False)
    data_store["csv"] = df
    print("Anime data loaded.")

    print(f"Loading pre-trained model from {MODEL_SAVE_PATH}...")
    with open(MODEL_SAVE_PATH, 'rb') as model_file:
        data_store["model"] = pickle.load(model_file)
    print("Model loaded.")

    print(f"Loading dataset object from {DATASET_SAVE_PATH}...")
    with open(DATASET_SAVE_PATH, 'rb') as dataset_file:
        data_store["dataset"] = pickle.load(dataset_file)
    print("Dataset object loaded.")

    print(f"Loading atlas data from {ATLAS_DATA_PATH}...")
    df_atlas = pd.read_csv(ATLAS_DATA_PATH, na_values=[], keep_default_na=False)
    data_store["atlas"] = df_atlas
    print("Atlas data loaded.")

    yield
    # Clean up resources on shutdown if needed
    data_store.clear()
    print("Data store cleared.")

app = FastAPI(
    title="AniRec API",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware to allow frontend to communicate with backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://3.138.171.23:3000",
        "https://anirec.ca",
        "https://www.anirec.ca",
        "http://anirec.ca",
        "http://www.anirec.ca",
    ], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Hello from AniRec API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

class PredictRequest(BaseModel):
    username: str

@app.post("/predict")
async def predict(request_data: PredictRequest):
    try:
        top_20_predictions, item_score_pairs_sorted, user_stats, user_anime_details = predict_scores(
            request_data.username, 
            data_store["dataset"], 
            data_store["model"], 
            data_store["csv"]
        )

        # Check if we got any user data back
        if len(user_anime_details) == 0:
            # This means the username was invalid or not found
            raise HTTPException(
                status_code=404, 
                detail=f"Username '{request_data.username}' not found on MyAnimeList. Please check the username and try again."
            )

        # Check if we have any recommendations
        if len(top_20_predictions) == 0:
            raise HTTPException(
                status_code=400, 
                detail=f"Unable to generate recommendations for user '{request_data.username}'"
            )
    
        return {
            "recommendations": top_20_predictions, 
            "item_score_pairs_sorted": item_score_pairs_sorted, 
            "user_stats": user_stats,
            "user_anime_details": user_anime_details
        }
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        # If anything crashes, this will catch it and show us the traceback
        print("\n---!!! ERROR PROCESSING REQUEST !!!---")
        traceback.print_exc()
        print("--------------------------------------")
        raise HTTPException(status_code=500, detail="Internal Server Error during prediction.")

class FilteredPredictRequest(BaseModel):
    item_score_pairs_sorted: List[List[float]]
    selected_genres: List[str] = []
    selected_media_types: List[str] = []
    min_users: int = 0
    max_users: int = 4200000
    page: int = 1

@app.post("/predict/filtered")
async def predict_filtered(request: FilteredPredictRequest):
    paginated_recs, total_filtered_count = fetch_recs_from_filters(
        item_score_pairs_sorted=request.item_score_pairs_sorted,
        df=data_store["csv"],
        dataset=data_store["dataset"],
        filters={
            "genres": request.selected_genres,
            "media_types": request.selected_media_types,
            "min_users": request.min_users,
            "max_users": request.max_users,
        },
        page=request.page,
        page_size=20
    )
    return {"recommendations": paginated_recs, "total_count": total_filtered_count}

@app.get("/atlas")
async def get_atlas_data(username: str | None = None):
    try:
        # Load the pre-generated atlas data and anime data
        atlas_df = data_store["atlas"]
        anime_df = data_store["csv"]

        # Ensure 'anime_id' is the same data type in both DataFrames before merging
        atlas_df['anime_id'] = atlas_df['anime_id'].astype(int)
        anime_df['anime_id'] = anime_df['anime_id'].astype(int)

        # Select only necessary columns and merge
        anime_info_df = anime_df[['anime_id', 'num_list_users', 'title']]
        merged_df = pd.merge(atlas_df, anime_info_df, on='anime_id')
        
        # Check if required columns exist
        required_columns = ['anime_id', 'x_coord', 'y_coord', 'num_list_users', 'title']
        if not all(col in merged_df.columns for col in required_columns):
            raise HTTPException(status_code=500, detail="Atlas data is missing required columns.")

        # Get user's anime status if username is provided
        user_anime_status = {}
        if username:
            try:
                user_anime_status = get_user_anime_status(username)
            except Exception as e:
                print(f"Error fetching user's anime status for {username}: {e}")
                # Continue without user data if there's an error

        # Add user status to each anime
        atlas_data = []
        for _, row in merged_df.iterrows():
            anime_record = row.to_dict()
            anime_id = anime_record['anime_id']
            anime_record['user_status'] = user_anime_status.get(anime_id, None)
            atlas_data.append(anime_record)
        
        return {"atlas_data": atlas_data}
    except FileNotFoundError as fnf_error:
        # Be more specific about which file is missing
        missing_file = str(fnf_error).split("'")[1]
        raise HTTPException(status_code=404, detail=f"Data file not found: {missing_file}. Please ensure it exists.")
    except Exception as e:
        # Log the error for debugging
        print(f"Error loading atlas data: {e}")
        raise HTTPException(status_code=500, detail="An error occurred while loading the atlas data.")

@app.get("/get/anime/{anime_id}")
async def get_anime_details(anime_id: int):
    try:
        anime_df = data_store["csv"]
        
        # Ensure 'anime_id' is the correct type for comparison
        anime_df['anime_id'] = anime_df['anime_id'].astype(int)
        
        anime_data = anime_df[anime_df['anime_id'] == anime_id]
        
        if anime_data.empty:
            raise HTTPException(status_code=404, detail="Anime not found")
            
        # Select specific details to return
        anime_details = anime_data.iloc[0]
        return {
            "title": anime_details.get('title', 'Unknown'),
            "image_url": anime_details.get('image_url', ''),
            "mean": float(anime_details.get('mean', 0.0)),
            "num_list_users": int(anime_details.get('num_list_users', 0))
        }
    except Exception as e:
        print(f"Error fetching anime details: {e}")
        raise HTTPException(status_code=500, detail="An error occurred while fetching anime details.")

@app.get("/hello")
def read_root():
    return {"message": "Hello from AniRec API"}

if __name__ == "__main__":
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=8000,
        proxy_headers=True,
        forwarded_allow_ips='127.0.0.1'
    )