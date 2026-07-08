import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt
import os

df = pd.read_csv('mars_data.csv')

dir_detailed = 'heatmaps_detailed'
dir_clean = 'heatmaps_clean'
os.makedirs(dir_detailed, exist_ok=True)
os.makedirs(dir_clean, exist_ok=True)

topo_dict = {
    'Flat': 0, 
    'Steep': 1, 
    'Rough': 2, 
    'Mountainous': 3
}
df['Topography_Code'] = df['Topography'].map(topo_dict)

legend_print = {v: k for k, v in topo_dict.items()}
print(f"Topography Legend: {legend_print}")

color_maps = {
    'Metals': 'YlOrBr',     
    'Concrete': 'Greys',     
    'Water': 'Blues',        
    'DustDevils': 'Oranges',  
    'DustStorm': 'OrRd',     
    'Meteor': 'Reds',        
    'ColdWave': 'Purples',   
    'Altitude': 'hot_r',      
    'Temperature': 'coolwarm',
    'Difficulty': 'inferno_r',
    'Topography_Code': 'viridis' 
}

metrics = list(color_maps.keys())

for metric in metrics:
    pivot_df = df.pivot_table(index='Lat', columns='Long', values=metric)
    pivot_df = pivot_df.sort_index(ascending=True)
    current_cmap = color_maps[metric]
    display_name = 'Topography' if metric == 'Topography_Code' else metric
    
    plt.figure(figsize=(25.6, 10))
    sns.heatmap(pivot_df, 
                annot=False,  
                cmap=current_cmap,  
                linewidths=0, 
                xticklabels=10, 
                yticklabels=10,
                cbar_kws={'label': f'{display_name} Level'})
    
    plt.title(f'{display_name} Distribution Map', fontsize=18)
    plt.xlabel('Longitude', fontsize=14)
    plt.ylabel('Latitude', fontsize=14)
    plt.tight_layout()
    plt.savefig(os.path.join(dir_detailed, f'{display_name}_detailed.png'), dpi=100)
    plt.close()

    plt.figure(figsize=(3.61, 1.41))
    sns.heatmap(pivot_df, 
                annot=False,  
                cmap=current_cmap,  
                linewidths=0, 
                cbar=False,           
                xticklabels=False,    
                yticklabels=False)    
    
    plt.axis('off')
    
    plt.savefig(os.path.join(dir_clean, f'{display_name}_clean.png'), 
                dpi=1000, 
                bbox_inches='tight', 
                pad_inches=0)
    plt.close()

print(f"Success: Maps saved in '{dir_detailed}' and '{dir_clean}'.")