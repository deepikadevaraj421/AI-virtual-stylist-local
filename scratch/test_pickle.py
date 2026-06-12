import pickle
import pandas as pd

try:
    with open('outputs/embeddings.pkl', 'rb') as f:
        data = pickle.load(f)
    print("Pickle loaded successfully using pickle module")
    print("Type:", type(data))
    if isinstance(data, pd.DataFrame):
        print("Columns:", data.columns)
        print("Rows:", len(data))
except Exception as e:
    print("Error loading pickle:", e)
