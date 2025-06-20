from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import pickle

from predict import predict_scores

CSV_FILE_PATH = './data/anime_data.csv' 
MODEL_SAVE_PATH = './model_files/lightfm_anime_model.pkl'
DATASET_SAVE_PATH = './model_files/lightfm_anime_dataset.pkl'   

data_store = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load data on startup
    print(f"Loading anime data from {CSV_FILE_PATH}...")
    df = pd.read_csv(CSV_FILE_PATH)
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
    allow_origins=["http://localhost:3000"],  # Frontend URL
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
async def predict(request: PredictRequest):
    top_50_predictions, id_score_pairs = predict_scores(request.username, data_store["dataset"], data_store["model"], data_store["csv"])
    
    return {"recommendations": top_50_predictions, "id_score_pairs": id_score_pairs}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 