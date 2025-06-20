import pandas as pd
from dotenv import load_dotenv
import os
import pickle
import requests
import numpy as np
from scipy.sparse import csr_matrix

load_dotenv()  

def predict_scores(username, dataset, model, df):
    # --- Fetch Data for a New Unseen User ---
    user_id_map, user_feature_map, item_id_map, item_feature_map = dataset.mapping()
    internal_to_original_anime_id = {v: k for k, v in item_id_map.items()}

    CLIENT_ID = os.getenv("MAL_CLIENT_ID")
    headers = {
                "X-MAL-CLIENT-ID": CLIENT_ID
            }

    url = f"https://api.myanimelist.net/v2/users/{username}/animelist?nsfw=true&limit=1000&fields=list_status,genres"

    new_user_data = []

    while url and url != "":
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            data = response.json()
            list_objects = data.get("data", [])
            print(f"Fetched {len(list_objects)} anime entries for user '{username}' from {url}")
            for entry in list_objects:
                user_should_count = True
                anime = entry["node"]
                new_user_data.append({
                    "username": username,
                    "anime_id": anime["id"],
                    "title": anime["title"],
                    "status": entry["list_status"]["status"],
                    "score": entry["list_status"]["score"],
                    "genres": anime.get("genres", [])
                })
            url = data["paging"].get("next", "")
        else:
            print(f"Error {response.status_code}: {response.text}")
            if response.status_code == 403 or response.status_code == 404:
                break

    new_user_genre_preferences = {}
    genre_counts = {}
    total_anime_in_list = len(new_user_data)

    demographics = set(["Shounen", "Shoujo", "Seinen", "Josei", "Kodomo", "Award Winning", "Kids"])

    for anime_entry in new_user_data:
        genres_for_this_anime = set() 
        for genre_obj in anime_entry.get("genres", []): 
            genre_name = genre_obj.get("name")
            if genre_name and genre_name not in demographics:
                genres_for_this_anime.add(genre_name)
        
        for genre_name in genres_for_this_anime:
            genre_counts[genre_name] = genre_counts.get(genre_name, 0) + 1

    if total_anime_in_list > 0:
        for genre_name, count in genre_counts.items():
            new_user_genre_preferences[genre_name] = count / total_anime_in_list
    else:
        print("User's anime list is empty, cannot calculate genre preferences.")

    print(f"\nNew user '{username}' genre preferences:")
    sorted_genres = sorted(new_user_genre_preferences.items(), key=lambda x: x[1], reverse=True)
    for genre, weight in sorted_genres:
        print(f"{genre}: {weight:.4f}")

    new_user_feature_indices = []
    new_user_feature_data = []

    for genre, weight in new_user_genre_preferences.items():
        if genre in user_feature_map: 
            feature_internal_id = user_feature_map[genre]
            new_user_feature_indices.append(feature_internal_id)
            new_user_feature_data.append(weight)
        else:
            print(f"Warning: Genre '{genre}' not found in user features.")
            exit(1)

    num_total_user_features = dataset.user_features_shape()[1]
    new_user_features_sparse = csr_matrix(
        (new_user_feature_data, ([0] * len(new_user_feature_data), new_user_feature_indices)),
        shape=(1, num_total_user_features)
    )
    print("New user feature matrix shape:", new_user_features_sparse.shape)

    new_user_interactions_rows = []
    new_user_interactions_cols = []
    new_user_interactions_data = []

    # Basically all heuristic
    for entry in new_user_data:
        orig_anime_id = str(entry["anime_id"])
        if orig_anime_id not in item_id_map:
            print(f"Warning: Anime ID {entry['anime_id']} not found in item_id_map. Skipping this entry.")
            continue
        item_int_id = item_id_map[orig_anime_id]
        status = entry["status"]
        row_weight = 1.0
        score = float(entry['score'])
        if status == 'Completed' or status == 'Watching':
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
        elif status == 'Plan to Watch':
            row_weight = 0.7
        elif status == 'Dropped':
            row_weight = 0.0
        elif status == 'On-Hold':
            row_weight = 0.2
        new_user_interactions_rows.append(0)           
        new_user_interactions_cols.append(item_int_id)
        new_user_interactions_data.append(row_weight)

    # Create a 1×num_items CSR for the new user
    num_items_in_dataset = dataset.interactions_shape()[1]
    new_user_interactions = csr_matrix(
        (new_user_interactions_data,
        (new_user_interactions_rows, new_user_interactions_cols)),
        shape=(1, num_items_in_dataset)
    )

    print("New user interaction matrix shape:", new_user_interactions.shape)
    print("Number of positive interactions for partial_fit:", new_user_interactions.nnz)

    model.fit_partial(
        interactions=new_user_interactions,
        user_features=new_user_features_sparse,
        item_features=None,    
        epochs=10               
    )

    print(f"\n--- Recommendations for new user: {username}:")

    num_items_in_dataset = dataset.interactions_shape()[1]
    all_item_internal_ids = np.arange(num_items_in_dataset)
    scores = model.predict(user_ids=0,
                            item_ids=all_item_internal_ids,
                            user_features=new_user_features_sparse,
                            item_features=None)

    if scores.size > 0:
        top_n = 50
        min_s = np.min(scores)
        max_s = np.max(scores)
        
        normalized_model_scores = [(s - min_s) / (max_s - min_s) for s in scores]
        item_scores_pairs = list(zip(all_item_internal_ids, normalized_model_scores))
        seen_item_internal_ids = set()
        for entry in new_user_data:
            original_id = str(entry.get("anime_id"))
            if original_id in item_id_map:
                seen_item_internal_ids.add(item_id_map[original_id])
        
        unseen_item_scores_pairs = [(int(item_id), float(score)) for item_id, score in item_scores_pairs if item_id not in seen_item_internal_ids]

        top_items_scores = sorted(unseen_item_scores_pairs, key=lambda x: x[1], reverse=True)
        titles_map = df.drop_duplicates(subset=['anime_id']).set_index('anime_id')['title'].to_dict()
        # Convert all keys to strings to ensure consistent lookup
        titles_map = {str(k): v for k, v in titles_map.items()}

        print(f"Titles map sample: {dict(list(titles_map.items())[:5])}")

        recommendations = []

        print(f"\nTop {top_n} Recommended Anime for the New User:")
        for i, (item_internal_id, score) in enumerate(top_items_scores[:top_n]):
            original_anime_id = internal_to_original_anime_id.get(item_internal_id)
            # Convert to string for consistent lookup
            original_anime_id_str = str(original_anime_id)
            title = titles_map.get(original_anime_id_str, f"Unknown Anime (ID: {original_anime_id})")
            print(f"{i+1}. {title} (Original ID: {original_anime_id}) - Predicted Score: {score:.4f}")
            recommendations.append({
                "title": title,
                "score": score
            })
        
        # Have frontend remember the model scores for pagination
        return recommendations, top_items_scores

        # --- Find and Display Rank for a Specific Anime ID ---
        # TARGET_ANIME_ORIGINAL_ID = '37999'

        # target_internal_id = item_id_map[TARGET_ANIME_ORIGINAL_ID]
        # target_score = 0.0 # default
        # for internal_id, norm_score in item_scores_pairs:
        #     if internal_id == target_internal_id:
        #         target_score = norm_score
        #         break
                
        # target_rank = -1
        # for rank, (item_internal_id, _) in enumerate(top_items_scores):
        #     if item_internal_id == target_internal_id:
        #         target_rank = rank + 1 
        #         break
                
        # target_title = titles_map.get(str(TARGET_ANIME_ORIGINAL_ID), f"Unknown Anime (ID: {TARGET_ANIME_ORIGINAL_ID})")
        # print(f"\n--- Ranking for Specific Anime ---")
        # print(f"Anime: {target_title} (Original ID: {TARGET_ANIME_ORIGINAL_ID}, Internal ID: {target_internal_id})")
        # print(f"Normalized Predicted Score: {target_score:.4f}")
        # print(f"Rank among all {len(top_items_scores)} items: {target_rank}")
    else:
        print("No recommendations could be generated for the new user.")
        return [], []
