// ケアブル デモ：アプリ本体（app.js）より先に読み込む準備
// ・サーバーにつながず、見本データ（demo-api.js）で動かす
// ・ブラウザの本物の通知は使わず、画面の中に「通知のようす」を再現する（見る人に通知の許可を求めない）
// ・「ほかの作業をしているとき」を再現するため、画面が裏にある状態をまねできるようにする
window.APP_CONFIG = { API_BASE: 'demo', MEMORY_ROUTER: true };

(() => {
  const S = window.DEMO_UI = { away: false, showNotice: null, hideNotice: null };

  // 画面が裏にある（ほかのソフトで作業中）状態のまね
  const realHasFocus = Document.prototype.hasFocus;
  document.hasFocus = function hasFocus() { return S.away ? false : realHasFocus.call(document); };
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => S.away });
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (S.away ? 'hidden' : 'visible') });

  // 通知のまね（デモの画面のすみにカードを出す）
  class DemoNotification {
    constructor(title, opts = {}) {
      this.title = title; this.body = opts.body || ''; this.tag = opts.tag || ''; this.icon = opts.icon || '';
      this.onclick = null; this.onclose = null;
      queueMicrotask(() => { if (S.showNotice) S.showNotice(this); });
    }
    close() { if (S.hideNotice) S.hideNotice(this); }
    static get permission() { return 'granted'; }
    static requestPermission(cb) { if (typeof cb === 'function') cb('granted'); return Promise.resolve('granted'); }
  }
  window.Notification = DemoNotification;

  // デモでは、ホーム画面に追加するしくみ（サービスワーカー）は使わない
  const noop = () => {};
  try {
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { addEventListener: noop, removeEventListener: noop, register: () => Promise.reject(new Error('demo')), ready: new Promise(noop), getRegistration: () => Promise.resolve(undefined) },
    });
  } catch { /* 置き換えられない環境では、そのまま */ }
})();
