import pandas as pd
import matplotlib.pyplot as plt
from PIL import Image

# ---------------- USER INPUT ----------------
USER_GENDER = "women"   # change to "men" if needed
# -------------------------------------------

# Load final Screen A results
df = pd.read_csv(f"outputs/screenA_top5_{USER_GENDER}.csv")

plt.figure(figsize=(12, 10))

for i, row in df.iterrows():

    # TOP
    plt.subplot(5, 3, i * 3 + 1)
    img = Image.open(row["top_path"])
    plt.imshow(img)
    plt.title(f"TOP\n{row['top_article']}")
    plt.axis("off")

    # BOTTOM
    plt.subplot(5, 3, i * 3 + 2)
    img = Image.open(row["bottom_path"])
    plt.imshow(img)
    plt.title(f"BOTTOM\n{row['bottom_article']}")
    plt.axis("off")

    # SHOES
    plt.subplot(5, 3, i * 3 + 3)
    img = Image.open(row["shoes_path"])
    plt.imshow(img)
    plt.title(f"SHOES\n{row['shoes_article']}")
    plt.axis("off")

plt.tight_layout()
plt.show()