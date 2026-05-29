// ── Page navigation ──

function showPage(name) {
  document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
}

// ── Toast ──

function showToast(message) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 2500);
}

// ── Home page ──

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
        <p>今天还没有记录<br>点击下方 + 开始记录</p>
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
        <div class="time">${formatTime(r.timestamp)} ${r.estimatedWeight ? r.estimatedWeight + 'g' : ''}</div>
      </div>
      <div class="cal">${r.calories.toFixed(1)}<span> kcal</span></div>
      <button class="delete-btn" data-delete="${r.id}">✕</button>
    </div>`
    )
    .join('');
}

// ── History page ──

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

// ── Weekly view ──

async function renderWeekly(weekOffset) {
  const container = document.getElementById('weekly-content');
  const today = new Date();
  const dayOfWeek = today.getDay() || 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - dayOfWeek + 1 + (weekOffset || 0) * 7);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  // Week label
  const weekNum = getWeekNumber(monday);
  const monStr = `${monday.getMonth() + 1}/${monday.getDate()}`;
  const sunStr = `${sunday.getMonth() + 1}/${sunday.getDate()}`;

  const days = [];
  const dayNames = ['一', '二', '三', '四', '五', '六', '日'];
  let weekTotalCal = 0, weekTotalProtein = 0, weekTotalFat = 0, weekTotalCarbs = 0;

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const records = await getRecordsByDate(dateStr);
    const cal = records.reduce((s, r) => s + r.calories, 0);
    const protein = records.reduce((s, r) => s + (r.protein || 0), 0);
    const fat = records.reduce((s, r) => s + (r.fat || 0), 0);
    const carbs = records.reduce((s, r) => s + (r.carbs || 0), 0);

    days.push({
      dateStr,
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      dayName: dayNames[i],
      isToday: dateStr === today.toISOString().slice(0, 10),
      cal, protein, fat, carbs
    });

    weekTotalCal += cal;
    weekTotalProtein += protein;
    weekTotalFat += fat;
    weekTotalCarbs += carbs;
  }

  const target = getSettings().dailyCalorieTarget;

  container.innerHTML = `
    <div class="week-nav">
      <button class="week-nav-btn" id="btn-week-prev">‹</button>
      <div class="week-label">
        <div>第${weekNum}周</div>
        <div class="week-range">${monStr} - ${sunStr}</div>
      </div>
      <button class="week-nav-btn" id="btn-week-next">›</button>
    </div>

    <div class="week-table">
      <div class="week-table-header">
        <div class="week-col-day">日期</div>
        <div class="week-col-cal">热量</div>
        <div class="week-col-macro">蛋白质</div>
        <div class="week-col-macro">脂肪</div>
        <div class="week-col-macro">碳水</div>
      </div>
      ${days.map((d) => `
        <div class="week-row ${d.isToday ? 'week-row-today' : ''}">
          <div class="week-col-day">
            <div class="week-day-label">${d.label}</div>
            <div class="week-day-name">周${d.dayName}</div>
          </div>
          <div class="week-col-cal">
            <div class="week-cal-value ${d.cal > target ? 'week-over' : ''}">${d.cal.toFixed(0)}</div>
            <div class="week-cal-bar">
              <div class="week-cal-fill" style="width:${Math.min(d.cal / target * 100, 100)}%"></div>
            </div>
          </div>
          <div class="week-col-macro">${d.protein.toFixed(0)}g</div>
          <div class="week-col-macro">${d.fat.toFixed(0)}g</div>
          <div class="week-col-macro">${d.carbs.toFixed(0)}g</div>
        </div>
      `).join('')}
    </div>

    <div class="week-summary">
      <div class="week-summary-title">本周汇总</div>
      <div class="week-summary-grid">
        <div class="week-summary-item">
          <div class="week-summary-value">${weekTotalCal.toFixed(0)}</div>
          <div class="week-summary-label">总热量 kcal</div>
        </div>
        <div class="week-summary-item">
          <div class="week-summary-value">${(weekTotalCal / 7).toFixed(0)}</div>
          <div class="week-summary-label">日均热量 kcal</div>
        </div>
        <div class="week-summary-item">
          <div class="week-summary-value">${(weekTotalProtein / 7).toFixed(0)}</div>
          <div class="week-summary-label">日均蛋白 g</div>
        </div>
        <div class="week-summary-item">
          <div class="week-summary-value">${(weekTotalFat / 7).toFixed(0)}</div>
          <div class="week-summary-label">日均脂肪 g</div>
        </div>
        <div class="week-summary-item">
          <div class="week-summary-value">${(weekTotalCarbs / 7).toFixed(0)}</div>
          <div class="week-summary-label">日均碳水 g</div>
        </div>
      </div>
    </div>
  `;

  // Store week offset for navigation
  container.dataset.weekOffset = weekOffset || 0;
}

function getWeekNumber(d) {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

// ── Record intake page ──

function renderRecordFoodDB(foods) {
  const container = document.getElementById('record-content');
  document.getElementById('record-title').textContent = '从食物库记录';

  if (foods.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">📦</div>
        <p>食物库为空<br>请先在设置中管理食物库</p>
      </div>
      <button class="btn btn-secondary" id="btn-goto-foods">去添加食物</button>
    `;
    return;
  }

  const options = foods.map((f) =>
    `<option value="${f.id}">${escHtml(f.name)} (${f.caloriesPer100g}kcal/100g)</option>`
  ).join('');

  container.innerHTML = `
    <div class="form-group">
      <label>选择食物</label>
      <select id="select-food">${options}</select>
    </div>
    <div id="food-nutrition-ref" class="nutrition-ref"></div>
    <div class="form-group">
      <label>重量 (g)</label>
      <input type="number" id="input-weight" min="1" step="0.1" placeholder="输入克数" value="100">
    </div>
    <div class="calc-result" id="calc-result"></div>
    <div class="form-group">
      <label>食物名称（可修改）</label>
      <input type="text" id="edit-name" placeholder="食物名称">
    </div>
    <button class="btn btn-primary" id="btn-confirm-food">确认保存</button>
  `;

  // Wire up food selection
  const select = document.getElementById('select-food');
  const weightInput = document.getElementById('input-weight');

  function updateCalc() {
    const foodId = select.value;
    const food = foods.find((f) => f.id === foodId);
    if (!food) return;

    document.getElementById('edit-name').value = food.name;

    document.getElementById('food-nutrition-ref').innerHTML = `
      <div class="nutrition-ref-title">每 100g 营养参考</div>
      <div class="nutrition-ref-grid">
        <span>热量: ${food.caloriesPer100g} kcal</span>
        <span>蛋白质: ${food.proteinPer100g} g</span>
        <span>脂肪: ${food.fatPer100g} g</span>
        <span>碳水: ${food.carbsPer100g} g</span>
      </div>
    `;

    const weight = parseFloat(weightInput.value) || 0;
    const ratio = weight / 100;

    document.getElementById('calc-result').innerHTML = `
      <div class="calc-result-title">计算结果（${weight}g）</div>
      <div class="calc-result-grid">
        <div class="calc-item"><span class="calc-val">${(food.caloriesPer100g * ratio).toFixed(1)}</span> kcal</div>
        <div class="calc-item"><span class="calc-val">${(food.proteinPer100g * ratio).toFixed(1)}</span> g 蛋白质</div>
        <div class="calc-item"><span class="calc-val">${(food.fatPer100g * ratio).toFixed(1)}</span> g 脂肪</div>
        <div class="calc-item"><span class="calc-val">${(food.carbsPer100g * ratio).toFixed(1)}</span> g 碳水</div>
      </div>
    `;
  }

  select.addEventListener('change', updateCalc);
  weightInput.addEventListener('input', updateCalc);
  updateCalc();
}

function renderRecordTemplate(templates) {
  const container = document.getElementById('record-content');
  document.getElementById('record-title').textContent = '从模板记录';

  if (templates.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">📋</div>
        <p>暂无餐食模板<br>可在手动输入时保存模板</p>
      </div>
      <button class="btn btn-secondary" id="btn-goto-templates">去管理模板</button>
    `;
    return;
  }

  container.innerHTML = `
    <div class="template-list">
      ${templates.map((t) => `
        <div class="template-item" data-id="${t.id}">
          <div class="template-info">
            <div class="template-name">${escHtml(t.name)}</div>
            <div class="template-detail">${t.calories}kcal | 蛋白${t.protein}g 脂肪${t.fat}g 碳水${t.carbs}g</div>
          </div>
          <button class="btn btn-sm btn-primary template-select-btn" data-id="${t.id}">选择</button>
        </div>
      `).join('')}
    </div>
  `;
}

function renderRecordManual() {
  const container = document.getElementById('record-content');
  document.getElementById('record-title').textContent = '手动输入';

  container.innerHTML = `
    <div class="form-group">
      <label>食物名称</label>
      <input type="text" id="edit-name" placeholder="如：米饭、鸡胸肉">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>重量 (g)</label>
        <input type="number" id="edit-weight" min="0" step="0.1" placeholder="0">
      </div>
      <div class="form-group">
        <label>热量 (kcal)</label>
        <input type="number" id="edit-calories" min="0" step="0.1" placeholder="0">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>蛋白质 (g)</label>
        <input type="number" id="edit-protein" min="0" step="0.1" placeholder="0">
      </div>
      <div class="form-group">
        <label>脂肪 (g)</label>
        <input type="number" id="edit-fat" min="0" step="0.1" placeholder="0">
      </div>
      <div class="form-group">
        <label>碳水 (g)</label>
        <input type="number" id="edit-carbs" min="0" step="0.1" placeholder="0">
      </div>
    </div>
    <button class="btn btn-primary" id="btn-confirm-manual">确认保存</button>
    <button class="btn btn-secondary" id="btn-save-as-template">保存为餐食模板</button>
  `;
}

// ── Food database page ──

function renderFoodsPage(foods) {
  const container = document.getElementById('foods-content');

  if (foods.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">📦</div>
        <p>食物库为空</p>
      </div>
      <button class="btn btn-primary" id="btn-add-food">添加食物</button>
      <div id="food-form-area"></div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="food-list-db">
      ${foods.map((f) => `
        <div class="food-db-item">
          <div class="food-db-info">
            <div class="food-db-name">${escHtml(f.name)}</div>
            <div class="food-db-nutrition">
              每100g: ${f.caloriesPer100g}kcal | 蛋白${f.proteinPer100g}g | 脂肪${f.fatPer100g}g | 碳水${f.carbsPer100g}g
            </div>
          </div>
          <div class="food-db-actions">
            <button class="btn btn-sm btn-secondary edit-food-btn" data-id="${f.id}">编辑</button>
            <button class="btn btn-sm btn-danger delete-food-btn" data-id="${f.id}">删除</button>
          </div>
        </div>
      `).join('')}
    </div>
    <button class="btn btn-primary" id="btn-add-food" style="margin-top:16px;">添加食物</button>
    <div id="food-form-area"></div>
  `;
}

function renderFoodForm(food) {
  const isEdit = !!food;
  const area = document.getElementById('food-form-area');
  area.innerHTML = `
    <div class="food-form" style="margin-top:16px; background:var(--card); border-radius:var(--radius); padding:16px;">
      <h3 style="margin-bottom:12px;">${isEdit ? '编辑食物' : '添加食物'}</h3>
      <div class="form-group">
        <label>食物名称</label>
        <input type="text" id="food-form-name" value="${isEdit ? escHtml(food.name) : ''}" placeholder="如：米饭">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>热量/100g (kcal)</label>
          <input type="number" id="food-form-cal" value="${isEdit ? food.caloriesPer100g : ''}" min="0" step="0.1" placeholder="0">
        </div>
        <div class="form-group">
          <label>蛋白质/100g (g)</label>
          <input type="number" id="food-form-protein" value="${isEdit ? food.proteinPer100g : ''}" min="0" step="0.1" placeholder="0">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>脂肪/100g (g)</label>
          <input type="number" id="food-form-fat" value="${isEdit ? food.fatPer100g : ''}" min="0" step="0.1" placeholder="0">
        </div>
        <div class="form-group">
          <label>碳水/100g (g)</label>
          <input type="number" id="food-form-carbs" value="${isEdit ? food.carbsPer100g : ''}" min="0" step="0.1" placeholder="0">
        </div>
      </div>
      <button class="btn btn-primary" id="btn-save-food">${isEdit ? '保存修改' : '添加'}</button>
      <button class="btn btn-secondary" id="btn-cancel-food-form">取消</button>
    </div>
  `;
}

// ── Meal templates page ──

function renderTemplatesPage(templates) {
  const container = document.getElementById('templates-content');

  if (templates.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">📋</div>
        <p>暂无餐食模板</p>
      </div>
      <button class="btn btn-primary" id="btn-add-template">添加模板</button>
      <div id="template-form-area"></div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="template-list-db">
      ${templates.map((t) => `
        <div class="food-db-item">
          <div class="food-db-info">
            <div class="food-db-name">${escHtml(t.name)}</div>
            <div class="food-db-nutrition">
              ${t.calories}kcal | 蛋白${t.protein}g | 脂肪${t.fat}g | 碳水${t.carbs}g
            </div>
          </div>
          <button class="btn btn-sm btn-danger delete-template-btn" data-id="${t.id}">删除</button>
        </div>
      `).join('')}
    </div>
    <button class="btn btn-primary" id="btn-add-template" style="margin-top:16px;">添加模板</button>
    <div id="template-form-area"></div>
  `;
}

function renderTemplateForm() {
  const area = document.getElementById('template-form-area');
  area.innerHTML = `
    <div class="food-form" style="margin-top:16px; background:var(--card); border-radius:var(--radius); padding:16px;">
      <h3 style="margin-bottom:12px;">添加餐食模板</h3>
      <div class="form-group">
        <label>模板名称</label>
        <input type="text" id="template-form-name" placeholder="如：我的午餐">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>热量 (kcal)</label>
          <input type="number" id="template-form-cal" min="0" step="0.1" placeholder="0">
        </div>
        <div class="form-group">
          <label>蛋白质 (g)</label>
          <input type="number" id="template-form-protein" min="0" step="0.1" placeholder="0">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>脂肪 (g)</label>
          <input type="number" id="template-form-fat" min="0" step="0.1" placeholder="0">
        </div>
        <div class="form-group">
          <label>碳水 (g)</label>
          <input type="number" id="template-form-carbs" min="0" step="0.1" placeholder="0">
        </div>
      </div>
      <button class="btn btn-primary" id="btn-save-template">添加</button>
      <button class="btn btn-secondary" id="btn-cancel-template-form">取消</button>
    </div>
  `;
}

// ── Settings page ──

function renderSettings() {
  const settings = getSettings();
  document.getElementById('settings-content').innerHTML = `
    <div class="settings-section">
      <h3>每日目标</h3>
      <div class="form-group">
        <label>每日热量目标 (kcal)</label>
        <input type="number" id="input-target" value="${settings.dailyCalorieTarget}"
          placeholder="2000" min="500" max="10000">
      </div>
    </div>

    <button class="btn btn-primary" id="btn-save-settings">保存设置</button>

    <div class="settings-section" style="margin-top:16px;">
      <h3>数据管理</h3>
      <button class="btn btn-secondary" id="btn-manage-foods">管理食物库</button>
      <button class="btn btn-secondary" id="btn-manage-templates" style="margin-top:8px;">管理餐食模板</button>
      <button class="btn btn-secondary" id="btn-export" style="margin-top:8px;">导出数据备份</button>
      <button class="btn btn-secondary" id="btn-import-trigger" style="margin-top:8px;">导入数据恢复</button>
      <input type="file" id="input-import" accept=".json" style="display:none">
    </div>

    <p style="text-align:center;margin-top:16px;font-size:12px;color:var(--text-secondary);">
      数据仅存储在手机本地，不会上传
    </p>
  `;
}

// ── Helpers ──

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
    const defaults = { dailyCalorieTarget: 2000 };
    return Object.assign(defaults, JSON.parse(localStorage.getItem('calorie-tracker-settings')) || {});
  } catch {
    return { dailyCalorieTarget: 2000 };
  }
}

function saveSettings(settings) {
  localStorage.setItem('calorie-tracker-settings', JSON.stringify(settings));
}
