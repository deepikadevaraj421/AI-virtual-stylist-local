import os
import shutil
import random

input_path = "dataset_prepared"
output_path = "dataset_balanced"

categories = ["top", "bottom", "shoes", "bag"]

os.makedirs(output_path, exist_ok=True)

# count images in each class
counts = {}
for c in categories:
    folder = os.path.join(input_path, c)
    counts[c] = len(os.listdir(folder))

print("Original counts:", counts)

# find minimum count
min_count = min(counts.values())
print("Balancing to:", min_count)

for c in categories:
    src_folder = os.path.join(input_path, c)
    dst_folder = os.path.join(output_path, c)

    os.makedirs(dst_folder, exist_ok=True)

    images = os.listdir(src_folder)
    selected = random.sample(images, min_count)

    for img in selected:
        shutil.copy(
            os.path.join(src_folder, img),
            os.path.join(dst_folder, img)
        )

print("Balanced dataset created at:", output_path)