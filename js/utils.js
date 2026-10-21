function today() {
  return localDateStr(new Date());
}

function localDateStr(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function formatDateShort(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatDuration(mins) {
  mins = Number(mins);
  if (mins < 60) return `${mins}分`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}時間${m}分` : `${h}時間`;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 11) return 'おはようございます ☀️';
  if (h < 18) return 'こんにちは 🌤';
  return 'こんばんは 🌙';
}

function getDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return localDateStr(d);
}

function getDaysRange(n) {
  return Array.from({ length: n }, (_, i) => getDaysAgo(n - 1 - i));
}

const MOODS = [
  { value: 1, emoji: '😔', label: 'とても悪い' },
  { value: 2, emoji: '😕', label: '悪い' },
  { value: 3, emoji: '😐', label: '普通' },
  { value: 4, emoji: '🙂', label: '良い' },
  { value: 5, emoji: '😊', label: 'とても良い' },
];

function moodEmoji(val) {
  return MOODS.find(m => m.value === val)?.emoji || '—';
}

function moodLabel(val) {
  return MOODS.find(m => m.value === val)?.label || '未記録';
}

function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast ${type}`;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('show'));
  });
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 2600);
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return localDateStr(d);
}

function diffDays(fromStr, toStr) {
  const from = new Date(fromStr + 'T00:00:00');
  const to   = new Date(toStr + 'T00:00:00');
  return Math.round((to - from) / 86400000);
}
