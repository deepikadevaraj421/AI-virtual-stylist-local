import tensorflow as tf
from tensorflow import keras
import numpy as np
import pandas as pd
import os
from tqdm import tqdm

MODEL_PATH = "models/clothing_classifier.keras"
DATA_DIR = "dataset_balanced"
IMG_SIZE = (160, 160)

# Load trained model
from tensorflow.keras.layers import RandomFlip
class CustomRandomFlip(RandomFlip):
    def __init__(self, **kwargs):
        kwargs.pop('data_format', None)
        super().__init__(**kwargs)

model = keras.models.load_model(
    MODEL_PATH, 
    custom_objects={'RandomFlip': CustomRandomFlip},
    compile=False
)

# Create embedding model (remove final softmax layer)
embedding_model = keras.Model(
    inputs=model.input,
    outputs=model.layers[-2].output
)

# Get class names
temp_ds = tf.keras.utils.image_dataset_from_directory(
    DATA_DIR,
    image_size=IMG_SIZE,
    batch_size=32
)
class_names = temp_ds.class_names
print("Classes:", class_names)

rows = []

for cls in class_names:
    folder_path = os.path.join(DATA_DIR, cls)
    for img_file in tqdm(os.listdir(folder_path), desc=f"Processing {cls}"):
        img_path = os.path.join(folder_path, img_file)

        try:
            img = keras.utils.load_img(img_path, target_size=IMG_SIZE)
            img_array = keras.utils.img_to_array(img)
            img_array = np.expand_dims(img_array, axis=0)

            embedding = embedding_model.predict(img_array, verbose=0)[0]

            rows.append({
                "image_name": img_file,
                "image_path": img_path,
                "class": cls,
                "embedding": embedding.tolist()
            })
        except Exception as e:
            print(f"Skipping {img_path}: {e}")

# Save embeddings
os.makedirs("outputs", exist_ok=True)
df = pd.DataFrame(rows)
df.to_pickle("outputs/embeddings.pkl")

print("Embeddings saved at outputs/embeddings.pkl")
print("Total rows:", len(df))