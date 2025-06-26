import pandas as pd
from dotenv import load_dotenv
import os
import pickle
import requests
import numpy as np
from scipy.sparse import csr_matrix
import copy
from collections import Counter

# Anime ids that are in the model but not in the current dataset
BAD_ANIME_IDS = [51563, 52401, 52257, 51210]

load_dotenv()  

def fetch_recs_from_filters(item_score_pairs_sorted, df, dataset, filters, page, page_size):
    # Get mapping from internal model ID to original anime ID
    _, _, item_id_map, _ = dataset.mapping()
    internal_to_original_anime_id = {v: k for k, v in item_id_map.items()}

    # Create a lookup dictionary for all anime data by anime_id
    df['anime_id'] = df['anime_id'].astype(str)
    anime_data_lookup = df.set_index('anime_id').to_dict('index')

    filtered_recommendations = []

    for internal_id, score in item_score_pairs_sorted:
        original_anime_id = internal_to_original_anime_id.get(internal_id)
        if not original_anime_id:
            print(f"Original anime ID not found for internal ID: {internal_id}")
            continue

        anime_data = anime_data_lookup.get(str(original_anime_id))
        if not anime_data:
            print(f"Anime data not found for original anime ID: {original_anime_id}")
            continue

        # --- Apply filters ---
        # Genre filter
        selected_genres = filters.get("genres", [])
        if selected_genres:
            anime_genres_str = anime_data.get('genres', '')
            if pd.isna(anime_genres_str):
                continue
            anime_genres = {g.strip() for g in anime_genres_str.split(',')}
            if not all(g in anime_genres for g in selected_genres):
                continue
        
        # Media type filter
        selected_media_types = filters.get("media_types", [])
        if selected_media_types:
            media_type = anime_data.get('media_type', '').lower()
            if not media_type or media_type not in selected_media_types:
                continue

        # User count filter
        min_users = filters.get("min_users", 0)
        max_users = filters.get("max_users", 4200000)
        num_list_users = anime_data.get('num_list_users', 0)
        if not (min_users <= num_list_users <= max_users):
            continue

        # If all filters pass, add to list
        recommendation_item = {
            "title": anime_data.get('title', 'Unknown'),
            "score": score,
            "num_list_users": num_list_users,
            "mean": anime_data.get('mean', 0.0),
            "genres": anime_data.get('genres', ''),
            "synopsis": anime_data.get('synopsis', ''),
            "image_url": anime_data.get('image_url', ''),
            "media_type": anime_data.get('media_type', '')
        }
        filtered_recommendations.append(recommendation_item)

    total_filtered_count = len(filtered_recommendations)
    
    # Paginate
    start_index = (page - 1) * page_size
    end_index = start_index + page_size
    paginated_recs = filtered_recommendations[start_index:end_index]

    return paginated_recs, total_filtered_count


def predict_scores(username, dataset, model, df):
    
    # Create a copy of the model to avoid affecting the original
    model_copy = copy.deepcopy(model)
    
    _, user_feature_map, item_id_map, _ = dataset.mapping()
    internal_to_original_anime_id = {v: k for k, v in item_id_map.items()}

    CLIENT_ID = os.getenv("MAL_CLIENT_ID")
    headers = {
                "X-MAL-CLIENT-ID": CLIENT_ID
            }

    url = f"https://api.myanimelist.net/v2/users/{username}/animelist?nsfw=true&limit=1000&fields=list_status,genres,start_season,media_type,main_picture"

    new_user_data = []

    # Fetch user's anime list
    while url and url != "":
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            data = response.json()
            list_objects = data.get("data", [])
            print(f"Fetched {len(list_objects)} anime entries for user '{username}' from {url}")
            for entry in list_objects:
                user_should_count = True
                anime = entry["node"]
                list_status = entry["list_status"]
                start_season = anime.get("start_season", {})
                main_picture = anime.get("main_picture", {})
                
                new_user_data.append({
                    "username": username,
                    "anime_id": anime["id"],
                    "title": anime["title"],
                    "status": list_status["status"],
                    "score": list_status["score"],
                    "genres": anime.get("genres", []),
                    "start_date": list_status.get("start_date"),
                    "finish_date": list_status.get("finish_date"),
                    "start_season_year": start_season.get("year"),
                    "start_season_season": start_season.get("season"),
                    "media_type": anime.get("media_type"),
                    "image_url": main_picture.get("large") or main_picture.get("medium")
                })
            url = data["paging"].get("next", "")
        else:
            print(f"Error {response.status_code}: {response.text}")
            if response.status_code == 403 or response.status_code == 404:
                return [], [], {}, []
            else:
                # For other API errors, we should still return empty but with a flag
                return [], [], {}, []

    new_user_genre_preferences = {}
    genre_counts = {}
    score_distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0}
    status_distribution = {
        'watching': 0,
        'completed': 0,
        'on_hold': 0,
        'dropped': 0,
        'plan_to_watch': 0
    }
    total_anime_in_list = len(new_user_data)

    demographics = set(["Shounen", "Shoujo", "Seinen", "Josei", "Kodomo", "Award Winning", "Kids"])

    for anime_entry in new_user_data:
        # Calculate genre preferences
        genres_for_this_anime = set() 
        for genre_obj in anime_entry.get("genres", []): 
            genre_name = genre_obj.get("name")
            if genre_name and genre_name not in demographics:
                genres_for_this_anime.add(genre_name)
        
        for genre_name in genres_for_this_anime:
            genre_counts[genre_name] = genre_counts.get(genre_name, 0) + 1
        
        # Calculate score distribution
        score = anime_entry.get("score", 0)
        if score > 0:  # Only count anime with actual scores
            score_distribution[score] = score_distribution.get(score, 0) + 1
        
        # Calculate status distribution
        status = anime_entry.get("status", "").lower()
        if status in status_distribution:
            status_distribution[status] = status_distribution.get(status, 0) + 1

    if total_anime_in_list > 0:
        for genre_name, count in genre_counts.items():
            new_user_genre_preferences[genre_name] = count / total_anime_in_list
    else:
        print("User's anime list is empty, cannot calculate genre preferences.")

    # print(f"\nNew user '{username}' genre preferences:")
    # sorted_genres = sorted(new_user_genre_preferences.items(), key=lambda x: x[1], reverse=True)
    # for genre, weight in sorted_genres:
    #     print(f"{genre}: {weight:.4f}")

    # print(f"\nNew user '{username}' score distribution:")
    # for score, count in score_distribution.items():
    #     if count > 0:
    #         print(f"Score {score}: {count} anime")

    # print(f"\nNew user '{username}' status distribution:")
    # for status, count in status_distribution.items():
    #     if count > 0:
    #         print(f"{status}: {count} anime")

    # Calculate user statistics
    user_stats = {
        "genre_preferences": new_user_genre_preferences,
        "score_distribution": score_distribution,
        "status_distribution": status_distribution,
        "total_anime": total_anime_in_list,
        "scored_anime": sum(score_distribution.values()),
        "completed_anime": status_distribution.get('completed', 0),
        "average_score": 0,
        "completion_rate": 0,
        "genre_counts": dict(Counter(genre_counts).most_common(15)),
    }

    user_anime_details = [
        {
            'id': anime['anime_id'],
            'title': anime['title'],
            'score': anime['score'],
            'status': anime['status'],
            'genres': anime['genres'],
            'start_date': anime['start_date'],
            'finish_date': anime['finish_date'],
            'start_year': anime['start_season_year'],
            'start_season': anime['start_season_season'],
            'media_type': anime['media_type'],
            'image_url': anime['image_url']
        } for anime in new_user_data
    ]
    
    # Calculate average score
    total_score = sum(score * count for score, count in score_distribution.items())
    if user_stats["scored_anime"] > 0:
        user_stats["average_score"] = round(total_score / user_stats["scored_anime"], 2)
    
    # Calculate completion rate based on completed anime
    if total_anime_in_list > 0:
        user_stats["completion_rate"] = round((user_stats["completed_anime"] / total_anime_in_list) * 100, 1)

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

    # Train the model copy instead of the original model
    model_copy.fit_partial(
        interactions=new_user_interactions,
        user_features=new_user_features_sparse,
        item_features=None,    
        epochs=10               
    )

    num_items_in_dataset = dataset.interactions_shape()[1]
    all_item_internal_ids = np.arange(num_items_in_dataset)
    # Use the model copy for predictions
    scores = model_copy.predict(user_ids=0,
                            item_ids=all_item_internal_ids,
                            user_features=new_user_features_sparse,
                            item_features=None)

    if scores.size > 0:
        top_n = 20
        min_s = np.min(scores)
        max_s = np.max(scores)
        
        normalized_model_scores = [(s - min_s) / (max_s - min_s) for s in scores]
        item_scores_pairs = list(zip(all_item_internal_ids, normalized_model_scores))

        seen_and_bad_item_internal_ids = set()

        for bad_anime_id in BAD_ANIME_IDS:
            seen_and_bad_item_internal_ids.add(item_id_map[str(bad_anime_id)])

        for entry in new_user_data:
            original_id = str(entry.get("anime_id"))
            if original_id in item_id_map:
                seen_and_bad_item_internal_ids.add(item_id_map[original_id])
        
        unseen_item_scores_pairs = [(int(item_id), float(score)) for item_id, score in item_scores_pairs if item_id not in seen_and_bad_item_internal_ids]

        item_score_pairs_sorted = sorted(unseen_item_scores_pairs, key=lambda x: x[1], reverse=True)

        df['anime_id'] = df['anime_id'].astype(str)
        anime_data_lookup = df.set_index('anime_id').to_dict('index')

        recommendations = []

        for i, (item_internal_id, score) in enumerate(item_score_pairs_sorted[:top_n]):
            original_anime_id = internal_to_original_anime_id.get(item_internal_id)
            original_anime_id_str = str(original_anime_id)
            
            anime_data = anime_data_lookup.get(original_anime_id_str, {})
            
            title = anime_data.get('title', f"Unknown Anime (ID: {original_anime_id})")
            num_list_users = anime_data.get('num_list_users', 0)
            mean = anime_data.get('mean', 0.0)
            genres = anime_data.get('genres', '')
            synopsis = anime_data.get('synopsis', '')
            image_url = anime_data.get('image_url', '')
            media_type = anime_data.get('media_type', '')
            
            recommendations.append({
                "title": title,
                "score": score,
                "num_list_users": num_list_users,
                "mean": mean,
                "genres": genres,
                "synopsis": synopsis,
                "image_url": image_url,
                "media_type": media_type
            })
        
        # Clean up the model copy
        del model_copy
        
        # Have frontend remember the model scores for pagination
        return recommendations, item_score_pairs_sorted, user_stats, user_anime_details
    else:
        del model_copy
        print("No recommendations could be generated for the new user.")
        return [], [], {}, []
