import pandas as pd
import numpy as np
import random
import joblib
from sklearn.neighbors import NearestNeighbors

# ---------------- USER INPUT ----------------
USER_GENDER = "women"   # change to "men" if needed
# -------------------------------------------

# Load embeddings
df = pd.read_pickle("outputs/embeddings.pkl")
df["embedding"] = df["embedding"].apply(np.array)

# Load metadata
styles = pd.read_csv("dataset/styles.csv", on_bad_lines="skip")
styles["id"] = styles["id"].astype(str)

# Extract id from image name
df["id"] = df["image_name"].str.replace(".jpg", "", regex=False)

# Merge metadata
df = df.merge(
    styles[["id", "articleType", "gender", "usage"]],
    on="id",
    how="left"
)

# Gender filter
def gender_match(g, user_gender):
    g = str(g).lower()
    if "unisex" in g:
        return True
    if user_gender == "women" and "women" in g:
        return True
    if user_gender == "men" and "men" in g:
        return True
    return False

df = df[df["gender"].apply(lambda x: gender_match(x, USER_GENDER))].reset_index(drop=True)

# Split
top_df = df[df["class"] == "top"].reset_index(drop=True)
bottom_df = df[df["class"] == "bottom"].reset_index(drop=True)
shoes_df = df[df["class"] == "shoes"].reset_index(drop=True)

print("After gender filter:", USER_GENDER)
print("Top:", len(top_df))
print("Bottom:", len(bottom_df))
print("Shoes:", len(shoes_df))

# Build KNN
bottom_embeddings = np.vstack(bottom_df["embedding"].values)
knn_bottom = NearestNeighbors(n_neighbors=10, metric="cosine")
knn_bottom.fit(bottom_embeddings)

shoes_embeddings = np.vstack(shoes_df["embedding"].values)
knn_shoes = NearestNeighbors(n_neighbors=10, metric="cosine")
knn_shoes.fit(shoes_embeddings)

# Load trained XGBoost model
model = joblib.load(f"models/xgb_model_{USER_GENDER}.pkl")

# Cosine similarity
def cosine_similarity(a, b):
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

# Pick one random top
sample_top = top_df.sample(1, random_state=42).iloc[0]
top_embedding = sample_top["embedding"].reshape(1, -1)

print("\nSelected TOP:")
print("ID:", sample_top["id"])
print("Article Type:", sample_top["articleType"])
print("Gender:", sample_top["gender"])
print("Image Path:", sample_top["image_path"])

# Find candidate bottoms and shoes
_, idx_bottom = knn_bottom.kneighbors(top_embedding)
_, idx_shoes = knn_shoes.kneighbors(top_embedding)

candidate_bottoms = bottom_df.iloc[idx_bottom[0]].reset_index(drop=True)
candidate_shoes = shoes_df.iloc[idx_shoes[0]].reset_index(drop=True)

rows = []

# Generate combinations and score them
for _, b in candidate_bottoms.iterrows():
    for _, s in candidate_shoes.iterrows():

        sim_tb = cosine_similarity(sample_top["embedding"], b["embedding"])
        sim_ts = cosine_similarity(sample_top["embedding"], s["embedding"])
        sim_bs = cosine_similarity(b["embedding"], s["embedding"])
        sim_avg = (sim_tb + sim_ts + sim_bs) / 3

        X_test = pd.DataFrame([{
            "sim_tb": sim_tb,
            "sim_ts": sim_ts,
            "sim_bs": sim_bs,
            "sim_avg": sim_avg
        }])

        score = model.predict(X_test)[0]

        rows.append({
            "top_id": sample_top["id"],
            "bottom_id": b["id"],
            "shoes_id": s["id"],
            "sim_tb": sim_tb,
            "sim_ts": sim_ts,
            "sim_bs": sim_bs,
            "sim_avg": sim_avg,
            "score": score,
            "bottom_article": b["articleType"],
            "shoes_article": s["articleType"],
            "bottom_path": b["image_path"],
            "shoes_path": s["image_path"],
            "top_path": sample_top["image_path"]
        })

result_df = pd.DataFrame(rows)
result_df = result_df.sort_values(by="score", ascending=False).reset_index(drop=True)

print("\nTop 10 Ranked Outfits:")
print(result_df[["top_id", "bottom_id", "shoes_id", "score", "bottom_article", "shoes_article"]].head(10))

# Save result
result_df.to_csv(f"outputs/ranked_outfits_{USER_GENDER}.csv", index=False)
print(f"\nSaved ranked outfits at outputs/ranked_outfits_{USER_GENDER}.csv")
