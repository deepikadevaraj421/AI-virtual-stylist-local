"""
AI Virtual Stylist - ML Microservice
Flask-based service that wraps CNN, KNN, and XGBoost models
"""
import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
import numpy as np
import tensorflow as tf
from tensorflow import keras
import joblib
import json
import traceback
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# ─── Configuration ───────────────────────────────────────────────
MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'models')
IMG_SIZE = (160, 160)
CLASS_NAMES = ['bag', 'bottom', 'shoes', 'top']  # alphabetical order from training

# ─── Lazy-loaded models ──────────────────────────────────────────
_cnn_model = None
_embedding_model = None
_xgb_men = None
_xgb_women = None


def get_cnn_model():
    global _cnn_model, _embedding_model
    if _cnn_model is None:
        try:
            print(f"[DEBUG] TF_USE_LEGACY_KERAS = {os.environ.get('TF_USE_LEGACY_KERAS')}")
            print(f"[DEBUG] tf.__version__ = {tf.__version__}")
            print(f"[DEBUG] keras.__version__ = {keras.__version__}")
            print(f"[DEBUG] keras.__file__ = {keras.__file__}")
            # Keras 3 workaround for RandomFlip
            def custom_from_config(cls, config):
                config.pop('data_format', None)
                return cls(**config)
            
            keras.layers.RandomFlip.from_config = classmethod(custom_from_config)
            
            model_path = os.path.join(MODEL_DIR, 'clothing_classifier.keras')
            _cnn_model = keras.models.load_model(
                model_path,
                compile=False
            )
            # Create embedding model (output before softmax)
            _embedding_model = keras.Model(
                inputs=_cnn_model.input,
                outputs=_cnn_model.layers[-2].output
            )
            print(f"CNN model loaded from {model_path}")
        except Exception as e:
            import traceback
            tb = traceback.format_exc()
            raise Exception(f"Failed to load CNN model: {e}\nTraceback: {tb}")
    return _cnn_model, _embedding_model


def get_xgb_model(gender):
    global _xgb_men, _xgb_women
    try:
        if gender == 'men':
            if _xgb_men is None:
                path = os.path.join(MODEL_DIR, 'xgb_model_men.pkl')
                _xgb_men = joblib.load(path)
                print(f"XGBoost men model loaded")
            return _xgb_men
        else:
            if _xgb_women is None:
                path = os.path.join(MODEL_DIR, 'xgb_model_women.pkl')
                _xgb_women = joblib.load(path)
                print(f"XGBoost women model loaded")
            return _xgb_women
    except Exception as e:
        print(f"Error loading XGBoost model: {e}")
        return None


# ─── Helper Functions ────────────────────────────────────────────
def get_dominant_color(image_path):
    """Extract dominant color name from image focusing on the center (clothing)."""
    try:
        from PIL import Image
        import numpy as np
        from sklearn.cluster import KMeans

        img = Image.open(image_path).convert('RGB')
        
        # 1. Crop to center (avoid background edges)
        width, height = img.size
        left = width * 0.2
        top = height * 0.2
        right = width * 0.8
        bottom = height * 0.8
        img = img.crop((left, top, right, bottom))
        
        img = img.resize((50, 50))  # resize for speed
        ar = np.asarray(img)
        shape = ar.shape
        pixels = ar.reshape(np.prod(shape[:2]), shape[2])

        # 2. Filter out background-like pixels (very light/white)
        # and very dark pixels if they dominate
        filtered_pixels = []
        for p in pixels:
            r, g, b = p
            # Skip near-white (background)
            if r > 240 and g > 240 and b > 240:
                continue
            # Skip near-black (if it's just shadows) - but be careful, could be black clothes
            # if r < 15 and g < 15 and b < 15:
            #     continue
            filtered_pixels.append(p)
        
        if not filtered_pixels:
            filtered_pixels = pixels # fallback if everything was filtered
        
        pixels = np.array(filtered_pixels)

        # 3. Cluster colors
        n_clusters = 5
        kmeans = KMeans(n_clusters=min(n_clusters, len(pixels)), n_init=5)
        kmeans.fit(pixels)
        
        colors = kmeans.cluster_centers_
        counts = np.bincount(kmeans.labels_)
        
        # 4. Find the best color
        # We want the most frequent "vibrant" or "significant" color
        best_color = colors[np.argmax(counts)]
        
        # Heuristic: Filter out very dull colors if there's a more vibrant one
        # that is at least 15% of the image
        max_vibrancy = -1
        vibrant_color = None
        
        for i, color in enumerate(colors):
            # Calculate "vibrancy" (max difference between RGB components)
            vibrancy = np.max(color) - np.min(color)
            if vibrancy > max_vibrancy and counts[i] > (len(pixels) * 0.15):
                max_vibrancy = vibrancy
                vibrant_color = color
        
        if vibrant_color is not None and max_vibrancy > 20:
            best_color = vibrant_color

        # If best_color is very dark, it might be black or dark brown/maroon
        if np.mean(best_color) < 50:
            # Re-examine clusters to see if there's a slightly lighter version that clarifies the color
            for c in colors:
                if 30 < np.mean(c) < 80:
                    best_color = c
                    break

        return rgb_to_name(best_color)
    except Exception as e:
        print(f"Color extraction error: {e}")
        return "unknown"

def rgb_to_name(rgb):
    """Convert RGB to simple color names with better distance mapping."""
    r, g, b = rgb
    # Refined color map
    colors = {
        'black': (15, 15, 15),
        'white': (250, 250, 250),
        'red': (220, 20, 60),
        'green': (34, 139, 34),
        'blue': (0, 0, 255),
        'yellow': (255, 215, 0),
        'pink': (255, 182, 193),
        'grey': (128, 128, 128),
        'brown': (139, 69, 19),
        'navy': (0, 0, 128),
        'beige': (245, 245, 220),
        'maroon': (100, 10, 20),
        'purple': (90, 30, 120),
        'orange': (255, 165, 0),
        'teal': (0, 128, 128),
        'cyan': (0, 255, 255),
        'magenta': (255, 0, 255),
        'olive': (128, 128, 0),
        'burgundy': (128, 0, 32),
        'lavender': (230, 230, 250),
        'khaki': (240, 230, 140)
    }
    
    min_dist = float('inf')
    best_name = 'unknown'
    
    # Use a simple weighted Euclidean distance (humans are more sensitive to green)
    for name, t in colors.items():
        dist = np.sqrt(2*(r-t[0])**2 + 4*(g-t[1])**2 + 3*(b-t[2])**2)
        if dist < min_dist:
            min_dist = dist
            best_name = name
            
    return best_name

def cosine_similarity(a, b):
    a = np.array(a, dtype=np.float64)
    b = np.array(b, dtype=np.float64)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))


def occasion_match(category, occasion):
    category = str(category).lower()
    if occasion in ['casual', 'college']:
        return True  # most items work for casual/college
    elif occasion == 'office':
        blocked = ['shorts', 'flip flops', 'sandals']
        return category not in blocked
    elif occasion == 'party':
        return True
    return True


def weather_filter(category, weather):
    category = str(category).lower()
    if weather == 'hot':
        blocked = ['jackets', 'sweaters', 'boots']
        return category not in blocked
    elif weather == 'rainy':
        blocked = ['flip flops', 'sandals']
        return category not in blocked
    return True


# ─── Endpoints ───────────────────────────────────────────────────
@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'service': 'ml-service'})


@app.route('/classify', methods=['POST'])
def classify():
    """
    Classify a clothing image using the CNN model.
    Expects JSON: { "image_path": "/path/to/image.jpg" }
    Returns: { "predicted_category": "top", "confidence": 0.95, "embedding": [...], "color": "blue" }
    """
    try:
        data = request.json
        image_path = data.get('image_path', '')

        if not image_path or not os.path.exists(image_path):
            return jsonify({'error': 'Image path not found'}), 400

        cnn_model, embedding_model = get_cnn_model()
        if cnn_model is None:
            return jsonify({'error': 'CNN model not loaded'}), 500

        # Load and preprocess image
        img = keras.utils.load_img(image_path, target_size=IMG_SIZE)
        img_array = keras.utils.img_to_array(img)
        img_array = np.expand_dims(img_array, axis=0)

        # Predict class
        predictions = cnn_model.predict(img_array, verbose=0)[0]
        predicted_idx = int(np.argmax(predictions))
        predicted_category = CLASS_NAMES[predicted_idx]
        confidence = float(predictions[predicted_idx])

        # Get embedding
        embedding = embedding_model.predict(img_array, verbose=0)[0]

        # Extract color
        color = get_dominant_color(image_path)

        # Advanced Heuristic: Dress detection using Aspect Ratio
        # Since the CNN wasn't explicitly trained on 'dress', tall items (height > width * 1.4) 
        # that are predicted as 'top' or 'bottom' are very likely dresses or one-piece garments.
        from PIL import Image
        orig_img = Image.open(image_path)
        orig_w, orig_h = orig_img.size
        aspect_ratio = orig_h / orig_w
        
        sub_category = ""
        
        # 1. Dress Detection (Heuristic)
        # Refined: only convert to dress if it's a Top and very tall, 
        # or if it's predicted as bottom but has a massive aspect ratio (skirt/maxi)
        if (predicted_category == 'top' and aspect_ratio > 1.4):
            if aspect_ratio > 1.8:
                sub_category = 'kurta'
            elif aspect_ratio > 1.6:
                predicted_category = 'dress'
                sub_category = 'midi'
            else:
                sub_category = 'long-top'
        elif predicted_category == 'bottom' and aspect_ratio > 2.5:
            # Likely a very long skirt or dress that CNN confused for bottom
            predicted_category = 'dress'
            sub_category = 'maxi'
        
        # 2. Sub-category heuristics
        if not sub_category:
            if predicted_category == 'bottom':
                if color == 'blue':
                    sub_category = "jeans"
                elif color in ['black', 'grey', 'khaki', 'brown']:
                    sub_category = "trousers"
                else:
                    sub_category = "pants"
            elif predicted_category == 'top':
                if color == 'white' or aspect_ratio > 1.2:
                    sub_category = "shirt"
                else:
                    sub_category = "tshirt"
            elif predicted_category == 'shoes':
                if color in ['black', 'brown']:
                    sub_category = "formal-shoes"
                else:
                    sub_category = "sneakers"

        # 3. Material Heuristic
        predicted_material = "cotton"
        if sub_category == 'jeans':
            predicted_material = "denim"
        elif predicted_category == 'shoes':
            predicted_material = "leather" if color in ['black', 'brown'] else "canvas"
        elif color in ['grey', 'navy', 'black'] and predicted_category == 'top' and aspect_ratio > 1.3:
            predicted_material = "wool" # heuristic for sweaters/jackets
        
        # 4. Occasion Heuristic
        predicted_occasion = "casual"
        if sub_category in ['shirt', 'trousers', 'formal-shoes', 'blazer']:
            predicted_occasion = "office"
        elif predicted_category == 'dress' or color in ['gold', 'silver', 'magenta']:
            predicted_occasion = "party"
        
        # 5. Weather Suitability Heuristic
        weather_suitability = ['normal']
        if predicted_material in ['wool', 'leather'] or sub_category in ['jacket', 'sweater', 'boots']:
            weather_suitability.append('cold')
        if predicted_material in ['linen', 'chiffon'] or sub_category in ['shorts', 'sandals', 'tank-top']:
            weather_suitability.append('hot')
        if sub_category in ['raincoat', 'boots'] or predicted_material == 'synthetic':
            weather_suitability.append('rainy')
        
        # 6. Gender heuristic
        predicted_gender = "unisex"
        if predicted_category == 'dress':
            predicted_gender = 'women'
        elif predicted_category == 'top':
            if sub_category in ['blouse', 'top']:
                predicted_gender = 'women'
            elif sub_category == 'shirt':
                predicted_gender = 'unisex'
        
        # Specific color-based gender hints
        if color in ['pink', 'lavender', 'magenta', 'burgundy'] and predicted_category in ['top', 'dress']:
            predicted_gender = 'women'
        
        return jsonify({
            'predicted_category': predicted_category,
            'sub_category': sub_category,
            'predicted_gender': predicted_gender,
            'predicted_material': predicted_material,
            'predicted_occasion': predicted_occasion,
            'weather_suitability': weather_suitability,
            'confidence': round(confidence, 4),
            'embedding': embedding.tolist(),
            'color': color,
            'all_scores': {CLASS_NAMES[i]: float(predictions[i]) for i in range(len(CLASS_NAMES))}
        })

    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        with open("crash.log", "w") as f:
            f.write(tb)
        return jsonify({'error': str(e), 'traceback': tb}), 500


@app.route('/recommend', methods=['POST'])
def recommend():
    """
    Generate outfit recommendations using KNN + XGBoost + Color Harmony.
    Pipeline: KNN (candidate gen) → XGBoost (scoring) → Color + Occasion + Weather (reranking)
    """
    try:
        data = request.json
        tops = data.get('tops', [])
        bottoms = data.get('bottoms', [])
        shoes = data.get('shoes', [])
        bags = data.get('bags', [])
        gender = data.get('gender', 'women')
        occasion = data.get('occasion', 'casual')
        weather = data.get('weather', 'normal')
        top_k = data.get('topK', 5)

        # Check if items have embeddings
        tops_with_emb = [t for t in tops if t.get('embedding') and len(t['embedding']) > 0]
        bottoms_with_emb = [b for b in bottoms if b.get('embedding') and len(b['embedding']) > 0]
        shoes_with_emb = [s for s in shoes if s.get('embedding') and len(s['embedding']) > 0]

        if len(tops_with_emb) == 0 or len(bottoms_with_emb) == 0 or len(shoes_with_emb) == 0:
            return jsonify({'outfits': [], 'message': 'Not enough items with embeddings'})

        # Load XGBoost model
        xgb_model = get_xgb_model(gender)
        if xgb_model is None:
            return jsonify({'outfits': [], 'message': 'XGBoost model not available'})

        # Build KNN for bottoms and shoes
        from sklearn.neighbors import NearestNeighbors

        bottom_embeddings = np.array([b['embedding'] for b in bottoms_with_emb])
        shoes_embeddings = np.array([s['embedding'] for s in shoes_with_emb])

        n_bottom_neighbors = min(10, len(bottoms_with_emb))
        n_shoes_neighbors = min(10, len(shoes_with_emb))

        knn_bottom = NearestNeighbors(n_neighbors=n_bottom_neighbors, metric='cosine')
        knn_bottom.fit(bottom_embeddings)

        knn_shoes = NearestNeighbors(n_neighbors=n_shoes_neighbors, metric='cosine')
        knn_shoes.fit(shoes_embeddings)

        # Generate candidates
        import pandas as pd
        rows = []

        sample_size = min(len(tops_with_emb), 50)
        sample_tops = tops_with_emb[:sample_size]

        for top in sample_tops:
            top_emb = np.array(top['embedding']).reshape(1, -1)

            _, idx_bottom = knn_bottom.kneighbors(top_emb)
            _, idx_shoes = knn_shoes.kneighbors(top_emb)

            candidate_bottoms = [bottoms_with_emb[i] for i in idx_bottom[0]]
            candidate_shoes = [shoes_with_emb[i] for i in idx_shoes[0]]

            for b in candidate_bottoms[:5]:  # limit combinations
                for s in candidate_shoes[:5]:
                    sim_tb = cosine_similarity(top['embedding'], b['embedding'])
                    sim_ts = cosine_similarity(top['embedding'], s['embedding'])
                    sim_bs = cosine_similarity(b['embedding'], s['embedding'])
                    sim_avg = (sim_tb + sim_ts + sim_bs) / 3

                    # XGBoost prediction (trained features: sim_tb, sim_ts, sim_bs, sim_avg)
                    X_test = pd.DataFrame([{
                        'sim_tb': sim_tb,
                        'sim_ts': sim_ts,
                        'sim_bs': sim_bs,
                        'sim_avg': sim_avg
                    }])

                    xgb_score = float(xgb_model.predict(X_test)[0])

                    # ── Color harmony bonus ──
                    color_bonus = compute_color_harmony(
                        top.get('color', ''), b.get('color', ''), s.get('color', '')
                    )

                    # ── Occasion penalty ──
                    occasion_penalty = compute_occasion_penalty(
                        top.get('occasion', 'all'),
                        b.get('occasion', 'all'),
                        s.get('subCategory', ''),
                        occasion
                    )

                    # ── Weather penalty ──
                    weather_penalty = compute_weather_penalty(
                        top.get('material', ''),
                        b.get('material', ''),
                        s.get('subCategory', ''),
                        weather
                    )

                    # Combined score: XGBoost (60%) + Color (20%) + Occasion (10%) + Weather (10%)
                    final_score = (
                        xgb_score * 0.6 +
                        color_bonus * 0.2 +
                        occasion_penalty * 0.1 +
                        weather_penalty * 0.1
                    )

                    rows.append({
                        'top_id': top['id'],
                        'bottom_id': b['id'],
                        'shoes_id': s['id'],
                        'score': final_score
                    })

        # Sort by score descending
        rows.sort(key=lambda x: x['score'], reverse=True)

        # Pick top K unique outfits (no repeating items)
        selected = []
        used_tops = set()
        used_bottoms = set()
        used_shoes = set()

        for row in rows:
            if row['top_id'] in used_tops:
                continue
            if row['bottom_id'] in used_bottoms:
                continue
            if row['shoes_id'] in used_shoes:
                continue

            selected.append(row)
            used_tops.add(row['top_id'])
            used_bottoms.add(row['bottom_id'])
            used_shoes.add(row['shoes_id'])

            if len(selected) >= top_k:
                break

        return jsonify({'outfits': selected})

    except Exception as e:
        print(f"Recommendation error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e), 'outfits': []}), 500


# ─── Scoring helpers for /recommend ──────────────────────────────
NEUTRALS = {'black', 'white', 'grey', 'beige', 'cream', 'navy', 'khaki'}

def compute_color_harmony(top_color, bottom_color, shoes_color):
    """Score color harmony 0-1."""
    tc = (top_color or '').lower()
    bc = (bottom_color or '').lower()
    sc = (shoes_color or '').lower()

    if not tc or not bc or not sc:
        return 0.5  # no data

    neutrals_count = sum(1 for c in [tc, bc, sc] if c in NEUTRALS)

    score = 0.5
    if neutrals_count >= 2:
        score += 0.3  # 2+ neutrals = safe combo
    elif neutrals_count == 1:
        score += 0.15

    # Classic combos
    if (tc == 'white' and bc in ['blue', 'black', 'navy']) or \
       (tc == 'black' and bc in ['blue', 'grey', 'white']) or \
       (tc == 'blue' and bc in ['beige', 'white', 'black']):
        score += 0.15

    # All same non-neutral = bad
    if tc == bc == sc and tc not in NEUTRALS:
        score -= 0.2

    # 3 different non-neutrals = clash
    if neutrals_count == 0 and len({tc, bc, sc}) == 3:
        score -= 0.3

    return max(0, min(1, score))


def compute_occasion_penalty(top_occ, bottom_occ, shoes_sub, occasion):
    """Occasion fit score 0-1."""
    score = 0.5

    for item_occ in [top_occ, bottom_occ]:
        item_occ = (item_occ or 'all').lower()
        if item_occ == occasion or item_occ == 'all':
            score += 0.15
        elif item_occ in ['casual', 'college'] and occasion in ['casual', 'college']:
            score += 0.1  # close enough

    # Shoes sub-category rules
    shoes_sub = (shoes_sub or '').lower()
    if occasion == 'office' and shoes_sub in ['formal-shoes', 'loafers', 'flats']:
        score += 0.2
    elif occasion == 'office' and shoes_sub in ['slippers', 'sandals']:
        score -= 0.3
    elif occasion == 'party' and shoes_sub in ['heels', 'boots']:
        score += 0.2
    elif occasion in ['casual', 'college'] and shoes_sub in ['sneakers', 'flats', 'sandals']:
        score += 0.15

    return max(0, min(1, score))


def compute_weather_penalty(top_mat, bottom_mat, shoes_sub, weather):
    """Weather suitability score 0-1."""
    if weather == 'normal':
        return 0.7  # neutral

    score = 0.5
    top_mat = (top_mat or '').lower()
    bottom_mat = (bottom_mat or '').lower()
    shoes_sub = (shoes_sub or '').lower()

    if weather == 'hot':
        for mat in [top_mat, bottom_mat]:
            if mat in ['cotton', 'linen', 'chiffon']:
                score += 0.15
            if mat in ['wool', 'velvet', 'leather']:
                score -= 0.2
        if shoes_sub in ['sandals', 'flats']:
            score += 0.1
        if shoes_sub in ['boots']:
            score -= 0.15
    elif weather == 'cold':
        for mat in [top_mat, bottom_mat]:
            if mat in ['wool', 'knit', 'velvet', 'leather']:
                score += 0.15
            if mat in ['chiffon', 'linen']:
                score -= 0.15
        if shoes_sub in ['boots', 'sneakers']:
            score += 0.1
        if shoes_sub in ['sandals', 'slippers']:
            score -= 0.2
    elif weather == 'rainy':
        for mat in [top_mat, bottom_mat]:
            if mat in ['synthetic', 'polyester']:
                score += 0.15
            if mat in ['silk', 'satin']:
                score -= 0.2
        if shoes_sub in ['boots', 'sneakers']:
            score += 0.1
        if shoes_sub in ['heels', 'sandals', 'slippers']:
            score -= 0.2

    return max(0, min(1, score))


@app.route('/embedding', methods=['POST'])
def get_embedding():
    """
    Get embedding for a single image.
    Expects JSON: { "image_path": "/path/to/image.jpg" }
    Returns: { "embedding": [...] }
    """
    try:
        data = request.json
        image_path = data.get('image_path', '')

        if not image_path or not os.path.exists(image_path):
            return jsonify({'error': 'Image path not found'}), 400

        _, embedding_model = get_cnn_model()
        if embedding_model is None:
            return jsonify({'error': 'Model not loaded'}), 500

        from tensorflow import keras
        img = keras.utils.load_img(image_path, target_size=IMG_SIZE)
        img_array = keras.utils.img_to_array(img)
        img_array = np.expand_dims(img_array, axis=0)

        embedding = embedding_model.predict(img_array, verbose=0)[0]

        return jsonify({'embedding': embedding.tolist()})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    print("Starting ML Microservice on port 5001...")
    print(f"Models directory: {MODEL_DIR}")
    app.run(host='0.0.0.0', port=5001, debug=False)
