// App state
let currentImageDataUrl = null;

// Init
async function init() {
  registerSW();
  try {
    await refreshHome();
  } catch (err) {
    console.error('Failed to load home:', err);
    // Continue — renderHome will show empty state even if DB fails
    renderHome([]);
  }

  // Navigation events
  document.getElementById('btn-settings').addEventListener('click', () => {
    showPage('settings');
    renderSettings();
    bindSettingsEvents();
  });

  document.getElementById('btn-history-back').addEventListener('click', () => {
    showPage('home');
    refreshHome();
  });

  document.getElementById('btn-settings-back').addEventListener('click', () => {
    showPage('home');
    refreshHome();
  });

  // FAB add button
  document.getElementById('btn-capture').addEventListener('click', showAddChoice);

  // History link (long press or click on ring to see history)
  document.getElementById('ring-container').addEventListener('click', () => {
    showPage('history');
    renderHistory();
  });

  // Global click delegation
  document.addEventListener('click', handleGlobalClick);

  // Online/offline detection
  function updateOnlineStatus() {
    const banner = document.getElementById('offline-banner');
    if (navigator.onLine) {
      banner.classList.add('hidden');
    } else {
      banner.classList.remove('hidden');
    }
  }
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  updateOnlineStatus();

  // Check API key on init
  const settings = getSettings();
  if (!settings.apiKey) {
    setTimeout(() => {
      showPage('settings');
      renderSettings();
      bindSettingsEvents();
      showToast('请先配置豆包 API Key');
    }, 500);
  }
}

// Add choice: camera or manual
function showAddChoice() {
  const sheet = document.createElement('div');
  sheet.className = 'action-sheet';
  sheet.innerHTML = `
    <div class="action-sheet-mask"></div>
    <div class="action-sheet-panel">
      <button class="action-sheet-btn" id="choice-camera">拍照识别</button>
      <button class="action-sheet-btn" id="choice-manual">手动输入</button>
      <button class="action-sheet-cancel" id="choice-cancel">取消</button>
    </div>
  `;
  document.body.appendChild(sheet);

  sheet.querySelector('#choice-camera').onclick = () => {
    sheet.remove();
    startCaptureFlow();
  };
  sheet.querySelector('#choice-manual').onclick = () => {
    sheet.remove();
    startManualFlow();
  };
  sheet.querySelector('#choice-cancel').onclick = () => sheet.remove();
  sheet.querySelector('.action-sheet-mask').onclick = () => sheet.remove();
}

function startManualFlow() {
  currentImageDataUrl = null;
  showPage('result');
  renderResult(null, {
    foodName: '',
    estimatedWeight: 0,
    calories: 0,
    protein: 0,
    fat: 0,
    carbs: 0
  });
  bindResultEvents();
}

// Capture flow
async function startCaptureFlow() {
  try {
    currentImageDataUrl = await captureFood();
    const settings = getSettings();

    if (!settings.apiKey) {
      showToast('请先在设置中配置豆包 API Key');
      return;
    }

    showPage('result');
    showLoading('AI 正在识别食物...');

    const result = await analyzeFood(currentImageDataUrl, settings.apiKey, settings.modelName);
    hideLoading();
    renderResult(currentImageDataUrl, result);
    bindResultEvents();
  } catch (err) {
    hideLoading();
    if (err.message === 'Camera cancelled') return;
    console.error(err);
    showToast('识别失败: ' + (err.message || '未知错误'));
    showPage('home');
    refreshHome();
  }
}

// Confirm save
async function confirmSave() {
  const foodName = document.getElementById('edit-name').value.trim();
  const estimatedWeight = parseFloat(document.getElementById('edit-weight').value) || 0;
  const calories = parseFloat(document.getElementById('edit-calories').value) || 0;
  const protein = parseFloat(document.getElementById('edit-protein').value) || 0;
  const fat = parseFloat(document.getElementById('edit-fat').value) || 0;
  const carbs = parseFloat(document.getElementById('edit-carbs').value) || 0;

  if (!foodName) {
    showToast('请输入食物名称');
    return;
  }

  if (calories <= 0) {
    showToast('请输入有效热量');
    return;
  }

  const record = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
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

// Event handlers
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

  // Retake / switch to camera
  if (e.target.id === 'btn-retake') {
    startCaptureFlow();
    return;
  }

  // Close result page
  if (e.target.id === 'btn-result-close') {
    showPage('home');
    refreshHome();
    return;
  }
}

function bindResultEvents() {
  const confirmBtn = document.getElementById('btn-confirm');
  if (confirmBtn) {
    confirmBtn.addEventListener('click', confirmSave);
  }
}

function bindSettingsEvents() {
  document.getElementById('btn-save-settings').addEventListener('click', () => {
    const apiKey = document.getElementById('input-apikey').value.trim();
    const modelName = document.getElementById('input-model').value.trim() || 'doubao-seed-2-0-mini-260215';
    const dailyCalorieTarget = parseInt(document.getElementById('input-target').value) || 2000;

    saveSettings({ apiKey, modelName, dailyCalorieTarget });
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
  const tx = db.transaction('records', 'readonly');
  const req = tx.objectStore('records').getAll();
  req.onsuccess = () => {
    const blob = new Blob([JSON.stringify(req.result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calorie-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('数据已导出');
  };
}

async function importData(e) {
  const file = e.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const records = JSON.parse(text);
    if (!Array.isArray(records)) throw new Error('Invalid format');

    const db = await openDB();
    const tx = db.transaction('records', 'readwrite');
    const store = tx.objectStore('records');
    for (const r of records) {
      store.put(r);
    }
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
    showToast(`已导入 ${records.length} 条记录`);
    refreshHome();
  } catch (err) {
    showToast('导入失败: 文件格式不正确');
  }
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

// Start
document.addEventListener('DOMContentLoaded', init);
