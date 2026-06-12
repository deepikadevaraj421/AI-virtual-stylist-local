import pandas as pd
import numpy as np
from sklearn.neighbors import NearestNeighbors
import random

# ---------------- USER INPUT ----------------
USER_GENDER = "women"   # change to "men" if needed
# -------------------------------------------

# Load embeddings
df = pd.read_pickle("outputs/embeddings.pkl")
df["embedding"] = df["embedding"].apply(np.array)

# Load styles metadata
styles = pd.read_csv("dataset/styles.csv", on_bad_lines="skip")
styles["id"] = styles["id"].astype(str)

# Extract id from image_name
df["id"] = df["image_name"].str.replace(".jpg", "", regex=False)

# Merge metadata
df = df.merge(
    styles[["id", "articleType", "gender", "usage"]],
    on="id",
    how="left"
)

# Normalize gender values
def gender_match(g, user_gender):
    g = str(g).lower()
    if "unisex" in g:
        return True
    if user_gender == "women" and "women" in g:
        return True
    if user_gender == "men" and "men" in g:
        return True
    return False

# Filter by gender
df = df[df["gender"].apply(lambda x: gender_match(x, USER_GENDER))].reset_index(drop=True)

# Split by class
top_df = df[df["class"] == "top"].reset_index(drop=True)
bottom_df = df[df["class"] == "bottom"].reset_index(drop=True)
shoes_df = df[df["class"] == "shoes"].reset_index(drop=True)

print("After gender filter:", USER_GENDER)
print("Top:", len(top_df))
print("Bottom:", len(bottom_df))
print("Shoes:", len(shoes_df))

# Build KNN models only on filtered data
bottom_embeddings = np.vstack(bottom_df["embedding"].values)
knn_bottom = NearestNeighbors(n_neighbors=5, metric="cosine")
knn_bottom.fit(bottom_embeddings)

shoes_embeddings = np.vstack(shoes_df["embedding"].values)
knn_shoes = NearestNeighbors(n_neighbors=5, metric="cosine")
knn_shoes.fit(shoes_embeddings)

# Pick one random top
sample_top = top_df.sample(1, random_state=42).iloc[0]
top_embedding = sample_top["embedding"].reshape(1, -1)

print("\nSelected TOP:")
print("ID:", sample_top["id"])
print("Article Type:", sample_top["articleType"])
print("Gender:", sample_top["gender"])
print("Image Path:", sample_top["image_path"])

# Find similar bottoms
dist_bottom, idx_bottom = knn_bottom.kneighbors(top_embedding)
print("\nTop 5 similar BOTTOMS:")
for i in idx_bottom[0]:
    row = bottom_df.iloc[i]
    print(f"ID: {row['id']} | {row['articleType']} | {row['gender']} | {row['image_path']}")

# Find similar shoes
dist_shoes, idx_shoes = knn_shoes.kneighbors(top_embedding)
print("\nTop 5 similar SHOES:")
for i in idx_shoes[0]:
    row = shoes_df.iloc[i]
    print(f"ID: {row['id']} | {row['articleType']} | {row['gender']} | {row['image_path']}")