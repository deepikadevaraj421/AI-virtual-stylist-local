import pandas as pd
import numpy as np
import os
from tqdm import tqdm
from sklearn.neighbors import NearestNeighbors

# Load embeddings
df = pd.read_pickle("outputs/embeddings.pkl")
df["embedding"] = df["embedding"].apply(np.array)

# Load metadata
styles = pd.read_csv("dataset/styles.csv", on_bad_lines="skip")
styles["id"] = styles["id"].astype(str)

df["id"] = df["image_name"].str.replace(".jpg","",regex=False)

df = df.merge(
    styles[["id","articleType","gender","usage"]],
    on="id",
    how="left"
)

def gender_match(g, user_gender):
    g = str(g).lower()
    if "unisex" in g:
        return True
    if user_gender == "women" and "women" in g:
        return True
    if user_gender == "men" and "men" in g:
        return True
    return False

def cosine_similarity(a,b):
    return np.dot(a,b)/(np.linalg.norm(a)*np.linalg.norm(b))


os.makedirs("outputs",exist_ok=True)

# ---- loop for both genders ----
for USER_GENDER in ["women","men"]:

    print("\nProcessing gender:",USER_GENDER)

    df_gender = df[df["gender"].apply(lambda x: gender_match(x,USER_GENDER))].reset_index(drop=True)

    top_df = df_gender[df_gender["class"]=="top"].reset_index(drop=True)
    bottom_df = df_gender[df_gender["class"]=="bottom"].reset_index(drop=True)
    shoes_df = df_gender[df_gender["class"]=="shoes"].reset_index(drop=True)

    print("Top:",len(top_df))
    print("Bottom:",len(bottom_df))
    print("Shoes:",len(shoes_df))

    bottom_embeddings = np.vstack(bottom_df["embedding"].values)
    shoes_embeddings = np.vstack(shoes_df["embedding"].values)

    knn_bottom = NearestNeighbors(n_neighbors=10,metric="cosine")
    knn_bottom.fit(bottom_embeddings)

    knn_shoes = NearestNeighbors(n_neighbors=10,metric="cosine")
    knn_shoes.fit(shoes_embeddings)

    rows=[]

    sample_tops = top_df.sample(min(300,len(top_df)),random_state=42)

    for _,top_row in tqdm(sample_tops.iterrows(),total=len(sample_tops)):

        top_emb = top_row["embedding"].reshape(1,-1)

        _,idx_bottom = knn_bottom.kneighbors(top_emb)
        _,idx_shoes = knn_shoes.kneighbors(top_emb)

        candidate_bottoms = bottom_df.iloc[idx_bottom[0]].reset_index(drop=True)
        candidate_shoes = shoes_df.iloc[idx_shoes[0]].reset_index(drop=True)

        for _,b in candidate_bottoms.iterrows():
            for _,s in candidate_shoes.iterrows():

                sim_tb = cosine_similarity(top_row["embedding"],b["embedding"])
                sim_ts = cosine_similarity(top_row["embedding"],s["embedding"])
                sim_bs = cosine_similarity(b["embedding"],s["embedding"])

                sim_avg = (sim_tb+sim_ts+sim_bs)/3

                rows.append({
                    "top_id":top_row["id"],
                    "bottom_id":b["id"],
                    "shoe_id":s["id"],
                    "sim_tb":sim_tb,
                    "sim_ts":sim_ts,
                    "sim_bs":sim_bs,
                    "sim_avg":sim_avg,
                    "target_score":sim_avg
                })

    train_df = pd.DataFrame(rows)

    file_path = f"outputs/xgb_training_data_{USER_GENDER}.csv"

    train_df.to_csv(file_path,index=False)

    print("Saved:",file_path)
    print("Rows:",len(train_df))