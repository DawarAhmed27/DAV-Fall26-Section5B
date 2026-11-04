import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.decomposition import PCA
from sklearn.manifold import TSNE

import umap


# ==========================================
# OUTPUT-DRIVEN PROBLEM SOLVING
# ==========================================

# DATASET GENERATION (Do not change)
np.random.seed(42)

data = np.random.randn(20, 4)
data[10:, :] += 3.5
labels = ['Group A'] * 10 + ['Group B'] * 10

df = pd.DataFrame(
    data,
    columns=['F1', 'F2', 'F3', 'F4']
)

X_scaled = df.values


# ==========================================
# PCA
# ==========================================

pca_res = PCA(
    n_components=2
).fit_transform(X_scaled)


# ==========================================
# t-SNE
# ==========================================

# There are only 20 observations, so perplexity=30 is too high.
tsne_res = TSNE(
    n_components=2,
    perplexity=5,
    random_state=42
).fit_transform(X_scaled)


# ==========================================
# UMAP
# ==========================================

umap_res = umap.UMAP(
    n_components=2,
    n_neighbors=5,
    random_state=42
).fit_transform(X_scaled)


# ==========================================
# PLOT ALL THREE RESULTS
# ==========================================

fig, axes = plt.subplots(
    1,
    3,
    figsize=(15, 4)
)

results = [
    ('PCA', pca_res),
    ('t-SNE', tsne_res),
    ('UMAP', umap_res)
]

for ax, (title, res_data) in zip(axes, results):

    plot_df = pd.DataFrame(
        res_data,
        columns=['Dim 1', 'Dim 2']
    )

    # Add the original group labels so the two groups are visible.
    plot_df['Group'] = labels

    sns.scatterplot(
        data=plot_df,
        x='Dim 1',
        y='Dim 2',
        hue='Group',
        ax=ax,
        s=100
    )

    ax.set_title(f"{title} Projection")

plt.tight_layout()
plt.show()
