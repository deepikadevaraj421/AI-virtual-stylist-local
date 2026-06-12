import pandas as pd
import numpy as np
from sklearn.neighbors import NearestNeighbors
import matplotlib.pyplot as plt
from PIL import Image

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

# KNN
bottom_embeddings = np.vstack(bottom_df["embedding"].values)
knn_bottom = NearestNeighbors(n_neighbors=5, metric="cosine")
knn_bottom.fit(bottom_embeddings)

shoes_embeddings = np.vstack(shoes_df["embedding"].values)
knn_shoes = NearestNeighbors(n_neighbors=5, metric="cosine")
knn_shoes.fit(shoes_embeddings)

# Pick one random top
sample_top = top_df.sample(1, random_state=42).iloc[0]
top_embedding = sample_top["embedding"].reshape(1, -1)

# Find similar bottoms and shoes
_, idx_bottom = knn_bottom.kneighbors(top_embedding)
_, idx_shoes = knn_shoes.kneighbors(top_embedding)

similar_bottoms = bottom_df.iloc[idx_bottom[0]].reset_index(drop=True)
similar_shoes = shoes_df.iloc[idx_shoes[0]].reset_index(drop=True)

# -------- Visualize --------
plt.figure(figsize=(15, 8))

# Show selected top
plt.subplot(2, 6, 1)
img = Image.open(sample_top["image_path"])
plt.imshow(img)
plt.title(f"TOP\n{sample_top['articleType']}")
plt.axis("off")

# Show bottoms
for i in range(5):
    plt.subplot(2, 6, i + 2)
    img = Image.open(similar_bottoms.iloc[i]["image_path"])
    plt.imshow(img)
    plt.title(f"BOTTOM {i+1}\n{similar_bottoms.iloc[i]['articleType']}")
    plt.axis("off")

# Show shoes
for i in range(5):
    plt.subplot(2, 6, i + 8)
    img = Image.open(similar_shoes.iloc[i]["image_path"])
    plt.imshow(img)
    plt.title(f"SHOE {i+1}\n{similar_shoes.iloc[i]['articleType']}")
    plt.axis("off")

plt.tight_layout()
plt.show()