// ---- Constants ----

const EXERCISE_TYPES = [
  { value: 'ランニング',   emoji: '🏃' },
  { value: 'ウォーキング', emoji: '🚶' },
  { value: 'サイクリング', emoji: '🚴' },
  { value: '水泳',         emoji: '🏊' },
  { value: '筋トレ',       emoji: '💪' },
  { value: 'ヨガ',         emoji: '🧘' },
  { value: 'その他',       emoji: '⚡' },
];
const EXERCISE_EMOJI = Object.fromEntries(EXERCISE_TYPES.map(t => [t.value, t.emoji]));

const SYMPTOMS = ['頭痛', '倦怠感', '腹痛', '発熱', '肩こり', '鼻づまり', '不眠'];

// ---- State ----
let currentPage  = 'dashboard';
let statsTab     = 'exercise';
let statsPeriod  = '7';
let activeCharts = {};

// ---- Navigation ----

function navigate(page) {
  currentPage = page;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`page-${page}`).classList.add('active');
  document.querySelector(`[data-page="${page}"]`).classList.add('active');

  const titles = { dashboard: 'ダッシュボード', exercise: '運動記録', health: '体調記録', stats: '統計' };
  document.getElementById('page-title').textContent = titles[page];

  renderPage(page);
}

function renderPage(page) {
  switch (page) {
    case 'dashboard': renderDashboard(); break;
    case 'exercise':  renderExercise();  break;
    case 'health':    renderHealth();    break;
    case 'stats':     renderStats();     break;
  }
}

// ---- Dashboard ----

function renderDashboard() {
  const todayStr  = today();
  const exercises = getExercises();
  const healthRec = getHealthByDate(todayStr);
  const todayEx   = exercises.filter(e => e.date === todayStr);
  const last7     = getDaysRange(7);

  const totalMin  = todayEx.reduce((s, e) => s + Number(e.duration || 0), 0);
  const totalKm   = todayEx.reduce((s, e) => s + Number(e.distance || 0), 0);

  const d = new Date();
  const weekday = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
  const dateLabel = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${weekday}）`;

  document.getElementById('page-dashboard').innerHTML = `
    <div class="greeting">
      <h2>${getGreeting()}</h2>
      <p>${dateLabel}</p>
    </div>

    <div class="summary-row">
      <div class="summary-card green">
        <span class="summary-icon">🏃</span>
        <span class="summary-value">${totalMin > 0 ? totalMin : '—'}</span>
        <span class="summary-unit">${totalMin > 0 ? '分' : ''}</span>
        <div class="summary-label">今日の運動</div>
      </div>
      <div class="summary-card pink">
        <span class="summary-icon" style="font-size:22px">${healthRec?.mood ? moodEmoji(healthRec.mood) : '—'}</span>
        <span class="summary-value" style="font-size:13px;margin-top:2px">${healthRec?.mood ? moodLabel(healthRec.mood) : '未記録'}</span>
        <span class="summary-unit"></span>
        <div class="summary-label">今日の気分</div>
      </div>
      <div class="summary-card blue">
        <span class="summary-icon">⚖️</span>
        <span class="summary-value">${healthRec?.weight || '—'}</span>
        <span class="summary-unit">${healthRec?.weight ? 'kg' : ''}</span>
        <div class="summary-label">体重</div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">📈 直近7日間の運動時間（分）</div>
      <div class="chart-container"><canvas id="dash-ex-chart"></canvas></div>
    </div>

    <div class="card">
      <div class="card-title">😊 直近7日間の気分</div>
      <div class="chart-container"><canvas id="dash-mood-chart"></canvas></div>
    </div>

    <div class="card">
      <div class="section-header">
        <span class="section-title">最近の運動</span>
        <button class="section-link" onclick="window._navigate('exercise')">すべて見る</button>
      </div>
      ${recentExerciseHTML(exercises.slice(0, 3))}
    </div>
  `;

  destroyCharts();
  const labels = last7.map(d => formatDateShort(d));

  // Exercise bar
  const exData = last7.map(d =>
    exercises.filter(e => e.date === d).reduce((s, e) => s + Number(e.duration || 0), 0)
  );
  activeCharts.dashEx = new Chart(document.getElementById('dash-ex-chart'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{ data: exData, backgroundColor: 'rgba(123,196,160,0.75)', borderRadius: 6, borderSkipped: false }]
    },
    options: chartOpts({ beginAtZero: true })
  });

  // Mood line
  const healthAll = getHealthRecords();
  const moodData  = last7.map(d => healthAll.find(r => r.date === d)?.mood ?? null);
  activeCharts.dashMood = new Chart(document.getElementById('dash-mood-chart'), {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: moodData,
        borderColor: '#f4a5c0',
        backgroundColor: 'rgba(244,165,192,0.12)',
        pointBackgroundColor: '#f4a5c0',
        pointRadius: 5,
        tension: 0.35,
        fill: true,
        spanGaps: true,
      }]
    },
    options: chartOpts({
      min: 1, max: 5,
      tickCb: v => (['', '😔', '😕', '😐', '🙂', '😊'][v] || ''),
      stepSize: 1,
    })
  });
}

function recentExerciseHTML(list) {
  if (list.length === 0) return emptyState('🏃', '運動記録はまだありません');
  return list.map(e => `
    <div class="record-item">
      <div class="record-icon green">${EXERCISE_EMOJI[e.type] || '⚡'}</div>
      <div class="record-info">
        <div class="record-title">${e.type}</div>
        <div class="record-subtitle">${formatDuration(e.duration)}${e.distance ? `・${e.distance}km` : ''}</div>
      </div>
      <div class="record-date">${formatDate(e.date)}</div>
    </div>
  `).join('');
}

// ---- Exercise page ----

function renderExercise() {
  const todayStr = today();
  document.getElementById('page-exercise').innerHTML = `
    <div class="card">
      <div class="page-section-title">運動を記録する</div>
      <div class="page-section-sub">今日の運動を記録しましょう</div>
      <form id="ex-form">
        <div class="form-group">
          <label class="form-label">種類</label>
          <select class="form-input" name="type" required>
            <option value="">選択してください</option>
            ${EXERCISE_TYPES.map(t => `<option value="${t.value}">${t.emoji} ${t.value}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">時間（分）</label>
          <input class="form-input" type="number" name="duration" min="1" max="600" placeholder="例：30" required>
        </div>
        <div class="form-group">
          <label class="form-label">距離（km）<span class="optional">任意</span></label>
          <input class="form-input" type="number" name="distance" min="0" step="0.1" placeholder="例：5.0">
        </div>
        <div class="form-group">
          <label class="form-label">日付</label>
          <input class="form-input" type="date" name="date" value="${todayStr}" required>
        </div>
        <button type="submit" class="btn-primary">記録する ✓</button>
      </form>
    </div>

    <div class="card">
      <div class="card-title">運動履歴</div>
      <div id="ex-list"></div>
    </div>
  `;

  renderExList();

  document.getElementById('ex-form').addEventListener('submit', e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    addExercise({
      type:     fd.get('type'),
      duration: Number(fd.get('duration')),
      distance: fd.get('distance') ? Number(fd.get('distance')) : null,
      date:     fd.get('date'),
    });
    e.target.reset();
    e.target.date.value = todayStr;
    renderExList();
    showToast('運動を記録しました 🎉', 'success');
  });
}

function renderExList() {
  const el = document.getElementById('ex-list');
  if (!el) return;
  const list = getExercises();
  if (list.length === 0) {
    el.innerHTML = emptyState('🏃', '運動記録はまだありません');
    return;
  }
  el.innerHTML = list.map(e => `
    <div class="record-item">
      <div class="record-icon green">${EXERCISE_EMOJI[e.type] || '⚡'}</div>
      <div class="record-info">
        <div class="record-title">${e.type}</div>
        <div class="record-subtitle">${formatDuration(e.duration)}${e.distance ? `・${e.distance}km` : ''}</div>
      </div>
      <div class="record-right">
        <div class="record-date">${formatDate(e.date)}</div>
        <button class="delete-btn" aria-label="削除" onclick="window._delEx('${e.id}')">✕</button>
      </div>
    </div>
  `).join('');
}

// ---- Health page ----

function renderHealth() {
  const todayStr = today();
  const rec = getHealthByDate(todayStr);

  document.getElementById('page-health').innerHTML = `
    <div class="card">
      <div class="page-section-title">体調を記録する</div>
      <div class="page-section-sub">今日の体調を記録しましょう</div>
      <form id="health-form">
        <div class="form-group">
          <label class="form-label">日付</label>
          <input class="form-input" type="date" name="date" id="health-date" value="${todayStr}" required>
        </div>
        <div class="form-group">
          <label class="form-label">気分</label>
          <div class="mood-selector" id="mood-selector">
            ${MOODS.map(m => `
              <button type="button" class="mood-btn${rec?.mood === m.value ? ' selected' : ''}" data-mood="${m.value}">
                <span class="mood-emoji">${m.emoji}</span>
                <span class="mood-label">${m.label}</span>
              </button>
            `).join('')}
          </div>
          <input type="hidden" name="mood" id="mood-value" value="${rec?.mood ?? ''}">
        </div>
        <div class="form-group">
          <label class="form-label">体重（kg）<span class="optional">任意</span></label>
          <input class="form-input" type="number" name="weight" step="0.1" min="20" max="300" placeholder="例：60.5" value="${rec?.weight ?? ''}">
        </div>
        <div class="form-group">
          <label class="form-label">睡眠時間（時間）<span class="optional">任意</span></label>
          <input class="form-input" type="number" name="sleep" step="0.5" min="0" max="24" placeholder="例：7.5" value="${rec?.sleep ?? ''}">
        </div>
        <div class="form-group">
          <label class="form-label">症状<span class="optional">任意・複数可</span></label>
          <div class="symptom-grid" id="symptom-grid">
            ${SYMPTOMS.map(s => `
              <button type="button" class="symptom-chip${rec?.symptoms?.includes(s) ? ' selected' : ''}" data-symptom="${s}">${s}</button>
            `).join('')}
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">メモ<span class="optional">任意</span></label>
          <textarea class="form-input" name="memo" rows="3" placeholder="気になることを書いておこう">${rec?.memo ?? ''}</textarea>
        </div>
        <button type="submit" class="btn-primary" id="health-submit">${rec ? '更新する ✓' : '記録する ✓'}</button>
      </form>
    </div>

    <div class="card">
      <div class="card-title">体調履歴</div>
      <div id="health-list"></div>
    </div>
  `;

  renderHealthList();
  setupHealthForm(todayStr);
}

function setupHealthForm(todayStr) {
  // Mood buttons
  document.querySelectorAll('.mood-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      document.getElementById('mood-value').value = btn.dataset.mood;
    });
  });

  // Symptom chips
  document.querySelectorAll('.symptom-chip').forEach(chip => {
    chip.addEventListener('click', () => chip.classList.toggle('selected'));
  });

  // Date change → populate existing record
  document.getElementById('health-date').addEventListener('change', e => {
    const existing = getHealthByDate(e.target.value);
    const form = document.getElementById('health-form');
    form.weight.value = existing?.weight ?? '';
    form.sleep.value  = existing?.sleep  ?? '';
    form.memo.value   = existing?.memo   ?? '';
    document.getElementById('mood-value').value = existing?.mood ?? '';
    document.querySelectorAll('.mood-btn').forEach(b =>
      b.classList.toggle('selected', Number(b.dataset.mood) === existing?.mood)
    );
    document.querySelectorAll('.symptom-chip').forEach(c =>
      c.classList.toggle('selected', existing?.symptoms?.includes(c.dataset.symptom) ?? false)
    );
    document.getElementById('health-submit').textContent = existing ? '更新する ✓' : '記録する ✓';
  });

  // Submit
  document.getElementById('health-form').addEventListener('submit', e => {
    e.preventDefault();
    const fd       = new FormData(e.target);
    const symptoms = [...document.querySelectorAll('.symptom-chip.selected')].map(c => c.dataset.symptom);
    const mood     = fd.get('mood') ? Number(fd.get('mood')) : null;
    const weight   = fd.get('weight') ? Number(fd.get('weight')) : null;
    const sleep    = fd.get('sleep')  ? Number(fd.get('sleep'))  : null;
    const memo     = fd.get('memo').trim();

    if (!mood && !weight && !sleep && symptoms.length === 0 && !memo) {
      showToast('何かひとつ入力してください', 'error');
      return;
    }

    saveHealthRecord({ date: fd.get('date'), mood, weight, sleep, symptoms, memo });
    renderHealthList();
    document.getElementById('health-submit').textContent = '更新する ✓';
    showToast('体調を記録しました 🌸', 'success');
  });
}

function renderHealthList() {
  const el = document.getElementById('health-list');
  if (!el) return;
  const list = getHealthRecords();
  if (list.length === 0) {
    el.innerHTML = emptyState('🌿', '体調記録はまだありません');
    return;
  }
  el.innerHTML = list.map(r => {
    const parts = [];
    if (r.weight) parts.push(`体重 ${r.weight}kg`);
    if (r.sleep)  parts.push(`睡眠 ${r.sleep}h`);
    if (r.symptoms?.length) parts.push(r.symptoms.join('、'));
    return `
      <div class="record-item">
        <div class="record-icon pink">${r.mood ? moodEmoji(r.mood) : '🌿'}</div>
        <div class="record-info">
          <div class="record-title">${r.mood ? moodLabel(r.mood) : '記録あり'}</div>
          <div class="record-subtitle">${parts.join(' · ') || (r.memo ? r.memo.slice(0, 20) : '—')}</div>
        </div>
        <div class="record-right">
          <div class="record-date">${formatDate(r.date)}</div>
          <button class="delete-btn" aria-label="削除" onclick="window._delHealth('${r.id}')">✕</button>
        </div>
      </div>
    `;
  }).join('');
}

// ---- Stats page ----

function renderStats() {
  document.getElementById('page-stats').innerHTML = `
    <div class="tabs">
      <button class="tab-btn${statsTab === 'exercise' ? ' active' : ''}" onclick="window._statsTab('exercise')">🏃 運動</button>
      <button class="tab-btn${statsTab === 'health'   ? ' active' : ''}" onclick="window._statsTab('health')">🌿 体調</button>
    </div>
    <div class="period-selector">
      ${[['7','1週間'],['30','1ヶ月'],['90','3ヶ月']].map(([v, l]) =>
        `<button class="period-btn${statsPeriod === v ? ' active' : ''}" onclick="window._period('${v}')">${l}</button>`
      ).join('')}
    </div>
    <div id="stats-body"></div>
  `;
  renderStatsBody();
}

function renderStatsBody() {
  destroyCharts();
  const el   = document.getElementById('stats-body');
  const days = getDaysRange(Number(statsPeriod));

  if (statsTab === 'exercise') renderExStats(el, days);
  else renderHealthStats(el, days);
}

function renderExStats(el, days) {
  const exercises = getExercises();
  const inRange   = exercises.filter(e => days.includes(e.date));
  const totalMin  = inRange.reduce((s, e) => s + Number(e.duration || 0), 0);
  const totalKm   = inRange.reduce((s, e) => s + Number(e.distance || 0), 0);

  const typeCount = {};
  inRange.forEach(e => { typeCount[e.type] = (typeCount[e.type] || 0) + 1; });

  el.innerHTML = `
    <div class="card">
      <div class="card-title">集計</div>
      <div class="stats-grid">
        <div class="stat-box"><span class="stat-value">${inRange.length}</span><div class="stat-label">回</div></div>
        <div class="stat-box"><span class="stat-value">${totalMin}</span><div class="stat-label">合計（分）</div></div>
        <div class="stat-box"><span class="stat-value">${totalKm.toFixed(1)}</span><div class="stat-label">合計（km）</div></div>
      </div>
    </div>
    <div class="card">
      <div class="card-title">📊 運動時間（分/日）</div>
      <div class="chart-container"><canvas id="st-ex-bar"></canvas></div>
    </div>
    ${Object.keys(typeCount).length > 0 ? `
    <div class="card">
      <div class="card-title">🥧 種類別</div>
      <div class="chart-container" style="height:220px"><canvas id="st-ex-donut"></canvas></div>
    </div>` : ''}
  `;

  const { labels, skip } = periodLabels(days);

  activeCharts.exBar = new Chart(document.getElementById('st-ex-bar'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{ data: days.map(d => exercises.filter(e => e.date === d).reduce((s, e) => s + Number(e.duration || 0), 0)), backgroundColor: 'rgba(123,196,160,0.75)', borderRadius: skip ? 3 : 6, borderSkipped: false }]
    },
    options: chartOpts({ beginAtZero: true })
  });

  const donutEl = document.getElementById('st-ex-donut');
  if (donutEl && Object.keys(typeCount).length > 0) {
    const colors = ['rgba(123,196,160,0.8)','rgba(244,165,192,0.8)','rgba(164,200,240,0.8)','rgba(250,200,140,0.8)','rgba(180,160,220,0.8)','rgba(160,200,160,0.8)','rgba(200,160,160,0.8)'];
    activeCharts.exDonut = new Chart(donutEl, {
      type: 'doughnut',
      data: {
        labels: Object.keys(typeCount),
        datasets: [{ data: Object.values(typeCount), backgroundColor: colors.slice(0, Object.keys(typeCount).length), borderWidth: 2, borderColor: '#fff' }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { size: 12 }, padding: 12 } } } }
    });
  }
}

function renderHealthStats(el, days) {
  const healthAll = getHealthRecords();
  const recs      = days.map(d => healthAll.find(r => r.date === d) || null);
  const withMood  = recs.filter(r => r?.mood);
  const withSleep = recs.filter(r => r?.sleep);
  const weights   = recs.filter(r => r?.weight).map(r => r.weight);

  const avgMood  = withMood.length  ? (withMood.reduce((s, r) => s + r.mood, 0) / withMood.length).toFixed(1) : '—';
  const avgSleep = withSleep.length ? (withSleep.reduce((s, r) => s + r.sleep, 0) / withSleep.length).toFixed(1) : '—';

  el.innerHTML = `
    <div class="card">
      <div class="card-title">集計</div>
      <div class="stats-grid">
        <div class="stat-box"><span class="stat-value">${avgMood}</span><div class="stat-label">平均気分</div></div>
        <div class="stat-box"><span class="stat-value">${avgSleep}</span><div class="stat-label">平均睡眠(h)</div></div>
        <div class="stat-box"><span class="stat-value">${weights.at(-1) ?? '—'}</span><div class="stat-label">最新体重(kg)</div></div>
      </div>
    </div>
    <div class="card">
      <div class="card-title">😊 気分の推移</div>
      <div class="chart-container"><canvas id="st-mood"></canvas></div>
    </div>
    <div class="card">
      <div class="card-title">⚖️ 体重の推移（kg）</div>
      <div class="chart-container"><canvas id="st-weight"></canvas></div>
    </div>
    <div class="card">
      <div class="card-title">💤 睡眠時間（h）</div>
      <div class="chart-container"><canvas id="st-sleep"></canvas></div>
    </div>
  `;

  const { labels, skip } = periodLabels(days);
  const moodData   = recs.map(r => r?.mood   ?? null);
  const weightData = recs.map(r => r?.weight ?? null);
  const sleepData  = recs.map(r => r?.sleep  ?? null);

  activeCharts.mood = new Chart(document.getElementById('st-mood'), {
    type: 'line',
    data: { labels, datasets: [lineDs(moodData, '#f4a5c0')] },
    options: chartOpts({ min: 1, max: 5, stepSize: 1, tickCb: v => (['','😔','😕','😐','🙂','😊'][v] || '') })
  });

  activeCharts.weight = new Chart(document.getElementById('st-weight'), {
    type: 'line',
    data: { labels, datasets: [lineDs(weightData, '#a4c8f0')] },
    options: chartOpts({})
  });

  activeCharts.sleep = new Chart(document.getElementById('st-sleep'), {
    type: 'bar',
    data: { labels, datasets: [{ data: sleepData, backgroundColor: 'rgba(164,200,240,0.75)', borderRadius: skip ? 3 : 6, borderSkipped: false }] },
    options: chartOpts({ beginAtZero: true, max: 12 })
  });
}

// ---- Chart helpers ----

function lineDs(data, color) {
  return {
    data,
    borderColor: color,
    backgroundColor: color.replace(')', ',0.1)').replace('rgb', 'rgba'),
    pointBackgroundColor: color,
    pointRadius: 4,
    tension: 0.35,
    fill: true,
    spanGaps: true,
  };
}

function periodLabels(days) {
  const skip = days.length > 14;
  const every = days.length <= 14 ? 1 : days.length <= 31 ? 5 : 15;
  return {
    labels: days.map((d, i) => (i % every === 0 ? formatDateShort(d) : '')),
    skip,
  };
}

function chartOpts({ beginAtZero, min, max, tickCb, stepSize } = {}) {
  const yTicks = { font: { size: 11 } };
  if (tickCb)   yTicks.callback = tickCb;
  if (stepSize) yTicks.stepSize = stepSize;
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: !!beginAtZero, min, max, ticks: yTicks, grid: { color: '#f0f0f0' } },
      x: { ticks: { font: { size: 10 }, maxRotation: 0 }, grid: { display: false } }
    }
  };
}

function destroyCharts() {
  Object.values(activeCharts).forEach(c => c?.destroy());
  activeCharts = {};
}

// ---- Utilities ----

function emptyState(icon, text) {
  return `<div class="empty-state"><span class="empty-state-icon">${icon}</span><p class="empty-state-text">${text}</p></div>`;
}

// ---- Global handlers (used by inline onclick) ----

window._navigate  = navigate;
window._delEx     = id => { if (confirm('この運動記録を削除しますか？')) { deleteExercise(id); renderExList(); showToast('削除しました'); } };
window._delHealth = id => { if (confirm('この体調記録を削除しますか？')) { deleteHealth(id); renderHealthList(); showToast('削除しました'); } };
window._statsTab  = tab    => { statsTab = tab; renderStats(); };
window._period    = period => { statsPeriod = period; renderStats(); };

// ---- Init ----

function init() {
  const d = new Date();
  document.getElementById('today-date').textContent = `${d.getMonth() + 1}月${d.getDate()}日`;

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.page));
  });

  navigate('dashboard');

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

init();
