import pandas as pd
import numpy as np
import joblib
from sklearn.neighbors import NearestNeighbors

# ---------------- USER INPUT ----------------
USER_GENDER = "women"       # "women" or "men"
OCCASION = "casual"         # "casual", "office", "college", "party"
WEATHER = "normal"          # "hot", "cold", "rainy", "normal"
TOP_K = 5
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
needed_cols = ["id", "articleType", "gender", "usage", "season", "baseColour"]
existing_cols = [c for c in needed_cols if c in styles.columns]

df = df.merge(styles[existing_cols], on="id", how="left")

# ---------------- FILTER HELPERS ----------------
def gender_match(g, user_gender):
    g = str(g).lower()
    if "unisex" in g:
        return True
    if user_gender == "women" and "women" in g:
        return True
    if user_gender == "men" and "men" in g:
        return True
    return False

def occasion_match(article_type, occasion):
    article_type = str(article_type).lower()

    if occasion in ["casual", "college"]:
        allowed = [
            "tshirts", "tops", "tunics", "kurtas", "jeans",
            "track pants", "leggings", "capris", "shorts",
            "casual shoes", "sports shoes", "sandals", "flats", "sneakers"
        ]
        return article_type in allowed

    elif occasion == "office":
        allowed = [
            "shirts", "blazers", "trousers",
            "formal shoes", "flats", "heels"
        ]
        return article_type in allowed

    elif occasion == "party":
        allowed = [
            "tops", "tunics", "kurtas", "skirts", "jeans",
            "heels", "flats", "sandals"
        ]
        return article_type in allowed

    return True

def weather_match(article_type, weather):
    article_type = str(article_type).lower()

    if weather == "hot":
        blocked = ["jackets", "sweaters", "sweatshirts"]
        return article_type not in blocked

    elif weather == "cold":
        preferred = ["jackets", "sweaters", "sweatshirts", "shoes", "formal shoes"]
        return True  # we allow all for now, later we can give bonus score

    elif weather == "rainy":
        blocked = ["flip flops"]
        return article_type not in blocked

    return True

# ---------------- APPLY FILTERS ----------------
df = df[df["gender"].apply(lambda x: gender_match(x, USER_GENDER))].reset_index(drop=True)
df = df[df["articleType"].apply(lambda x: occasion_match(x, OCCASION))].reset_index(drop=True)
df = df[df["articleType"].apply(lambda x: weather_match(x, WEATHER))].reset_index(drop=True)

# Split
top_df = df[df["class"] == "top"].reset_index(drop=True)
bottom_df = df[df["class"] == "bottom"].reset_index(drop=True)
shoes_df = df[df["class"] == "shoes"].reset_index(drop=True)

print("After filters")
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

# Load XGB model
model = joblib.load(f"models/xgb_model_{USER_GENDER}.pkl")

# Similarity
def cosine_similarity(a, b):
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

rows = []

# Use many tops, not just one top
sample_tops = top_df.sample(min(100, len(top_df)), random_state=42)

for _, top_row in sample_tops.iterrows():
    top_embedding = top_row["embedding"].reshape(1, -1)

    _, idx_bottom = knn_bottom.kneighbors(top_embedding)
    _, idx_shoes = knn_shoes.kneighbors(top_embedding)

    candidate_bottoms = bottom_df.iloc[idx_bottom[0]].reset_index(drop=True)
    candidate_shoes = shoes_df.iloc[idx_shoes[0]].reset_index(drop=True)

    for _, b in candidate_bottoms.iterrows():
        for _, s in candidate_shoes.iterrows():

            sim_tb = cosine_similarity(top_row["embedding"], b["embedding"])
            sim_ts = cosine_similarity(top_row["embedding"], s["embedding"])
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
                "top_id": top_row["id"],
                "bottom_id": b["id"],
                "shoes_id": s["id"],
                "top_article": top_row["articleType"],
                "bottom_article": b["articleType"],
                "shoes_article": s["articleType"],
                "score": score,
                "top_path": top_row["image_path"],
                "bottom_path": b["image_path"],
                "shoes_path": s["image_path"]
            })

result_df = pd.DataFrame(rows)
result_df = result_df.sort_values(by="score", ascending=False).reset_index(drop=True)

# ---------- pick top 5 UNIQUE outfits ----------
selected = []
used_tops = set()
used_bottoms = set()
used_shoes = set()

for _, row in result_df.iterrows():
    if row["top_id"] in used_tops:
        continue
    if row["bottom_id"] in used_bottoms:
        continue
    if row["shoes_id"] in used_shoes:
        continue

    selected.append(row)
    used_tops.add(row["top_id"])
    used_bottoms.add(row["bottom_id"])
    used_shoes.add(row["shoes_id"])

    if len(selected) == TOP_K:
        break

screenA_df = pd.DataFrame(selected)

print("\nFinal Screen A Top 5 Outfits:")
print(screenA_df[["top_id", "bottom_id", "shoes_id", "score", "top_article", "bottom_article", "shoes_article"]])

screenA_df.to_csv(f"outputs/screenA_top5_{USER_GENDER}.csv", index=False)
print(f"\nSaved at outputs/screenA_top5_{USER_GENDER}.csv")