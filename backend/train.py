import pandas as pd
import pickle
from lightfm import LightFM
from lightfm.data import Dataset
from lightfm.evaluation import precision_at_k, recall_at_k, auc_score
from lightfm.cross_validation import random_train_test_split
import numpy as np
from scipy.sparse import csr_matrix

# --- 1. Configuration & Load Data ---
CSV_FILE_PATH = 'user_anime_data_v2_5282.csv'
USER_GENRE_FILE_PATH = 'user_genre_data_nsfw.txt' 
MIN_INTERACTIONS_PER_USER = 5    
MIN_INTERACTIONS_PER_ITEM = 3     
TEST_SET_FRACTION = 0.1           
N_COMPONENTS = 30 # Number of latent features to learn                 
LEARNING_RATE = 0.05
LOSS_FUNCTION = 'warp'           
N_EPOCHS = 10
N_THREADS = 1                     

print(f"Loading user anime data from {CSV_FILE_PATH}...")
try:
    df = pd.read_csv(CSV_FILE_PATH)
except FileNotFoundError:
    print(f"ERROR: File not found at {CSV_FILE_PATH}")
    exit(1)

print(f"Initial data shape: {df.shape}")
print(f"Uniue users: {df['username'].nunique()}, Unique anime: {df['anime_id'].nunique()}")
print(df.head())

print(f"Loading user anime genre data from {USER_GENRE_FILE_PATH}...")
all_genre_names = set()
parsed_user_features_input = []

with open(USER_GENRE_FILE_PATH, "r") as infile:
    user_genres = []
    for line in infile:
        parts = line.strip().split(",")
        username = parts[0]
        genres = []
        user_specific_genres = {}
        for unparsed_genres in parts[1:]:
            genre_data = unparsed_genres.strip().split("=")
            if len(genre_data) != 2:
                print(f"Skipping invalid genre data for user {username}: {genre_data}")
                exit(1)
            genre_name, genre_weight = tuple(genre_data)
            user_specific_genres[genre_name.strip()] = float(genre_weight)
            all_genre_names.add(genre_name.strip())
        parsed_user_features_input.append((username, user_specific_genres))

print(f"Loaded {len(parsed_user_features_input)} user genre entries from {USER_GENRE_FILE_PATH}.")

print(f"Found {len(all_genre_names)} unique genre names in feature file.")
for genre_name in sorted(all_genre_names):
    print(f" - {genre_name}")
print("\n")

# --- 2. Data Preprocessing ---
df['anime_id'] = df['anime_id'].astype(str)
df['username'] = df['username'].astype(str)

while True:
    user_counts = df['username'].value_counts()
    item_counts = df['anime_id'].value_counts()
    
    initial_rows = len(df)
    
    df = df[df['username'].isin(user_counts[user_counts >= MIN_INTERACTIONS_PER_USER].index)]
    if len(df) == 0:
        print("ERROR: No users left after filtering by MIN_INTERACTIONS_PER_USER. Try lowering the threshold.")
        exit()
        
    df = df[df['anime_id'].isin(item_counts[item_counts >= MIN_INTERACTIONS_PER_ITEM].index)]
    if len(df) == 0:
        print("ERROR: No items left after filtering by MIN_INTERACTIONS_PER_ITEM. Try lowering the threshold.")
        exit()

    if len(df) == initial_rows: 
        break
    else:
        print(f"Filtered data shape: {df.shape}")

if df.empty:
    print("ERROR: DataFrame is empty after filtering. Check your MIN_INTERACTIONS thresholds or data.")
    exit()

print(f"Final data shape after filtering: {df.shape}")
print(f"Number of unique users: {df['username'].nunique()}")
print(f"Number of unique anime: {df['anime_id'].nunique()}")

print("\nFiltering user features for users present in interaction data...")
active_users = set(df['username'].unique())
filtered_user_features_input = []
final_all_genre_names = set()

for username, features in parsed_user_features_input:
    if username in active_users:
        filtered_user_features_input.append((username, features))
        for genre_name in features.keys():
            final_all_genre_names.add(genre_name)

parsed_user_features_input = filtered_user_features_input
all_genre_names = final_all_genre_names # Update with genres from active users only

print(f"Number of users with features after filtering: {len(parsed_user_features_input)}")
print(f"Number of unique genres from active users: {len(all_genre_names)}")

# --- 3. Prepare Data for LightFM using Dataset ---
dataset = Dataset()

dataset.fit(users=df['username'].unique(),
            items=df['anime_id'].unique(),
            user_features=list(all_genre_names))

interactions_data = []
for index, row in df.iterrows():
    row_weight = 1.0
    score = float(row['score'])
    if row['status'] == 'Completed' or row['status'] == 'Watching':
        if score == 0:
            row_weight = 0.5
        elif score >= 8:
            row_weight = score / 10.0
        elif score == 7:
            row_weight = 0.6
        elif score == 6:
            row_weight = 0.4
        elif score == 5:
            row_weight = 0.2
        else:
            row_weight = 0.1
    elif row['status'] == 'Plan to Watch':
        row_weight = 0.7
    elif row['status'] == 'Dropped':
        row_weight = 0.0
    elif row['status'] == 'On-Hold':
        row_weight = 0.2
    interactions_data.append((row['username'], row['anime_id'], row_weight)) 

(interactions, weights) = dataset.build_interactions(interactions_data)

print("Interactions matrix shape:", interactions.shape)

user_features_matrix = dataset.build_user_features(parsed_user_features_input, normalize=False)
print("User features matrix shape:", user_features_matrix.shape)

# --- 4. Split into Training and Test Sets ---
(train_interactions, test_interactions) = random_train_test_split(
    interactions,
    test_percentage=TEST_SET_FRACTION,
    random_state=np.random.RandomState(42) # for reproducibility
)

(train_weights, test_weights) = random_train_test_split(
    weights,
    test_percentage=TEST_SET_FRACTION,
    random_state=np.random.RandomState(42)
)

print("Train interactions shape:", train_interactions.shape)
if test_interactions is not None:
    print("Test interactions shape:", test_interactions.shape)
else:
    print("No test set created due to insufficient data.")


# --- 5. Initialize and Train the LightFM Model ---
model = LightFM(no_components=N_COMPONENTS,
                learning_rate=LEARNING_RATE,
                loss=LOSS_FUNCTION,
                random_state=42) # for reproducibility

print("\nTraining LightFM model...")
model.fit(train_interactions,
          user_features=user_features_matrix,
          sample_weight=train_weights,
          epochs=N_EPOCHS,
          num_threads=N_THREADS,
          verbose=True)

MODEL_SAVE_PATH = 'lightfm_anime_model.pkl'
print(f"\nSaving trained model to {MODEL_SAVE_PATH}...")
with open(MODEL_SAVE_PATH, 'wb') as model_file:
    pickle.dump(model, model_file)
print("Model saved successfully.")

DATASET_SAVE_PATH = 'lightfm_anime_dataset.pkl'
print(f"\nSaving lightfm dataset model to {DATASET_SAVE_PATH}...")
with open(DATASET_SAVE_PATH, 'wb') as dataset_file:
    pickle.dump(dataset, dataset_file)
print("Dataset saved successfully.")

# --- 6. Evaluate the Model ---
# if test_interactions is not None and test_interactions.nnz > 0:
#     print("\nEvaluating model...")
#     K_EVAL = 10 # K for top-K recommendations
#     test_precision = precision_at_k(model, test_interactions, train_interactions=train_interactions, user_features=user_features_matrix, k=K_EVAL, num_threads=N_THREADS).mean()
#     test_recall = recall_at_k(model, test_interactions, train_interactions=train_interactions, user_features=user_features_matrix, k=K_EVAL, num_threads=N_THREADS).mean()
#     test_auc = auc_score(model, test_interactions, train_interactions=train_interactions, user_features=user_features_matrix, num_threads=N_THREADS).mean()

#     print(f"Test Precision at K={K_EVAL}: {test_precision:.4f}")
#     print(f"Test Recall at K={K_EVAL}:    {test_recall:.4f}")
#     print(f"Test AUC Score:              {test_auc:.4f}")
# else:
#     print("\nSkipping evaluation as test set is empty or too small.")

# --- 7. Get Recommendations for a New Unseen User ---
# user_id_map, user_feature_map, item_id_map, item_feature_map = dataset.mapping()
# internal_to_original_anime_id = {v: k for k, v in item_id_map.items()}
# new_user_genre_preferences = {'Romance': 0.7, 'Ecchi': 0.9}
# new_user_feature_indices = []
# new_user_feature_data = []

# for genre, weight in new_user_genre_preferences.items():
#     if genre in user_feature_map: 
#         feature_internal_id = user_feature_map[genre]
#         new_user_feature_indices.append(feature_internal_id)
#         new_user_feature_data.append(weight)
#     else:
#         print(f"Warning: Genre '{genre}' not found in user features.")
#         exit(1)

# print(f"\n--- Recommendations for new user:")

# num_total_user_features = dataset.user_features_shape()[1]
# new_user_features_sparse = csr_matrix(
#     (new_user_feature_data, ([0] * len(new_user_feature_data), new_user_feature_indices)),
#     shape=(1, num_total_user_features)
# )
# print("New user feature matrix shape:", new_user_features_sparse.shape)

# all_item_internal_ids = np.arange(interactions.shape[1])
# scores = model.predict(user_ids=0,
#                         item_ids=all_item_internal_ids,
#                         user_features=new_user_features_sparse,
#                         item_features=None)

# if scores.size > 0:
#     top_n = 50
#     item_scores_pairs = list(zip(all_item_internal_ids, scores))
#     top_items_scores = sorted(item_scores_pairs, key=lambda x: x[1], reverse=True)
#     anime_titles_map = df.drop_duplicates(subset=['anime_id']).set_index('anime_id')['anime_title'].to_dict()
#     print(f"\nTop {top_n} Recommended Anime for the New User:")
#     for i, (item_internal_id, score) in enumerate(top_items_scores[:top_n]):
#         original_anime_id = internal_to_original_anime_id.get(item_internal_id)
#         anime_title = anime_titles_map.get(original_anime_id, f"Unknown Anime (ID: {original_anime_id})")
#         print(f"{i+1}. {anime_title} (Original ID: {original_anime_id}) - Predicted Score: {score:.4f}")
# else:
#     print("No recommendations could be generated for the new user.")

# print("\nPreliminary model training and recommendation example complete.")