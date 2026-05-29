// ── State ──

let currentRecordMode = null; // 'food-db' | 'template' | 'manual'

// ── Init ──

async function init() {
  registerSW();
  try {
    await refreshHome();
  } catch (err) {
    console.error('Failed to load home:', err);
    renderHome([]);
  }

  // Navigation
  document.getElementById('btn-settings').addEventListener('click', () => {
    showPage('settings');
    renderSettings();
    bindSettingsEvents();
  });

  document.getElementById('btn-history-back').addEventListener('click', () => {
    showPage('home');
    refreshHome();
  });

  document.getElementById('btn-weekly-view').addEventListener('click', () => {
    showPage('weekly');
    renderWeekly(0);
    bindWeeklyEvents();
  });

  document.getElementById('btn-weekly-back').addEventListener('click', () => {
    showPage('history');
    renderHistory();
  });

  document.getElementById('btn-record-back').addEventListener('click', () => {
    showPage('home');
    refreshHome();
  });

  document.getElementById('btn-foods-back').addEventListener('click', goBackFromManagement);
  document.getElementById('btn-templates-back').addEventListener('click', goBackFromManagement);
  document.getElementById('btn-settings-back').addEventListener('click', () => {
    showPage('home');
    refreshHome();
  });

  // FAB
  document.getElementById('btn-capture').addEventListener('click', showRecordActionSheet);

  // Home ring click -> history
  document.getElementById('ring-container').addEventListener('click', () => {
    showPage('history');
    renderHistory();
  });

  // Global click delegation
  document.addEventListener('click', handleGlobalClick);
}

function goBackFromManagement() {
  showPage('settings');
  renderSettings();
  bindSettingsEvents();
}

// ── Action sheet for recording ──

function showRecordActionSheet() {
  const sheet = document.createElement('div');
  sheet.className = 'action-sheet';
  sheet.innerHTML = `
    <div class="action-sheet-mask"></div>
    <div class="action-sheet-panel">
      <button class="action-sheet-btn" id="choice-food-db">从食物库记录</button>
      <button class="action-sheet-btn" id="choice-template">从餐食模板记录</button>
      <button class="action-sheet-btn" id="choice-manual">手动快速输入</button>
      <button class="action-sheet-cancel" id="choice-cancel">取消</button>
    </div>
  `;
  document.body.appendChild(sheet);

  sheet.querySelector('#choice-food-db').onclick = () => {
    sheet.remove();
    startFoodDBFlow();
  };
  sheet.querySelector('#choice-template').onclick = () => {
    sheet.remove();
    startTemplateFlow();
  };
  sheet.querySelector('#choice-manual').onclick = () => {
    sheet.remove();
    startManualFlow();
  };
  sheet.querySelector('#choice-cancel').onclick = () => sheet.remove();
  sheet.querySelector('.action-sheet-mask').onclick = () => sheet.remove();
}

// ── Record flow: Food DB ──

async function startFoodDBFlow() {
  const foods = await getAllFoods();
  currentRecordMode = 'food-db';
  showPage('record');
  renderRecordFoodDB(foods);
}

// ── Record flow: Template ──

async function startTemplateFlow() {
  const templates = await getAllTemplates();
  currentRecordMode = 'template';
  showPage('record');
  renderRecordTemplate(templates);
}

// ── Record flow: Manual ──

function startManualFlow() {
  currentRecordMode = 'manual';
  showPage('record');
  renderRecordManual();
}

// ── Confirm: Food DB ──

async function confirmFoodDB() {
  const foodId = document.getElementById('select-food').value;
  const foods = await getAllFoods();
  const food = foods.find((f) => f.id === foodId);
  if (!food) { showToast('请选择食物'); return; }

  const weight = parseFloat(document.getElementById('input-weight').value) || 0;
  if (weight <= 0) { showToast('请输入有效重量'); return; }

  const name = document.getElementById('edit-name').value.trim() || food.name;
  const ratio = weight / 100;

  const record = {
    id: generateId(),
    foodName: name,
    estimatedWeight: weight,
    calories: parseFloat((food.caloriesPer100g * ratio).toFixed(1)),
    protein: parseFloat((food.proteinPer100g * ratio).toFixed(1)),
    fat: parseFloat((food.fatPer100g * ratio).toFixed(1)),
    carbs: parseFloat((food.carbsPer100g * ratio).toFixed(1)),
    timestamp: new Date().toISOString()
  };

  await addRecord(record);
  showToast(`已记录: ${name} ${record.calories} kcal`);
  showPage('home');
  refreshHome();
}

// ── Confirm: Template ──

async function confirmTemplate(templateId) {
  const templates = await getAllTemplates();
  const tpl = templates.find((t) => t.id === templateId);
  if (!tpl) { showToast('模板未找到'); return; }

  const record = {
    id: generateId(),
    foodName: tpl.name,
    estimatedWeight: 0,
    calories: tpl.calories,
    protein: tpl.protein,
    fat: tpl.fat,
    carbs: tpl.carbs,
    timestamp: new Date().toISOString()
  };

  await addRecord(record);
  showToast(`已记录: ${tpl.name} ${tpl.calories} kcal`);
  showPage('home');
  refreshHome();
}

// ── Confirm: Manual ──

async function confirmManual() {
  const foodName = document.getElementById('edit-name').value.trim();
  const estimatedWeight = parseFloat(document.getElementById('edit-weight').value) || 0;
  const calories = parseFloat(document.getElementById('edit-calories').value) || 0;
  const protein = parseFloat(document.getElementById('edit-protein').value) || 0;
  const fat = parseFloat(document.getElementById('edit-fat').value) || 0;
  const carbs = parseFloat(document.getElementById('edit-carbs').value) || 0;

  if (!foodName) { showToast('请输入食物名称'); return; }
  if (calories <= 0) { showToast('请输入有效热量'); return; }

  const record = {
    id: generateId(),
    foodName,
    estimatedWeight,
    calories,
    protein,
    fat,
    carbs,
    timestamp: new Date().toISOString()
  };

  await addRecord(record);
  showToast(`已记录: ${foodName} ${calories} kcal`);
  showPage('home');
  refreshHome();
}

// ── Save as template (from manual) ──

async function saveAsTemplate() {
  const foodName = document.getElementById('edit-name').value.trim();
  const calories = parseFloat(document.getElementById('edit-calories').value) || 0;
  const protein = parseFloat(document.getElementById('edit-protein').value) || 0;
  const fat = parseFloat(document.getElementById('edit-fat').value) || 0;
  const carbs = parseFloat(document.getElementById('edit-carbs').value) || 0;

  if (!foodName) { showToast('请输入食物名称'); return; }
  if (calories <= 0) { showToast('请输入有效热量'); return; }

  const template = {
    id: generateId(),
    name: foodName,
    calories,
    protein,
    fat,
    carbs
  };

  await addTemplate(template);
  showToast(`已保存模板: ${foodName}`);
}

// ── Global click delegation ──

function handleGlobalClick(e) {
  // Delete food entry
  const deleteBtn = e.target.closest('[data-delete]');
  if (deleteBtn) {
    const id = deleteBtn.dataset.delete;
    deleteRecord(id).then(() => {
      showToast('已删除');
      refreshHome();
    });
    return;
  }

  // Confirm food DB record
  if (e.target.id === 'btn-confirm-food') {
    confirmFoodDB();
    return;
  }

  // Confirm manual record
  if (e.target.id === 'btn-confirm-manual') {
    confirmManual();
    return;
  }

  // Save as template (from manual record)
  if (e.target.id === 'btn-save-as-template') {
    saveAsTemplate();
    return;
  }

  // Select template
  if (e.target.classList.contains('template-select-btn')) {
    confirmTemplate(e.target.dataset.id);
    return;
  }

  // Go to foods page from record page
  if (e.target.id === 'btn-goto-foods') {
    showPage('foods');
    loadFoodsPage();
    return;
  }

  // Go to templates page from record page
  if (e.target.id === 'btn-goto-templates') {
    showPage('templates');
    loadTemplatesPage();
    return;
  }

  // Food management
  if (e.target.id === 'btn-manage-foods') {
    showPage('foods');
    loadFoodsPage();
    return;
  }

  if (e.target.id === 'btn-manage-templates') {
    showPage('templates');
    loadTemplatesPage();
    return;
  }

  // Add food
  if (e.target.id === 'btn-add-food') {
    renderFoodForm(null);
    bindFoodFormEvents(null);
    return;
  }

  // Edit food
  if (e.target.classList.contains('edit-food-btn')) {
    loadFoodsPage().then((foods) => {
      const food = foods.find((f) => f.id === e.target.dataset.id);
      if (food) {
        renderFoodForm(food);
        bindFoodFormEvents(food);
      }
    });
    return;
  }

  // Delete food
  if (e.target.classList.contains('delete-food-btn')) {
    const id = e.target.dataset.id;
    deleteFood(id).then(() => {
      showToast('已删除');
      loadFoodsPage();
    });
    return;
  }

  // Add template
  if (e.target.id === 'btn-add-template') {
    renderTemplateForm();
    bindTemplateFormEvents();
    return;
  }

  // Delete template
  if (e.target.classList.contains('delete-template-btn')) {
    const id = e.target.dataset.id;
    deleteTemplate(id).then(() => {
      showToast('已删除');
      loadTemplatesPage();
    });
    return;
  }
}

// ── Food management ──

async function loadFoodsPage() {
  const foods = await getAllFoods();
  renderFoodsPage(foods);
  return foods;
}

function bindFoodFormEvents(food) {
  document.getElementById('btn-save-food').addEventListener('click', () => saveFoodForm(food));
  document.getElementById('btn-cancel-food-form').addEventListener('click', () => loadFoodsPage());
}

async function saveFoodForm(existingFood) {
  const name = document.getElementById('food-form-name').value.trim();
  const caloriesPer100g = parseFloat(document.getElementById('food-form-cal').value) || 0;
  const proteinPer100g = parseFloat(document.getElementById('food-form-protein').value) || 0;
  const fatPer100g = parseFloat(document.getElementById('food-form-fat').value) || 0;
  const carbsPer100g = parseFloat(document.getElementById('food-form-carbs').value) || 0;

  if (!name) { showToast('请输入食物名称'); return; }
  if (caloriesPer100g <= 0) { showToast('请输入有效热量'); return; }

  const food = {
    id: existingFood ? existingFood.id : generateId(),
    name,
    caloriesPer100g,
    proteinPer100g,
    fatPer100g,
    carbsPer100g,
    updatedAt: new Date().toISOString()
  };

  if (existingFood) {
    await updateFood(food);
  } else {
    await addFood(food);
  }
  showToast(existingFood ? '已更新' : '已添加');
  loadFoodsPage();
}

// ── Template management ──

async function loadTemplatesPage() {
  const templates = await getAllTemplates();
  renderTemplatesPage(templates);
}

function bindTemplateFormEvents() {
  document.getElementById('btn-save-template').addEventListener('click', saveTemplateForm);
  document.getElementById('btn-cancel-template-form').addEventListener('click', () => loadTemplatesPage());
}

async function saveTemplateForm() {
  const name = document.getElementById('template-form-name').value.trim();
  const calories = parseFloat(document.getElementById('template-form-cal').value) || 0;
  const protein = parseFloat(document.getElementById('template-form-protein').value) || 0;
  const fat = parseFloat(document.getElementById('template-form-fat').value) || 0;
  const carbs = parseFloat(document.getElementById('template-form-carbs').value) || 0;

  if (!name) { showToast('请输入模板名称'); return; }
  if (calories <= 0) { showToast('请输入有效热量'); return; }

  await addTemplate({
    id: generateId(),
    name,
    calories,
    protein,
    fat,
    carbs
  });
  showToast('模板已添加');
  loadTemplatesPage();
}

// ── Settings ──

function bindSettingsEvents() {
  document.getElementById('btn-save-settings').addEventListener('click', () => {
    const dailyCalorieTarget = parseInt(document.getElementById('input-target').value) || 2000;
    saveSettings({ dailyCalorieTarget });
    showToast('设置已保存');
    showPage('home');
    refreshHome();
  });

  document.getElementById('btn-export').addEventListener('click', exportData);
  document.getElementById('btn-import-trigger').addEventListener('click', () => {
    document.getElementById('input-import').click();
  });
  document.getElementById('input-import').addEventListener('change', importData);
}

async function exportData() {
  const db = await openDB();
  const stores = ['records', 'foods', 'mealTemplates'];
  const data = {};

  for (const name of stores) {
    if (db.objectStoreNames.contains(name)) {
      const tx = db.transaction(name, 'readonly');
      const req = tx.objectStore(name).getAll();
      data[name] = await new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve(req.result);
        tx.onerror = () => reject(tx.error);
      });
    }
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `calorie-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('数据已导出');
}

async function importData(e) {
  const file = e.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const data = JSON.parse(text);

    // Support both old format (array) and new format (object with stores)
    if (Array.isArray(data)) {
      // Old format: just records array
      const db = await openDB();
      const tx = db.transaction('records', 'readwrite');
      const store = tx.objectStore('records');
      for (const r of data) store.put(r);
      await new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onerror = reject; });
      showToast(`已导入 ${data.length} 条记录`);
    } else {
      // New format: { records: [...], foods: [...], mealTemplates: [...] }
      const db = await openDB();
      let count = 0;
      for (const [storeName, items] of Object.entries(data)) {
        if (!Array.isArray(items)) continue;
        if (!db.objectStoreNames.contains(storeName)) continue;
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        for (const item of items) store.put(item);
        await new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onerror = reject; });
        count += items.length;
      }
      showToast(`已导入 ${count} 条数据`);
    }
    refreshHome();
  } catch (err) {
    showToast('导入失败: 文件格式不正确');
  }
}

// ── Weekly view ──

function bindWeeklyEvents() {
  document.getElementById('btn-week-prev').addEventListener('click', () => {
    const offset = parseInt(document.getElementById('weekly-content').dataset.weekOffset || 0) - 1;
    renderWeekly(offset);
    bindWeeklyEvents();
  });

  document.getElementById('btn-week-next').addEventListener('click', () => {
    const offset = parseInt(document.getElementById('weekly-content').dataset.weekOffset || 0) + 1;
    renderWeekly(offset);
    bindWeeklyEvents();
  });
}

// ── Helpers ──

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

async function refreshHome() {
  const records = await getTodayRecords();
  renderHome(records);
}

function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

// ── Start ──

document.addEventListener('DOMContentLoaded', init);
