// Page navigation
function showPage(name) {
  document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
}

// Loading overlay
function showLoading(text) {
  document.getElementById('loading-text').textContent = text || '加载中...';
  document.getElementById('loading-overlay').classList.remove('hidden');
}

function hideLoading() {
  document.getElementById('loading-overlay').classList.add('hidden');
}

// Toast
function showToast(message) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 2500);
}

// Home page
function renderHome(records) {
  const target = getSettings().dailyCalorieTarget;
  const consumed = getTotalCalories(records);

  renderCalorieRing(consumed, target);
  renderMacros(records);
  renderFoodList(records);
}

function renderCalorieRing(consumed, target) {
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(consumed / target, 1);
  const offset = circumference * (1 - pct);
  const remaining = Math.max(target - consumed, 0);

  const color = pct >= 1 ? '#F44336' : '#4CAF50';

  document.getElementById('ring-container').innerHTML = `
    <div class="ring-wrapper">
      <svg class="ring-svg" width="180" height="180" viewBox="0 0 180 180">
        <circle class="ring-bg" cx="90" cy="90" r="${radius}"/>
        <circle class="ring-progress" cx="90" cy="90" r="${radius}"
          stroke="${color}"
          stroke-dasharray="${circumference}"
          stroke-dashoffset="${offset}"/>
      </svg>
      <div class="ring-text">
        <div class="calories">${consumed.toFixed(1)}</div>
        <div class="label">/ ${target} kcal</div>
        <div class="remaining">${remaining > 0 ? '剩余 ' + remaining + ' kcal' : '已超出 ' + Math.abs(remaining) + ' kcal'}</div>
      </div>
    </div>
  `;
}

function renderMacros(records) {
  const protein = records.reduce((s, r) => s + (r.protein || 0), 0);
  const fat = records.reduce((s, r) => s + (r.fat || 0), 0);
  const carbs = records.reduce((s, r) => s + (r.carbs || 0), 0);

  document.getElementById('macros').innerHTML = `
    <div class="macro-item">
      <div class="value">${protein.toFixed(1)}</div>
      <div class="unit">g</div>
      <div class="m-label">蛋白质</div>
    </div>
    <div class="macro-item">
      <div class="value">${fat.toFixed(1)}</div>
      <div class="unit">g</div>
      <div class="m-label">脂肪</div>
    </div>
    <div class="macro-item">
      <div class="value">${carbs.toFixed(1)}</div>
      <div class="unit">g</div>
      <div class="m-label">碳水</div>
    </div>
  `;
}

function renderFoodList(records) {
  const container = document.getElementById('food-list');

  if (records.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">🍽</div>
        <p>今天还没有记录<br>点击下方 + 开始拍照记录</p>
      </div>
    `;
    return;
  }

  container.innerHTML = records
    .map(
      (r) => `
    <div class="food-entry" data-id="${r.id}">
      <div class="info">
        <div class="name">${escHtml(r.foodName)}</div>
        <div class="time">${formatTime(r.timestamp)}</div>
      </div>
      <div class="cal">${r.calories.toFixed(1)}<span> kcal</span></div>
      <button class="delete-btn" data-delete="${r.id}">✕</button>
    </div>`
    )
    .join('');
}

// History page
async function renderHistory() {
  const container = document.getElementById('history-content');
  const dates = await getAllDates();

  if (dates.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">📋</div>
        <p>暂无记录</p>
      </div>`;
    return;
  }

  let html = '';
  for (const dateStr of dates) {
    const records = await getRecordsByDate(dateStr);
    const total = getTotalCalories(records);

    html += `
      <div class="history-day">
        <div class="history-date">
          <span>${formatDate(dateStr)}</span>
          <span class="total">${total} kcal</span>
        </div>
        ${records
          .map(
            (r) => `
          <div class="food-entry">
            <div class="info">
              <div class="name">${escHtml(r.foodName)}</div>
              <div class="time">${formatTime(r.timestamp)}</div>
            </div>
            <div class="cal">${r.calories.toFixed(1)}<span> kcal</span></div>
          </div>`
          )
          .join('')}
      </div>`;
  }
  container.innerHTML = html;
}

// Settings page
function renderSettings() {
  const settings = getSettings();
  document.getElementById('settings-content').innerHTML = `
    <div class="settings-section">
      <h3>豆包 API 配置</h3>
      <div class="form-group">
        <label>API Key</label>
        <input type="password" id="input-apikey" value="${escHtml(settings.apiKey)}"
          placeholder="输入火山引擎豆包 API Key">
      </div>
      <div class="form-group">
        <label>模型名称（或接入点 ID）</label>
        <input type="text" id="input-model" value="${escHtml(settings.modelName)}"
          placeholder="doubao-seed-2-0-mini-260215">
      </div>
      <p style="font-size:12px;color:var(--text-secondary);margin-top:4px;">
        在 <a href="https://console.volcengine.com/ark" target="_blank">火山引擎控制台</a> 获取 API Key，
        需开通豆包视觉模型。也可填入接入点 ID（ep-xxx）。
      </p>
    </div>

    <div class="settings-section">
      <h3>每日目标</h3>
      <div class="form-group">
        <label>每日热量目标 (kcal)</label>
        <input type="number" id="input-target" value="${settings.dailyCalorieTarget}"
          placeholder="2000" min="500" max="10000">
      </div>
    </div>

    <button class="btn btn-primary" id="btn-save-settings">保存设置</button>
    <button class="btn btn-secondary" id="btn-export">导出数据备份</button>
    <button class="btn btn-secondary" id="btn-import-trigger" style="margin-top:4px;">导入数据恢复</button>
    <input type="file" id="input-import" accept=".json" style="display:none">

    <p style="text-align:center;margin-top:16px;font-size:12px;color:var(--text-secondary);">
      数据仅存储在手机本地，不会上传
    </p>
  `;
}

// Result page
function renderResult(imageDataUrl, aiResult) {
  const imgEl = document.getElementById('result-image');
  if (imageDataUrl) {
    imgEl.src = imageDataUrl;
    imgEl.style.display = '';
  } else {
    imgEl.style.display = 'none';
  }

  const isManual = !imageDataUrl;
  const weight = aiResult.estimatedWeight || 0;
  const retakeLabel = isManual ? '更换为拍照识别' : '重新拍照';

  document.getElementById('result-form').innerHTML = `
    <div class="form-group">
      <label>食物名称</label>
      <input type="text" id="edit-name" value="${escHtml(aiResult.foodName)}" placeholder="如：米饭、鸡胸肉">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>重量 (g)</label>
        <input type="number" id="edit-weight" value="${weight || ''}" min="0" step="0.1" placeholder="0">
      </div>
      <div class="form-group">
        <label>热量 (kcal)</label>
        <input type="number" id="edit-calories" value="${aiResult.calories || ''}" min="0" step="0.1" placeholder="0">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>蛋白质 (g)</label>
        <input type="number" id="edit-protein" value="${aiResult.protein || ''}" min="0" step="0.1" placeholder="0">
      </div>
      <div class="form-group">
        <label>脂肪 (g)</label>
        <input type="number" id="edit-fat" value="${aiResult.fat || ''}" min="0" step="0.1" placeholder="0">
      </div>
      <div class="form-group">
        <label>碳水 (g)</label>
        <input type="number" id="edit-carbs" value="${aiResult.carbs || ''}" min="0" step="0.1" placeholder="0">
      </div>
    </div>
    <button class="btn btn-primary" id="btn-confirm">确认保存</button>
    <button class="btn btn-secondary" id="btn-retake">${retakeLabel}</button>
  `;
  document.getElementById('btn-retake').dataset.manual = isManual ? '1' : '';
}

// Helpers
function escHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatTime(iso) {
  const d = new Date(iso);
  return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);

  if (dateStr === today.toISOString().slice(0, 10)) return '今天';
  if (dateStr === yesterday.toISOString().slice(0, 10)) return '昨天';

  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function getSettings() {
  try {
    return JSON.parse(localStorage.getItem('calorie-tracker-settings')) || {
      apiKey: '',
      modelName: 'doubao-seed-2-0-mini-260215',
      dailyCalorieTarget: 2000
    };
  } catch {
    return { apiKey: '', modelName: 'doubao-seed-2-0-mini-260215', dailyCalorieTarget: 2000 };
  }
}

function saveSettings(settings) {
  localStorage.setItem('calorie-tracker-settings', JSON.stringify(settings));
}
