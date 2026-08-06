# Julie's Recipe Book v8

This build contains **301 structured recipes** in `data/recipes.json`.

## Highlights
- 20 fried-rice recipes
- Expanded pork belly and gizzard collections
- 52 soups across multiple cuisines
- 27 curries
- 19 smoothies
- Recipes organized dynamically by meal, cuisine, protein, and dish type
- Adjustable servings with scaled ingredient quantities
- Calories, protein, and carbohydrate estimates per serving

## Run locally
Because recipes load from JSON, run a local server from this folder:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`. GitHub Pages will also serve the app correctly.

Cross-device Firebase sync is intentionally deferred until the recipe library is finalized.
