import os
import shutil
import pandas as pd

# Paths
base_path = "dataset"
images_path = os.path.join(base_path, "images")
styles_file = os.path.join(base_path, "styles.csv")
output_path = "dataset_prepared"

# Create output folders
categories = ["top", "bottom", "shoes", "bag"]
for category in categories:
    os.makedirs(os.path.join(output_path, category), exist_ok=True)

# Read CSV
df = pd.read_csv(styles_file, on_bad_lines="skip")

# Mapping function
def map_category(article_type):
    article_type = str(article_type).strip().lower()

    # Tops
    if article_type in ["tshirts", "shirts", "tops", "tunics", "sweatshirts", "jackets", "blazers", "kurtas", "shrug", "sweaters"]:
        return "top"

    # Bottoms
    elif article_type in ["jeans", "trousers", "shorts", "skirts", "track pants", "leggings", "capris"]:
        return "bottom"

    # Shoes
    elif article_type in ["casual shoes", "sports shoes", "formal shoes", "flats", "heels", "sandals", "flip flops", "sneakers"]:
        return "shoes"

    # Bags
    elif article_type in ["handbags", "bags", "backpacks", "laptop bags", "messenger bag", "clutches", "wallets"]:
        return "bag"

    else:
        return None

copied_count = {"top": 0, "bottom": 0, "shoes": 0, "bag": 0}
missing_count = 0

for _, row in df.iterrows():
    category = map_category(row.get("articleType"))
    if category is None:
        continue

    image_id = str(row["id"]) + ".jpg"
    src_img = os.path.join(images_path, image_id)

    if os.path.exists(src_img):
        dst_img = os.path.join(output_path, category, image_id)
        shutil.copy(src_img, dst_img)
        copied_count[category] += 1
    else:
        missing_count += 1

print("Dataset preparation completed")
print("Copied counts:", copied_count)
print("Missing images:", missing_count)
