import pandas as pd
import numpy as np
import os
from xgboost import XGBRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error
import joblib

os.makedirs("models", exist_ok=True)

for gender in ["women", "men"]:
    print(f"\nTraining XGBoost for: {gender}")

    file_path = f"outputs/xgb_training_data_{gender}.csv"
    df = pd.read_csv(file_path)

    # Features and target
    X = df[["sim_tb", "sim_ts", "sim_bs", "sim_avg"]]
    y = df["target_score"]

    # Train / validation split
    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    # Model
    model = XGBRegressor(
        n_estimators=300,
        learning_rate=0.05,
        max_depth=5,
        subsample=0.9,
        colsample_bytree=0.9,
        random_state=42
    )

    model.fit(X_train, y_train)

    pred = model.predict(X_val)

    rmse = np.sqrt(mean_squared_error(y_val, pred))

    model_path = f"models/xgb_model_{gender}.pkl"
    joblib.dump(model, model_path)

    print(f"{gender} RMSE: {rmse}")
    print(f"Saved model: {model_path}")