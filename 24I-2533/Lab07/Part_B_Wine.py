import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

from sklearn.datasets import load_wine
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from sklearn.manifold import TSNE

import umap


# ==========================================
# PART B - WINE DATASET
# ==========================================

# 1. Load the Wine dataset
wine = load_wine()

X = wine.data
y = wine.target

print("Dataset shape:", X.shape)
print("Number of classes:", len(np.unique(y)))

print("\nFeature names:")
for feature in wine.feature_names:
    print(feature)


# 2. Put the dataset into a DataFrame
df = pd.DataFrame(X, columns=wine.feature_names)
df["Class"] = y

print("\nFirst five rows:")
print(df.head())


# ==========================================
# 3. PLOT THREE FEATURE PAIRS
# ==========================================

def plot_pair(feature1, feature2):

    plt.figure(figsize=(7, 5))

    for class_value in range(3):
        plt.scatter(
            X[y == class_value, feature1],
            X[y == class_value, feature2],
            label=wine.target_names[class_value]
        )

    plt.xlabel(wine.feature_names[feature1])
    plt.ylabel(wine.feature_names[feature2])

    plt.title(
        wine.feature_names[feature1]
        + " vs "
        + wine.feature_names[feature2]
    )

    plt.legend()
    plt.tight_layout()
    plt.show()


# Three selected pairs
plot_pair(0, 1)    # Alcohol vs Malic Acid
plot_pair(6, 9)    # Flavanoids vs Color Intensity
plot_pair(6, 12)   # Flavanoids vs Proline


# ==========================================
# 4. STANDARDIZE ALL 13 FEATURES
# ==========================================

scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

print("\nScaled data shape:", X_scaled.shape)


# ==========================================
# 5. PCA
# ==========================================

pca = PCA(n_components=2)
pca_result = pca.fit_transform(X_scaled)

print("\nPCA result shape:", pca_result.shape)
print("PCA explained variance ratio:")
print(pca.explained_variance_ratio_)
print(
    "Total variance explained by 2 components:",
    pca.explained_variance_ratio_.sum()
)


# ==========================================
# 6. t-SNE
# ==========================================

tsne = TSNE(
    n_components=2,
    random_state=42
)

tsne_result = tsne.fit_transform(X_scaled)

print("\nt-SNE result shape:", tsne_result.shape)


# ==========================================
# 7. UMAP
# ==========================================

umap_model = umap.UMAP(
    n_components=2,
    random_state=42
)

umap_result = umap_model.fit_transform(X_scaled)

print("UMAP result shape:", umap_result.shape)


# ==========================================
# 8. PLOT PCA, t-SNE AND UMAP SIDE BY SIDE
# ==========================================

fig, axes = plt.subplots(
    1,
    3,
    figsize=(18, 5)
)

results = [
    ("PCA", pca_result),
    ("t-SNE", tsne_result),
    ("UMAP", umap_result)
]

for ax, (title, result) in zip(axes, results):

    for class_value in range(3):

        ax.scatter(
            result[y == class_value, 0],
            result[y == class_value, 1],
            label=wine.target_names[class_value]
        )

    ax.set_title(title)
    ax.set_xlabel("Dimension 1")
    ax.set_ylabel("Dimension 2")
    ax.legend()

plt.tight_layout()
plt.show()


# ==========================================
# OBSERVATION
# ==========================================

print("\nObservation:")
print(
    "PCA preserves the overall variance of the dataset. "
    "t-SNE focuses strongly on local relationships and can make "
    "clusters more visible. UMAP also preserves local structure "
    "while maintaining useful broader structure."
)
