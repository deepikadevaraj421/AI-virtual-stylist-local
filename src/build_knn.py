import pandas as pd
import numpy as np
import os
import pickle
from sklearn.neighbors import NearestNeighbors

# Load embeddings
df = pd.read_pickle("outputs/embeddings.pkl")

# Convert embedding list -> numpy array
df["embedding"] = df["embedding"].apply(np.array)

# Split by class
top_df = df[df["class"] == "top"].reset_index(drop=True)
bottom_df = df[df["class"] == "bottom"].reset_index(drop=True)
shoes_df = df[df["class"] == "shoes"].reset_index(drop=True)
bag_df = df[df["class"] == "bag"].reset_index(drop=True)

print("Top:", len(top_df))
print("Bottom:", len(bottom_df))
print("Shoes:", len(shoes_df))
print("Bag:", len(bag_df))

# Build KNN for bottoms
bottom_embeddings = np.vstack(bottom_df["embedding"].values)
knn_bottom = NearestNeighbors(n_neighbors=10, metric="cosine")
knn_bottom.fit(bottom_embeddings)

# Build KNN for shoes
shoes_embeddings = np.vstack(shoes_df["embedding"].values)
knn_shoes = NearestNeighbors(n_neighbors=10, metric="cosine")
knn_shoes.fit(shoes_embeddings)

# Save models + dataframes
os.makedirs("models", exist_ok=True)

with open("models/knn_bottom.pkl", "wb") as f:
    pickle.dump(knn_bottom, f)

with open("models/knn_shoes.pkl", "wb") as f:
    pickle.dump(knn_shoes, f)

top_df.to_pickle("outputs/top_df.pkl")
bottom_df.to_pickle("outputs/bottom_df.pkl")
shoes_df.to_pickle("outputs/shoes_df.pkl")
bag_df.to_pickle("outputs/bag_df.pkl")

print("KNN models saved successfully")