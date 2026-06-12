import tensorflow as tf
from tensorflow import keras
import os

# Suppress TF logging
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
DATA_DIR = "dataset_balanced"
IMG_SIZE = (160, 160)
BATCH_SIZE = 32
MODEL_PATH = "models/clothing_classifier.keras"

print("="*50)
print("       CNN ACCURACY EVALUATION")
print("="*50)

if not os.path.exists(MODEL_PATH):
    print(f"Error: Model file not found at {MODEL_PATH}")
    exit()

try:
    print(f"Loading model: {MODEL_PATH}...")
    
    # Keras 3 workaround for RandomFlip
    def custom_from_config(cls, config):
        config.pop('data_format', None)
        return cls(**config)
    
    keras.layers.RandomFlip.from_config = classmethod(custom_from_config)
    
    model = keras.models.load_model(
        MODEL_PATH, 
        compile=False
    )
    model.compile(
        optimizer='adam',
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )
    print("Model loaded and compiled successfully.")
    
    # Load validation dataset
    val_ds = keras.utils.image_dataset_from_directory(
        DATA_DIR,
        validation_split=0.2,
        subset="validation",
        seed=42,
        image_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        verbose=False
    )
    
    print("\nEvaluating on validation set...")
    loss, accuracy = model.evaluate(val_ds, verbose=0)
    
    print(f"\nFinal Accuracy: {accuracy*100:.2f}%")
    print(f"Final Loss: {loss:.4f}")

except Exception as e:
    print(f"\nError during evaluation: {e}")

print("="*50)
