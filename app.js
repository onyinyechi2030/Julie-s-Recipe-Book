'use strict';

let builtIns = [];
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const read = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
};

let custom = read('julieCustomRecipes', []);
let favorites = read('julieRecipeFavorites', []);
let shopping = read('julieShoppingList', []);
let notes = read('julieRecipeNotes', {});

const allRecipes = () => [...builtIns, ...custom];
const save = () => {
  localStorage.setItem('julieCustomRecipes', JSON.stringify(custom));
  localStorage.setItem('julieRecipeFavorites', JSON.stringify(favorites));
  localStorage.setItem('julieShoppingList', JSON.stringify(shopping));
  localStorage.setItem('julieRecipeNotes', JSON.stringify(notes));
};

function switchView(id) {
  $$('.view').forEach((view) => view.classList.toggle('active', view.id === id));
  $$('.tab').forEach((button) => button.classList.toggle('active', button.dataset.view === id));
  if (id === 'favorites') renderFavorites();
  if (id === 'shopping') renderShopping();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function nutritionValue(recipe, key) {
  return recipe.nutrition?.[key] ?? recipe[key] ?? null;
}

function card(recipe) {
  const selected = favorites.includes(recipe.id);
  const protein = nutritionValue(recipe, 'protein');
  const carbs = nutritionValue(recipe, 'carbs');
  return `<article class="card">
    <div class="card-top">
      <span class="emoji">${recipe.emoji || '📖'}</span>
      <button class="heart ${selected ? 'on' : ''}" data-favorite="${escapeHtml(recipe.id)}" aria-label="Favorite">${selected ? '♥' : '♡'}</button>
    </div>
    <div class="card-body">
      <span class="category">${escapeHtml(recipe.region)} · ${escapeHtml(recipe.category)}</span>
      <h3>${escapeHtml(recipe.name)}</h3>
      <p class="description">${escapeHtml(recipe.description || '')}</p>
      <div class="tags">${(recipe.tags || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div>
      <div class="meta"><span>${escapeHtml(recipe.meal)}</span><span>${protein ? `${protein} g protein` : ''}${protein && carbs ? ' · ' : ''}${carbs ? `${carbs} g carbs` : ''}</span></div>
      <button class="primary" data-open="${escapeHtml(recipe.id)}">View Recipe</button>
    </div>
  </article>`;
}

function renderRecipes() {
  const q = $('#search').value.trim().toLowerCase();
  const category = $('#category').value;
  const meal = $('#meal').value;
  const region = $('#region').value;
  const protein = $('#protein').value;
  const list = allRecipes().filter((recipe) =>
    (category === 'all' || recipe.category === category) &&
    (meal === 'all' || recipe.meal === meal) &&
    (region === 'all' || recipe.region === region) &&
    (protein === 'all' || recipe.proteinType === protein) &&
    (!q || searchableText(recipe).includes(q))
  );
  $('#recipeGrid').innerHTML = list.length ? list.map(card).join('') : '<div class="empty">No recipes match those filters.</div>';
  $('#recipeCount').textContent = allRecipes().length;
}

function searchableText(recipe) {
  return [
    recipe.name, recipe.description, recipe.category, recipe.meal, recipe.region, recipe.proteinType,
    ...(recipe.tags || []), ...(recipe.ingredients || []).map(ingredientToText)
  ].join(' ').toLowerCase();
}

function renderFavorites() {
  const list = allRecipes().filter((recipe) => favorites.includes(recipe.id));
  $('#favoriteGrid').innerHTML = list.length ? list.map(card).join('') : '<div class="empty">You have not selected any favorites yet.</div>';
}

function fillFilter(id, values, label) {
  $(id).innerHTML = `<option value="all">All ${label}</option>` + values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('');
}

function populateCategories() {
  const recipes = allRecipes();
  fillFilter('#category', [...new Set(recipes.map((r) => r.category).filter(Boolean))].sort(), 'dish types');
  fillFilter('#meal', [...new Set(recipes.map((r) => r.meal).filter(Boolean))].sort(), 'meals');
  fillFilter('#region', [...new Set(recipes.map((r) => r.region).filter(Boolean))].sort(), 'regions');
  fillFilter('#protein', [...new Set(recipes.map((r) => r.proteinType).filter(Boolean))].sort(), 'proteins');
}

function toggleFavorite(id) {
  favorites = favorites.includes(id) ? favorites.filter((x) => x !== id) : [...favorites, id];
  save();
  renderRecipes();
  renderFavorites();
}

function niceQuantity(number) {
  if (!Number.isFinite(number)) return '';
  const whole = Math.floor(number + 1e-8);
  const fraction = number - whole;
  const fractions = [[0.125, '1/8'], [0.25, '1/4'], [1 / 3, '1/3'], [0.375, '3/8'], [0.5, '1/2'], [0.625, '5/8'], [2 / 3, '2/3'], [0.75, '3/4'], [0.875, '7/8']];
  const best = fractions.reduce((a, b) => Math.abs(b[0] - fraction) < Math.abs(a[0] - fraction) ? b : a, [0, '']);
  if (Math.abs(best[0] - fraction) > 0.035) return String(Math.round(number * 100) / 100);
  if (whole && best[1]) return `${whole} ${best[1]}`;
  if (whole) return String(whole);
  return best[1] || String(Math.round(number * 100) / 100);
}

function ingredientToText(ingredient, factor = 1) {
  if (typeof ingredient === 'string') return ingredient;
  if (!ingredient || ingredient.quantity == null) return ingredient?.raw || ingredient?.item || '';
  const quantity = niceQuantity(Number(ingredient.quantity) * factor);
  return [quantity, ingredient.unit, ingredient.item].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

function openRecipe(id) {
  const recipe = allRecipes().find((item) => item.id === id);
  if (!recipe) return;
  let currentServings = recipe.servings;
  const factor = () => currentServings / recipe.servings;
  const renderIngredients = () => recipe.ingredients.map((ingredient) => `<li>${escapeHtml(ingredientToText(ingredient, factor()))}</li>`).join('');
  const calories = nutritionValue(recipe, 'calories');
  const protein = nutritionValue(recipe, 'protein');
  const carbs = nutritionValue(recipe, 'carbs');

  $('#modalContent').innerHTML = `<div class="modal">
    <div class="modal-head"><div>
      <span class="category">${escapeHtml(recipe.region)} · ${escapeHtml(recipe.category)}</span>
      <h2>${escapeHtml(recipe.name)}</h2>
      <p class="description">${escapeHtml(recipe.description || '')}</p>
      <div class="tags">${[recipe.meal, recipe.proteinType, ...(recipe.tags || [])].filter(Boolean).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div>
      <p class="description"><strong>Approx. per serving:</strong> ${calories ?? '—'} calories · ${protein ?? '—'} g protein · ${carbs ?? '—'} g carbohydrates</p>
    </div><button class="close" id="closeModal">×</button></div>
    <div class="servings"><strong>Servings:</strong><input id="servingNumber" type="number" min="1" step="1" value="${recipe.servings}"><span id="servingHelp">Amounts shown for ${recipe.servings} serving${recipe.servings === 1 ? '' : 's'}.</span></div>
    <div class="modal-columns"><div><h3>Ingredients</h3><ul id="ingredientList">${renderIngredients()}</ul></div><div><h3>Instructions</h3><ol>${recipe.instructions.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}</ol></div></div>
    <div class="modal-actions"><button class="primary" id="addIngredients">Add Adjusted Ingredients to Shopping List</button><button class="secondary" id="modalFavorite">${favorites.includes(recipe.id) ? 'Remove from Favorites' : 'Add to Favorites'}</button></div>
    <label class="note">Personal notes<textarea id="recipeNote" placeholder="Add substitutions, timing notes, or changes you liked.">${escapeHtml(notes[recipe.id] || '')}</textarea></label>
  </div>`;

  const dialog = $('#recipeDialog');
  dialog.showModal();
  $('#closeModal').onclick = () => dialog.close();
  $('#servingNumber').oninput = (event) => {
    const servings = Math.max(1, Number(event.target.value) || recipe.servings);
    currentServings = servings;
    $('#ingredientList').innerHTML = renderIngredients();
    $('#servingHelp').textContent = `Amounts updated for ${servings} serving${servings === 1 ? '' : 's'}.`;
  };
  $('#addIngredients').onclick = () => {
    recipe.ingredients.forEach((ingredient) => shopping.push({
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
      text: ingredientToText(ingredient, factor()), done: false
    }));
    save();
    alert(`Ingredients for ${currentServings} serving${currentServings === 1 ? '' : 's'} added to your shopping list.`);
  };
  $('#modalFavorite').onclick = () => { toggleFavorite(recipe.id); dialog.close(); };
  $('#recipeNote').oninput = (event) => { notes[recipe.id] = event.target.value; save(); };
}

function renderShopping() {
  $('#shoppingItems').innerHTML = shopping.length ? shopping.map((item) => `<label class="shopping-row ${item.done ? 'done' : ''}"><input type="checkbox" data-check="${escapeHtml(item.id)}" ${item.done ? 'checked' : ''}><span>${escapeHtml(item.text)}</span></label>`).join('') : '<div class="empty">Your shopping list is empty.</div>';
}

function normalizeCustomIngredient(text) {
  return { quantity: null, unit: '', item: text, raw: text };
}

function bindEvents() {
  $$('.tab').forEach((button) => button.addEventListener('click', () => switchView(button.dataset.view)));
  document.addEventListener('click', (event) => {
    const favorite = event.target.closest('[data-favorite]');
    if (favorite) { toggleFavorite(favorite.dataset.favorite); return; }
    const open = event.target.closest('[data-open]');
    if (open) openRecipe(open.dataset.open);
  });
  $('#search').addEventListener('input', renderRecipes);
  ['#category', '#meal', '#region', '#protein'].forEach((id) => $(id).addEventListener('change', renderRecipes));
  $('#shoppingItems').addEventListener('change', (event) => {
    if (!event.target.dataset.check) return;
    const item = shopping.find((entry) => entry.id === event.target.dataset.check);
    if (item) item.done = event.target.checked;
    save(); renderShopping();
  });
  $('#clearList').onclick = () => { if (confirm('Clear the entire shopping list?')) { shopping = []; save(); renderShopping(); } };
  $('#copyList').onclick = async () => {
    const text = shopping.map((item) => `${item.done ? '✓' : '•'} ${item.text}`).join('\n');
    if (!text) { alert('The shopping list is empty.'); return; }
    try { await navigator.clipboard.writeText(text); alert('Shopping list copied.'); }
    catch { prompt('Copy your shopping list:', text); }
  };
  $('#recipeForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const form = new FormData(event.target);
    const name = String(form.get('name')).trim();
    custom.push({
      id: `custom-${Date.now()}`, name,
      category: String(form.get('category')).trim(), emoji: '📖',
      servings: Number(form.get('servings')) || 1,
      description: String(form.get('description')).trim(), meal: 'Other', region: 'Personal', proteinType: 'Any',
      tags: String(form.get('tags')).split(',').map((x) => x.trim()).filter(Boolean),
      ingredients: String(form.get('ingredients')).split('\n').map((x) => x.trim()).filter(Boolean).map(normalizeCustomIngredient),
      instructions: String(form.get('instructions')).split('\n').map((x) => x.trim()).filter(Boolean),
      nutrition: {
        calories: Number(form.get('calories')) || null,
        protein: Number(form.get('protein')) || null,
        carbs: Number(form.get('carbs')) || null,
        fat: null, fiber: null
      }
    });
    save(); populateCategories(); renderRecipes(); event.target.reset();
    $('#formMessage').textContent = `“${name}” was saved successfully.`;
    $('#formMessage').classList.add('show');
    setTimeout(() => switchView('recipes'), 700);
  });
  $('#recipeDialog').addEventListener('click', (event) => { if (event.target === $('#recipeDialog')) $('#recipeDialog').close(); });
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[character]));
}

async function initialize() {
  bindEvents();
  try {
    let data = Array.isArray(window.RECIPE_LIBRARY) ? window.RECIPE_LIBRARY : null;

    // When hosted, prefer the JSON database so it remains the canonical editable source.
    // When opened directly from a folder, browsers usually block fetch(file://...),
    // so recipes.js provides the same structured library as a reliable fallback.
    if (location.protocol !== 'file:') {
      try {
        const response = await fetch('data/recipes.json', { cache: 'no-store' });
        if (response.ok) data = await response.json();
      } catch (fetchError) {
        console.warn('Using embedded recipe fallback because JSON fetch failed.', fetchError);
      }
    }

    if (!Array.isArray(data)) throw new Error('Recipe library is not an array.');
    builtIns = data.filter((recipe) => recipe?.id && recipe?.name && Array.isArray(recipe.ingredients) && Array.isArray(recipe.instructions));
    if (!builtIns.length) throw new Error('No valid built-in recipes were found.');
  } catch (error) {
    console.error(error);
    $('#recipeGrid').innerHTML = '<div class="empty"><strong>The recipe library could not load.</strong><br>Please confirm that the data folder is beside index.html and contains recipes.js.</div>';
    $('#recipeCount').textContent = '0';
    return;
  }
  populateCategories();
  renderRecipes();
  renderFavorites();
  renderShopping();
}

initialize();
