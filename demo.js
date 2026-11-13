// ケアブル デモ：上の帯（だれの画面か・新しい連絡のようす・ケアブルとは）と、通知カードの再現
(() => {
  const UI = window.DEMO_UI;
  const info = window.demoInfo || { cms: [], providers: [] };
  const $ = (id) => document.getElementById(id);
  const who = $('who');
  const hintEl = $('demoHint');
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  async function waitFor(fn, ms = 2500) { const end = Date.now() + ms; while (Date.now() < end) { const v = fn(); if (v) return v; await sleep(60); } return fn(); }
  // アプリが画面の先頭に戻すとき、デモの枠の中も先頭に戻す
  const nativeScroll = window.scrollTo.bind(window);
  window.scrollTo = (...a) => { const st = $('stage'); if (st) st.scrollTop = 0; nativeScroll(...a); };
  let hintTimer = 0;
  function hint(text) { hintEl.textContent = text; hintEl.classList.toggle('on', !!text); clearTimeout(hintTimer); if (text) hintTimer = setTimeout(() => hint(''), 9000); }

  // ---------- だれの画面か ----------
  const cmBtns = info.cms.map((c) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'who-btn'; b.dataset.id = c.login_id;
    b.innerHTML = `<b>${esc(c.name)}</b><small>ケアマネ・担当${c.active}人（累計${c.total}人）</small>`;
    return b;
  });
  const sel = document.createElement('select');
  sel.className = 'who-sel'; sel.setAttribute('aria-label', 'サービス事業所の画面をえらぶ');
  sel.innerHTML = `<option value="">🏢 サービス事業所（${info.providers.length}）をえらぶ</option>`
    + ['居宅サービス', '入所サービス'].map((g) => `<optgroup label="${g}">${info.providers.filter((p) => p.group === g)
      .map((p) => `<option value="${esc(p.login_id)}">${esc(p.type)}｜${esc(p.office)}</option>`).join('')}</optgroup>`).join('');
  const loginBtn = document.createElement('button');
  loginBtn.type = 'button'; loginBtn.className = 'who-btn'; loginBtn.dataset.id = '';
  loginBtn.innerHTML = '<b>ログイン画面</b><small>最初の画面</small>';
  who.append(...cmBtns, sel, loginBtn);

  const loginForm = () => document.querySelector('#app input[autocomplete="username"]');
  function mark(id) {
    [...cmBtns, loginBtn].forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === id)));
    const isProv = info.providers.some((p) => p.login_id === id);
    sel.value = isProv ? id : '';
    sel.classList.toggle('on', isProv);
    const on = isProv ? sel : [...cmBtns, loginBtn].find((b) => b.dataset.id === id);
    if (on) who.scrollLeft = Math.max(0, on.offsetLeft - who.offsetLeft - 12);
  }
  let busy = false;
  async function show(id) {
    if (busy) return; busy = true;
    try {
      setAway(false, true);
      clearNotices();
      hint('');
      document.querySelectorAll('.overlay').forEach((o) => o.remove());
      if (!loginForm() && window.appLogout) window.appLogout();
      await waitFor(loginForm, 3000);
      if (id) window.demoLogin(id);
      mark(id);
    } finally { busy = false; }
  }
  who.addEventListener('click', (e) => { const b = e.target.closest('button.who-btn'); if (b) show(b.dataset.id); });
  sel.addEventListener('change', () => { if (sel.value) show(sel.value); });
  // アプリの中でログアウトしたら、選択の表示もログイン画面に戻す
  new MutationObserver(() => { if (!busy && loginForm()) mark(''); }).observe($('app'), { childList: true });

  // トークを開いたとき、いちばん新しい連絡が入力欄に隠れないよう、最後までスクロールする
  new MutationObserver((list) => {
    for (const m of list) for (const n of m.addedNodes) {
      if (n.nodeType === 1 && (n.matches('.composer, .readonly-bar') || n.querySelector?.('.composer, .readonly-bar'))) {
        const sc = document.querySelector('#app .chat-scroll');
        if (sc) requestAnimationFrame(() => { sc.scrollTop = sc.scrollHeight; });
      }
    }
  }).observe($('app'), { childList: true, subtree: true });

  // ---------- ブラウザのタブ（未読の数） ----------
  const tabTitle = $('tabTitle');
  const syncTab = () => { tabTitle.textContent = document.title; tabTitle.parentElement.classList.toggle('has', /^\(\d/.test(document.title)); };
  new MutationObserver(syncTab).observe(document.querySelector('title'), { childList: true, characterData: true, subtree: true });
  syncTab();

  // ---------- 通知カード（パソコンの画面のすみに出る通知の再現） ----------
  const area = $('noticeArea');
  const cards = new Map(); // tag → { n, el }
  UI.showNotice = (n) => {
    const key = n.tag || String(Math.random());
    const had = cards.get(key);
    if (had) { had.n = n; had.el.querySelector('.n-body').textContent = n.body; return; } // 同じ札の通知は、1つにまとまる
    const el = document.createElement('div');
    el.className = 'n-card'; el.setAttribute('role', 'alert');
    el.innerHTML = `<div class="n-top"><span class="n-src">ブラウザからの通知</span><button type="button" class="n-x" aria-label="通知を閉じる">×</button></div>
      <button type="button" class="n-main"><img class="n-icon" alt="" src="${esc(n.icon || 'icon-192.png')}"><span class="n-text"><b class="n-title"></b><span class="n-body"></span><span class="n-tap">押すとケアブルが開きます</span></span></button>`;
    el.querySelector('.n-title').textContent = n.title;
    el.querySelector('.n-body').textContent = n.body;
    const rec = { n, el };
    cards.set(key, rec);
    el.querySelector('.n-main').addEventListener('click', () => {
      const cur = rec.n;
      if (typeof cur.onclick === 'function') cur.onclick({ target: cur });
      removeCard(key);
      setAway(false);
    });
    el.querySelector('.n-x').addEventListener('click', () => removeCard(key));
    area.append(el);
  };
  function removeCard(key) { const r = cards.get(key); if (!r) return; cards.delete(key); r.el.classList.add('bye'); setTimeout(() => r.el.remove(), 200); }
  UI.hideNotice = (n) => { for (const [k, r] of cards) if (r.n === n) removeCard(k); };
  function clearNotices() { [...cards.keys()].forEach(removeCard); }

  // ---------- 「ほかの作業中」の再現 ----------
  const away = $('away');
  let awayTimers = [];
  function setAway(on, quiet) {
    if (UI.away === on) return;
    UI.away = on;
    away.hidden = !on;
    document.body.classList.toggle('is-away', on);
    if (!on) {
      awayTimers.forEach(clearTimeout); awayTimers = [];
      // ケアブルの画面に戻ってきた → アプリが数と画面を最新にする
      if (!quiet) document.dispatchEvent(new Event('visibilitychange'));
    }
  }
  $('awayBack').addEventListener('click', () => { clearNotices(); setAway(false); });

  // ---------- 新しい連絡を届ける ----------
  function currentRoom() {
    if (!document.querySelector('#app .chat-scroll')) return null;
    const h1 = document.querySelector('#app .topbar h1');
    return h1 && h1.firstChild ? String(h1.firstChild.textContent).replace(/\s*様\s*$/, '') : null;
  }
  async function ensureOn() {
    if (window.demoPushOn()) return true;
    // 一覧の上の案内「オンにする」を押す（一覧にいなければ、戻ってから）
    for (let i = 0; i < 3 && !document.querySelector('#app .invite .btn'); i++) {
      const back = document.querySelector('#app .topbar [aria-label="戻る"]');
      if (!back) break;
      back.click();
      await waitFor(() => !document.querySelector('#app .topbar [aria-label="戻る"]') || document.querySelector('#app .invite .btn'), 1500);
    }
    let b = await waitFor(() => document.querySelector('#app .invite .btn'), 1200);
    if (!b) {
      // 案内を「あとで」で閉じていたら、メニューの「新しい連絡のお知らせ」から
      const menu = document.querySelector('#app [aria-label="メニュー"]');
      if (menu) { menu.click(); b = await waitFor(() => [...document.querySelectorAll('#app .menu button')].find((x) => x.textContent.includes('新しい連絡のお知らせ')), 1500); }
    }
    if (!b) return false;
    hint('まず、通知を「オン」にします（ふだんは、使う人が一度だけ押します）。');
    b.click();
    await waitFor(() => window.demoPushOn(), 2500);
    await sleep(700);
    return window.demoPushOn();
  }
  async function ready() {
    if (!window.demoSession()) { hint('先に「だれの画面？」から、ケアマネジャーか事業所をえらんでください。'); return false; }
    if (!(await ensureOn())) { hint('通知をオンにできませんでした。一覧の上の「オンにする」を押してから、もう一度お試しください。'); return false; }
    return true;
  }
  let sending = false;
  $('sigLook').addEventListener('click', async () => {
    if (sending) return; sending = true;
    try {
      setAway(false, true);
      if (!(await ready())) return;
      const name = window.demoArrive(currentRoom());
      if (!name) { hint('この画面には、連絡が届くトークがありません。ほかの立場でお試しください。'); return; }
      hint(`「${name} 様」に新しい連絡が届きました。画面を見ているときは通知を出さず、一覧やトークだけを最新にします。`);
    } finally { sending = false; }
  });
  $('sigAway').addEventListener('click', async () => {
    if (sending) return; sending = true;
    try {
      if (!(await ready())) return;
      const name = currentRoom();
      clearNotices();
      setAway(true);
      hint('ほかのソフトで作業中のつもりで、少しお待ちください…');
      awayTimers.push(setTimeout(() => {
        const got = window.demoArrive(name);
        hint(got ? `「${got} 様」に新しい連絡が届き、画面のすみに通知が出ました。通知には、利用者の名前や本文は出しません。` : '連絡が届くトークがありませんでした。');
      }, 1500));
      awayTimers.push(setTimeout(() => {
        if (!window.demoArrive(name)) return;
        hint('続けて2件目が届きました。確認するまでは、通知は1つにまとまります（増えません）。通知を押すと、ケアブルに戻ります。');
      }, 6500));
    } finally { sending = false; }
  });

  // ---------- ケアブルとは ----------
  $('aboutBtn').addEventListener('click', () => {
    const ov = document.createElement('div');
    ov.className = 'overlay'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'ケアブルとは');
    ov.innerHTML = `<div class="about-box" tabindex="-1">
      <p class="lead">ケアマネジャーとサービス事業所のための連絡アプリ</p>
      <h2>介護の連絡を、だれでも、無料で、ひとつの場所で。</h2>
      <p>電話・FAX・郵便、そして法人ごとにばらばらのチャット。ケアブルは、介護業界に身を置く自身が「ないなら自分で創ればいい」と作りはじめた連絡アプリです。</p>
      <p class="goal">めざすのは、介護業界を良くする製品にすること。</p>
      <ol>
        <li><b>無料であること</b>費用が理由で導入できない事業所をなくします。</li>
        <li><b>だれでも使えること</b>機能の多さより、迷わず続けられることを優先します。</li>
        <li><b>法人の垣根を越えてつながること</b>大切な連絡が埋もれない・散らばらない場所をつくります。</li>
      </ol>
      <p><b>日本の介護はもっと良くなる。</b></p>
      <div class="about-demo">
        <b>このデモについて</b>
        <ul>
          <li>ケアマネジャー3人（累計60人・30人・100人／いま担当している方40人・30人・45人）</li>
          <li>サービス事業所は、介護保険のサービス種別ごとに1つずつ（${info.providers.length}事業所）。1つのIDで、3人のケアマネジャーとつながっています</li>
          <li>上の「新しい連絡」のボタンで、連絡が届いたときの画面や通知のようすを見られます</li>
        </ul>
      </div>
      <p class="note">登場する方・事業所はすべて架空です。書き込みや登録も自由に試せます（開き直すと元に戻ります）。ケアブルはまだ初版です。ご感想をお聞かせください。</p>
      <button type="button" class="btn close">デモにもどる</button>
    </div>`;
    const close = () => { ov.remove(); document.removeEventListener('keydown', onKey); $('aboutBtn').focus(); };
    const onKey = (k) => { if (k.key === 'Escape') close(); };
    ov.addEventListener('click', (c) => { if (c.target === ov || c.target.closest('.close')) close(); });
    document.addEventListener('keydown', onKey);
    document.body.append(ov);
    const box = ov.querySelector('.about-box'); box.focus({ preventScroll: true }); box.scrollTop = 0;
  });

  // 最初は、1人目のケアマネジャーの画面を開いておく
  show(info.cms[0] ? info.cms[0].login_id : '');
})();
