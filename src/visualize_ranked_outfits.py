import pandas as pd
import matplotlib.pyplot as plt
from PIL import Image

# change gender if needed
USER_GENDER = "women"

# load ranked outfits
df = pd.read_csv(f"outputs/ranked_outfits_{USER_GENDER}.csv")

# show top 5 outfits
top5 = df.head(5)

plt.figure(figsize=(12,8))

for i, row in top5.iterrows():

    # show top
    plt.subplot(5,3,(i*3)+1)
    img = Image.open(row["top_path"])
    plt.imshow(img)
    plt.title("TOP")
    plt.axis("off")

    # show bottom
    plt.subplot(5,3,(i*3)+2)
    img = Image.open(row["bottom_path"])
    plt.imshow(img)
    plt.title(row["bottom_article"])
    plt.axis("off")

    # show shoes
    plt.subplot(5,3,(i*3)+3)
    img = Image.open(row["shoes_path"])
    plt.imshow(img)
    plt.title(row["shoes_article"])
    plt.axis("off")

plt.tight_layout()
plt.show()