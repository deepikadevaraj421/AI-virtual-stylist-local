import pandas as pd
import numpy as np
import joblib
import os
from xgboost import XGBRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error
import tensorflow as tf

def get_xgb_metrics(gender):
    file_path = f"outputs/xgb_training_data_{gender}.csv"
    if not os.path.exists(file_path):
        return None
    
    df = pd.read_csv(file_path)
    X = df[["sim_tb", "sim_ts", "sim_bs", "sim_avg"]]
    y = df["target_score"]
    
    X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, random_state=42)
    
    model = joblib.load(f"models/xgb_model_{gender}.pkl")
    pred = model.predict(X_val)
    rmse = np.sqrt(mean_squared_error(y_val, pred))
    return rmse

print("="*50)
print("       AI VIRTUAL STYLIST - MODEL REPORT")
print("="*50)

print("\n[1] CNN Classification Model (MobileNetV2)")
try:
    model = tf.keras.models.load_model("models/clothing_classifier.keras")
    print("Model Status: LOADED")
    print(f"Input Shape: {model.input_shape}")
    print(f"Output Classes: {model.output_shape[-1]}")
    # model.summary() # Too long for terminal output
except Exception as e:
    print(f"Model Status: ERROR ({e})")

print("\n[2] XGBoost Ranking Model Metrics")
for gender in ["women", "men"]:
    rmse = get_xgb_metrics(gender)
    if rmse is not None:
        print(f"{gender.capitalize()} Model RMSE: {rmse:.6f}")
    else:
        print(f"{gender.capitalize()} Model: Data not found")

print("\n[3] Sample Ranked Outfits (Women)")
try:
    ranked_df = pd.read_csv("outputs/ranked_outfits_women.csv")
    print(ranked_df[["top_id", "bottom_id", "shoes_id", "score", "bottom_article", "shoes_article"]].head(5))
except Exception as e:
    print(f"Ranking Data Error: {e}")

print("\n" + "="*50)
