// エストラーナテープ貼り替え通知 — Googleカレンダー連携
//
// 健康管理アプリで「貼り替えた」を記録すると、このスクリプトが呼ばれ、
// カレンダーの通知予定を「貼った日の2日後から2日おき」に付け直す。
// 過去の予定は残し、貼った日以降の予定だけを差し替える。
//
// 設定方法は gas/README.md を参照。
// ※「サービス」に Google Calendar API（Calendar）の追加が必要。

// アプリの設定画面に入れる合言葉と同じ文字列にする（他人に見せない）
const TOKEN = 'ここに合言葉を入れる';

const INTERVAL_DAYS = 2;

// 通知用の予定（時刻は24時間表記、所要時間は分）
const PATCH_EVENTS = [
  {
    summary: '💊 エストラーナテープ貼り替え',
    time: '19:30',
    minutes: 15,
    description: 'エストラーナテープを貼り替える日です（2日に1回）。\n' +
                 '貼り替えたら健康管理アプリの「貼り替えた」ボタンで記録しましょう。\n' +
                 '※貼る場所は前回と変えると肌トラブルを防げます。',
  },
  {
    summary: '🔔【念押し】エストラーナ貼り替えましたか？',
    time: '20:30',
    minutes: 5,
    description: '19:30の通知の念押しです。まだならエストラーナテープを貼り替えましょう。',
  },
];

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return json({ ok: false, error: 'リクエストの形式が正しくありません' });
  }
  if (TOKEN === 'ここに合言葉を入れる') {
    return json({ ok: false, error: 'スクリプトの合言葉（TOKEN）がまだ設定されていません' });
  }
  if (body.token !== TOKEN) {
    return json({ ok: false, error: '合言葉が違います' });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date || '')) {
    return json({ ok: false, error: '日付の形式が正しくありません' });
  }
  try {
    const next = syncPatchEvents(body.date);
    return json({ ok: true, next });
  } catch (err) {
    return json({ ok: false, error: String(err.message || err) });
  }
}

// ブラウザでURLを開いたときの動作確認用
function doGet() {
  return json({ ok: true, message: 'エストラーナ通知スクリプトは動いています' });
}

// 貼り替えた日 lastDate（yyyy-MM-dd）をもとに通知予定を付け直す。次の貼り替え日を返す。
function syncPatchEvents(lastDate) {
  const calId = 'primary';
  const tz    = CalendarApp.getDefaultCalendar().getTimeZone();
  const lastMidnight = Utilities.parseDate(lastDate, tz, 'yyyy-MM-dd');
  const until = Utilities.formatDate(lastMidnight, 'UTC', "yyyyMMdd'T'HHmmss'Z'");
  const next  = addDays(lastDate, INTERVAL_DAYS, tz);

  // 貼った日以降にも予定が残っている繰り返し予定を探す
  const items = Calendar.Events.list(calId, {
    q: 'エストラーナ',
    timeMin: lastMidnight.toISOString(),
    maxResults: 250,
  }).items || [];

  PATCH_EVENTS.forEach(def => {
    items
      .filter(ev => ev.summary === def.summary && ev.recurrence && ev.start.dateTime)
      .forEach(ev => {
        const startDate = ev.start.dateTime.slice(0, 10);
        if (startDate >= lastDate) {
          // 貼った日以降に始まる予定はまるごと削除
          Calendar.Events.remove(calId, ev.id);
        } else {
          // すでにそれより前に終わっている予定は延ばさない
          const rrule = ev.recurrence.find(r => r.startsWith('RRULE:')) || '';
          const prev  = (rrule.match(/;UNTIL=([^;]*)/) || [])[1];
          if (prev && prev <= until) return;
          // それより前から続く予定は、貼った日の前日で終わらせる（過去分は残る）
          const recurrence = ev.recurrence.map(r =>
            r.startsWith('RRULE:')
              ? r.replace(/;(UNTIL|COUNT)=[^;]*/g, '') + ';UNTIL=' + until
              : r
          );
          Calendar.Events.patch({ recurrence }, calId, ev.id);
        }
      });

    const end = addMinutes(def.time, def.minutes);
    Calendar.Events.insert({
      summary: def.summary,
      description: def.description,
      start: { dateTime: `${next}T${def.time}:00`, timeZone: tz },
      end:   { dateTime: `${next}T${end}:00`,      timeZone: tz },
      recurrence: [`RRULE:FREQ=DAILY;INTERVAL=${INTERVAL_DAYS}`],
      reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 0 }] },
      visibility: 'private',
      transparency: 'transparent',
    }, calId);
  });

  return next;
}

function addDays(dateStr, n, tz) {
  // 正午を基準にして日付の繰り上がりを安定させる
  const d = Utilities.parseDate(dateStr + ' 12:00', tz, 'yyyy-MM-dd HH:mm');
  return Utilities.formatDate(new Date(d.getTime() + n * 86400000), tz, 'yyyy-MM-dd');
}

function addMinutes(time, minutes) {
  const [h, m] = time.split(':').map(Number);
  const total  = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// 設定確認用：エディタでこの関数を選んで「実行」すると、権限の許可画面が出る
function authorize() {
  Calendar.Events.list('primary', { maxResults: 1 });
  Logger.log('カレンダーへのアクセスを確認しました（タイムゾーン: ' +
             CalendarApp.getDefaultCalendar().getTimeZone() + '）');
}
