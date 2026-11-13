// ケアブル デモ用の見本データ（このフォルダの index.html から読み込みます）
// ・サーバーにはつながらず、ブラウザの中だけで動きます。再読み込みすると元に戻ります
// ・ケアマネジャー3人（累計 60名・30名・100名／いま担当している方 40名・30名・45名）
// ・サービス事業所は、介護保険のサービス種別ごとに1アカウントずつ（25アカウント）。
//   どの事業所も、1つのIDで3人のケアマネジャーとつながっています（一部は「つながる依頼」の承認待ち）
// ・登場する方はすべて架空です
(() => {
  const T = Date.now();
  const M = 60e3, H = 60 * M, D = 24 * H;
  const PW = 'Demo-pass-123';

  // 毎回同じ内容になるよう、固定の乱数を使う
  let seed = 20261113;
  const rnd = (n) => { seed = (seed * 1103515245 + 12345) % 2147483648; return Math.floor(seed / 65536) % n; };
  const chance = (p) => rnd(1000) < p * 1000;
  const pick = (a) => a[rnd(a.length)];
  const md = (ms) => { const d = new Date(ms); return `${d.getMonth() + 1}月${d.getDate()}日`; };
  const ymd = (ms) => { const d = new Date(ms); return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`; };

  // ---- ケアマネジャー3人 ----
  const CMS = [
    { id: 1, login_id: 'cm-demo', name: '山田 花子', active: 40, ended: 20 },
    { id: 2, login_id: 'cm2-demo', name: '大野 美香', active: 30, ended: 0 },
    { id: 3, login_id: 'cm3-demo', name: '渡部 健太', active: 45, ended: 55 },
  ];

  // ---- サービス事業所（種別ごとに1アカウント） [種別, 事業所名, 担当者, ログインID, 発行したケアマネ] ----
  const SVC = [
    ['訪問介護', 'ひまわり訪問介護', '佐藤 健', 'houmon-demo', 1],
    ['訪問入浴介護', 'アクア訪問入浴', '岡本 良太', 'nyuyoku-demo', 1],
    ['訪問看護', 'みどり訪問看護ステーション', '中村 由美', 'nurse-demo', 1],
    ['訪問リハビリテーション', 'もみじ病院 訪問リハビリ', '野口 直樹', 'houmonreha-demo', 3],
    ['居宅療養管理指導', 'たんぽぽ薬局', '近藤 彩', 'yakkyoku-demo', 1],
    ['通所介護', 'さくらデイサービス', '高橋 恵', 'day-demo', 1],
    ['地域密着型通所介護', '小さなデイ ほっこり', '松田 裕子', 'chiikiday-demo', 3],
    ['認知症対応型通所介護', '認知症デイ やすらぎ', '内田 浩二', 'ninchiday-demo', 3],
    ['通所リハビリテーション', 'あおばクリニック デイケア', '安藤 美穂', 'daycare-demo', 1],
    ['短期入所生活介護', 'ショートステイ松風', '原田 久美', 'short-demo', 1],
    ['短期入所療養介護', 'みなと病院 短期入所療養', '杉本 誠一', 'shortryoyo-demo', 3],
    ['小規模多機能型居宅介護', '小規模多機能 ひだまり', '今村 千尋', 'shotaki-demo', 3],
    ['看護小規模多機能型居宅介護', '看護小規模多機能 えがお', '西川 舞', 'kantaki-demo', 3],
    ['定期巡回・随時対応型訪問介護看護', '定期巡回 24ケア', '藤井 大輔', 'teiki-demo', 1],
    ['夜間対応型訪問介護', '夜間訪問 ほしぞら', '久保 拓也', 'yakan-demo', 3],
    ['福祉用具貸与', 'あおば福祉用具', '村上 剛', 'yougu-demo', 1],
    ['特定福祉用具販売', 'ケアショップ ふくふく', '小島 早苗', 'hanbai-demo', 2],
    ['住宅改修', '住まいの改修 たくみ工務店', '大西 勝也', 'kaishu-demo', 2],
    ['介護老人福祉施設（特養）', '特別養護老人ホーム 望洋苑', '石井 隆', 'tokuyou-demo', 1],
    ['地域密着型介護老人福祉施設', '地域密着特養 かがやきの郷', '吉川 夏美', 'chiikitoku-demo', 2],
    ['介護老人保健施設（老健）', '介護老人保健施設 つばさ', '平野 修', 'roken-demo', 3],
    ['介護医療院', '介護医療院 しおさい', '片山 理恵', 'iryoin-demo', 3],
    ['特定施設入居者生活介護', '介護付き有料老人ホーム さくら館', '菊地 智子', 'yuryo-demo', 2],
    ['地域密着型特定施設入居者生活介護', '地域密着型 ケアハウス すずらん', '堀田 光', 'chiikitokutei-demo', 2],
    ['認知症対応型共同生活介護（グループホーム）', 'グループホーム 陽だまりの家', '桜井 涼子', 'gh-demo', 1],
  ];
  const ST = SVC.map((s) => s[0]);
  const NYUSHO = ST.slice(18); // 入所サービス
  const si = (type) => ST.indexOf(type);

  const db = { users: [], offices: [], links: [], clients: [], messages: [], reads: new Set(), audit: [], seq: 100000 };
  for (const c of CMS) db.users.push({ id: c.id, role: 'cm', cm_id: c.id, office_id: null, login_id: c.login_id, name: c.name, pw: PW, must: false, active: true });

  // 事業所は、ケアマネジャーごとに登録する（同じ事業所でも、ケアマネごとに1件）
  const officeId = (cm, i) => cm * 1000 + i + 1;
  // 返信を許可していない（閲覧のみ）の組み合わせ
  const viewOnly = new Set([`1:${si('特定福祉用具販売')}`, `2:${si('住宅改修')}`]);
  // まだ事業所が承認していない「つながる依頼」
  const pending = new Set([`2:${si('訪問入浴介護')}`, `2:${si('看護小規模多機能型居宅介護')}`, `3:${si('特定福祉用具販売')}`]);
  for (const c of CMS) {
    SVC.forEach(([type, name], i) => db.offices.push({ id: officeId(c.id, i), cm_id: c.id, name, service_type: type, can_post: !viewOnly.has(`${c.id}:${i}`), active: true }));
  }
  SVC.forEach(([, , staff, login, home], i) => {
    const uid = 101 + i;
    db.users.push({ id: uid, role: 'provider', cm_id: home, office_id: officeId(home, i), login_id: login, name: staff, pw: PW, must: false, active: true, svc: i });
    for (const c of CMS) {
      const st = c.id !== home && pending.has(`${c.id}:${i}`) ? 'pending' : 'active';
      db.links.push({ user_id: uid, cm_id: c.id, office_id: officeId(c.id, i), status: st, active: true, at: T - (c.id === home ? 400 : 120 - i * 2) * D });
    }
  });
  const providerOf = (svcIdx) => db.users.find((u) => u.svc === svcIdx);

  // ---- 利用者 ----
  const SEI = ['鈴木', '田中', '伊藤', '渡辺', '山本', '中村', '小林', '加藤', '吉田', '山口', '松本', '井上', '木村', '林', '清水', '斎藤', '山崎', '森', '池田', '橋本',
    '阿部', '石川', '前田', '藤田', '岡田', '後藤', '長谷川', '村田', '遠藤', '青木', '坂本', '福田', '太田', '三浦', '藤原', '岡本', '中島', '原', '小野', '竹内',
    '金子', '和田', '中山', '石田', '上野', '森田', '柴田', '酒井', '工藤', '横山'];
  const MEI = ['一郎', 'キヨ', '正雄', 'ハル', '茂', 'トメ', '清', 'フミ', '勇', '千代', '博', 'ミツ', '実', 'ヨシ子', '武', '静子', '昭', '和子', '進', '幸子',
    '弘', 'タケ', '秀夫', '節子', '利夫', '敏子', '三郎', '文子', '義雄', '春江', '貞夫', 'ツル', '健一', '久子', '勝', 'スミ', '輝男', '美代子', '寛', 'ハナ'];
  const used = new Set();
  const newName = () => { for (;;) { const n = `${pick(SEI)} ${pick(MEI)}`; if (!used.has(n)) { used.add(n); return n; } } };
  const KAIGO = ['要支援1', '要支援2', '要介護1', '要介護2', '要介護3', '要介護4', '要介護5'];
  const LIVE = ['独居', '長女と同居', '夫婦のみ世帯', '長男夫婦と同居', '日中独居', '次女が近所に在住', '息子さんと二人暮らし'];
  const lvOf = () => { const r = rnd(100); return r < 8 ? 0 : r < 18 ? 1 : r < 40 ? 2 : r < 64 ? 3 : r < 80 ? 4 : r < 92 ? 5 : 6; };

  let cid = 0;
  for (const cm of CMS) {
    const mine = [];
    // いま担当している方
    for (let k = 0; k < cm.active; k++) {
      const lv = lvOf();
      const dem = chance(lv >= 3 ? 0.35 : 0.12);
      const s = new Set();
      const extra = [];
      if (dem) extra.push('認知症あり');
      const style = rnd(100);
      if (lv >= 2 && style < 6) { s.add(si('小規模多機能型居宅介護')); if (chance(0.5)) s.add(si('福祉用具貸与')); }
      else if (lv >= 3 && style < 10) { s.add(si('看護小規模多機能型居宅介護')); s.add(si('福祉用具貸与')); }
      else if (lv >= 3 && style < 15) { s.add(si('定期巡回・随時対応型訪問介護看護')); s.add(si('福祉用具貸与')); if (chance(0.5)) s.add(si('通所介護')); }
      else {
        if (chance(lv <= 1 ? 0.6 : 0.5)) s.add(si('訪問介護'));
        if (chance(0.38)) s.add(si('通所介護'));
        else if (chance(0.18)) s.add(si('地域密着型通所介護'));
        if (dem && chance(0.4)) s.add(si('認知症対応型通所介護'));
        if (lv >= 3 && chance(0.4)) s.add(si('訪問看護'));
        if (lv >= 4 && chance(0.35)) s.add(si('訪問入浴介護'));
        if (chance(0.12)) s.add(si('訪問リハビリテーション'));
        if (chance(0.16)) s.add(si('通所リハビリテーション'));
        if (lv >= 3 && chance(0.28)) s.add(si('居宅療養管理指導'));
        if (lv >= 3 && chance(0.25)) s.add(si('短期入所生活介護'));
        if (lv >= 4 && chance(0.12)) s.add(si('短期入所療養介護'));
        if (lv >= 3 && chance(0.07)) s.add(si('夜間対応型訪問介護'));
        if (lv >= 2 && chance(0.55)) s.add(si('福祉用具貸与'));
        if (chance(0.08)) { s.add(si('特定福祉用具販売')); extra.push('入浴用いすを購入予定'); }
        if (chance(0.07)) { s.add(si('住宅改修')); extra.push('手すり取付を検討中'); }
        if (!s.size) s.add(si('訪問介護'));
      }
      // 入所の申し込み・検討（いまは在宅）
      if (lv >= 5 && chance(0.25)) { s.add(si('介護老人福祉施設（特養）')); extra.push('特養に入所申込済み'); }
      else if (lv >= 5 && chance(0.12)) { s.add(si('地域密着型介護老人福祉施設')); extra.push('地域密着特養に申込済み'); }
      else if (lv >= 3 && chance(0.08)) { s.add(si('介護老人保健施設（老健）')); extra.push('老健への入所を検討中'); }
      else if (lv >= 5 && chance(0.06)) { s.add(si('介護医療院')); extra.push('介護医療院を見学予定'); }
      else if (lv >= 2 && chance(0.06)) { s.add(si('特定施設入居者生活介護')); extra.push('有料老人ホームを見学予定'); }
      else if (lv >= 2 && chance(0.04)) { s.add(si('地域密着型特定施設入居者生活介護')); extra.push('ケアハウスへの入居を相談中'); }
      else if (dem && chance(0.3)) { s.add(si('認知症対応型共同生活介護（グループホーム）')); extra.push('グループホームの空き待ち'); }
      const c = { id: ++cid, cm_id: cm.id, name: newName(), lv, note: [KAIGO[lv], pick(LIVE), ...extra].join('・'), archived: false, svc: s };
      db.clients.push(c); mine.push(c);
    }
    // どの事業所にも、そのケアマネの利用者が2人以上いるようにする
    ST.forEach((type, i) => {
      let n = mine.filter((c) => c.svc.has(i)).length;
      const pool = mine.filter((c) => !c.svc.has(i) && c.lv >= (NYUSHO.includes(type) ? 4 : 2));
      while (n < 2 && pool.length) {
        const c = pool.splice(rnd(pool.length), 1)[0];
        c.svc.add(i); n++;
        const add = { '介護老人福祉施設（特養）': '特養に入所申込済み', 地域密着型介護老人福祉施設: '地域密着特養に申込済み', '介護老人保健施設（老健）': '老健への入所を検討中', 介護医療院: '介護医療院を見学予定',
          特定施設入居者生活介護: '有料老人ホームを見学予定', 地域密着型特定施設入居者生活介護: 'ケアハウスへの入居を相談中', '認知症対応型共同生活介護（グループホーム）': 'グループホームの空き待ち',
          特定福祉用具販売: '入浴用いすを購入予定', 住宅改修: '手すり取付を検討中' }[type];
        if (add) c.note += '・' + add;
      }
    });
    // 支援を終えた方（ご逝去・施設入所・担当変更など）
    const ENDED = [
      ['ご逝去', ['訪問看護', '訪問介護', '福祉用具貸与']], ['ご逝去（ご自宅にて看取り）', ['訪問看護', '訪問入浴介護', '福祉用具貸与', '居宅療養管理指導']], ['ご逝去（入院先にて）', ['通所介護', '居宅療養管理指導']],
      ['特養に入所のため担当終了', ['介護老人福祉施設（特養）', '通所介護', '短期入所生活介護']], ['地域密着特養に入所のため担当終了', ['地域密着型介護老人福祉施設', '短期入所生活介護']],
      ['老健に入所のため担当終了', ['介護老人保健施設（老健）', '通所リハビリテーション']], ['介護医療院に入所のため担当終了', ['介護医療院', '訪問看護', '短期入所療養介護']],
      ['有料老人ホームに入居のため担当終了', ['特定施設入居者生活介護', '訪問介護']], ['ケアハウスに入居のため担当終了', ['地域密着型特定施設入居者生活介護', '通所介護']],
      ['グループホームに入居のため担当終了', ['認知症対応型共同生活介護（グループホーム）', '認知症対応型通所介護']], ['小規模多機能の利用開始に伴い担当変更', ['小規模多機能型居宅介護']],
      ['看護小規模多機能の利用開始に伴い担当変更', ['看護小規模多機能型居宅介護']], ['ご家族の転居に伴い、他市の居宅介護支援事業所へ担当変更', ['訪問介護', '通所介護']],
      ['要支援に変更となり、地域包括支援センターへ担当変更', ['通所介護']], ['ご本人の希望により、他の居宅介護支援事業所へ担当変更', ['訪問介護', '福祉用具貸与']],
    ];
    for (let k = 0; k < cm.ended; k++) {
      const [why, types] = k < ENDED.length ? ENDED[k] : pick(ENDED);
      const at = T - (14 + Math.floor((k + 1) * (cm.ended > 30 ? 19 : 26)) + rnd(9)) * D;
      db.clients.push({ id: ++cid, cm_id: cm.id, name: newName(), lv: 3, note: `【終了】${ymd(at)} ${why}（${KAIGO[2 + rnd(5)]}）`, archived: true, svc: new Set(types.map(si)) });
    }
  }
  for (const c of db.clients) { c.office_ids = [...c.svc].sort((a, z) => a - z).map((i) => officeId(c.cm_id, i)); }

  // ---- 連絡のやり取り ----
  const office = (id) => db.offices.find((o) => o.id === id);
  const svcOfOffice = (id) => id % 1000 - 1;
  const linkOf = (cmId, oid) => db.links.find((l) => l.cm_id === cmId && l.office_id === oid && l.status === 'active');
  // この利用者のトークに書き込める事業所アカウント
  const postersOf = (c) => c.office_ids.filter((oid) => office(oid).can_post && linkOf(c.cm_id, oid)).map((oid) => ({ oid, user: providerOf(svcOfOffice(oid)) }));

  const CM_SAY = [
    '来週のサービス担当者会議は、{d}10時からご自宅で行います。ご出席をお願いします。',
    '昨日から右ひざの痛みを訴えています。介助の際は様子を見ていただけますか。',
    '来月からケアプランを変更します。提供票は来週お送りします。',
    'ご家族から、最近食事量が減っているとの相談がありました。気づいたことがあれば教えてください。',
    '年末年始のサービス予定を確認させてください。休業日があれば教えてください。',
    '主治医から、血圧の薬が変更になったと連絡がありました。ふらつきに注意してください。',
    '介護認定の更新で、来月に認定調査があります。日程が決まったらお知らせします。',
    '長女さんから、夜に何度も電話がかかってくると相談がありました。日中の様子で変わったことはありますか。',
    '{d}にモニタリングで伺います。最近のご様子を教えてください。',
    '区分変更の結果が出ました。要介護度が上がりましたので、プランを見直します。',
  ];
  const SAY = {
    訪問介護: ['本日の訪問時、冷蔵庫に期限切れの食品が多くありました。ご家族への共有をお願いします。', '承知しました。サービス提供責任者が伺います。', '本日は買い物と掃除を実施しました。お変わりありません。', '室内は杖で歩けています。玄関の段差だけ見守りが必要です。'],
    訪問入浴介護: ['本日の入浴は問題なく実施しました。背中に軽い発赤があります。', '入浴前の血圧が高めだったため、本日は清拭に変更しました。', '承知しました。次回から湯温を少し下げます。'],
    訪問看護: ['血圧 138/82、体温 36.5℃。むくみは軽度です。', '服薬の飲み忘れが2回ありました。お薬カレンダーの導入を提案します。', '主治医に報告済みです。次回訪問で再確認します。', '褥瘡（床ずれ）は改善傾向です。'],
    訪問リハビリテーション: ['トイレまでの歩行は、見守りで安定してきました。', '自主トレのプリントをお渡ししました。ご家族にも共有ずみです。', '承知しました。階段の練習を追加します。'],
    居宅療養管理指導: ['お薬を一包化に変更しました。飲みやすくなったとのことです。', '残薬を確認しました。湿布が多めに余っています。', '主治医に処方の見直しを提案しました。結果が出たらお伝えします。'],
    通所介護: ['本日の入浴は問題なく実施しました。', '昼食は8割ほど召し上がりました。', '承知しました。送迎時間を調整します。', 'レクリエーションでは、歌の時間をとても楽しまれていました。'],
    地域密着型通所介護: ['本日もお変わりなく過ごされました。', '少人数のため、個別の体操を多めに取り入れています。', '承知しました。利用日を火曜に変更します。'],
    認知症対応型通所介護: ['本日は落ち着いて過ごされました。午後に一度、帰宅願望がありました。', '承知しました。ご家族への連絡帳にも書いておきます。', '食事の際、箸が進みにくい様子でした。スプーンに変えると召し上がりました。'],
    通所リハビリテーション: ['歩行訓練は杖で20m可能になりました。', '体力測定の結果をお送りします。前回より改善しています。', '承知しました。リハビリ計画を見直します。'],
    短期入所生活介護: ['ショートステイ中はよく眠れていました。食事も全量召し上がりました。', '次回の利用日を{d}で承りました。', '空きが出ましたので、{d}からの利用が可能です。'],
    短期入所療養介護: ['医療的な管理が必要とのことで、看護師が対応します。', '次回の利用日を{d}で承りました。', '退所時に、リハビリの経過をまとめてお渡しします。'],
    小規模多機能型居宅介護: ['本日は通いのあと、夕方に訪問で服薬確認をしました。', '今週は泊まりを1泊入れています。落ち着いて過ごされました。', '承知しました。訪問の回数を増やします。'],
    看護小規模多機能型居宅介護: ['看護師が訪問し、点滴を実施しました。経過は良好です。', '本日の泊まりは、夜間2回の体位交換で安眠されていました。', '主治医の指示書を受け取りました。'],
    '定期巡回・随時対応型訪問介護看護': ['昨夜2時に随時対応のコールがあり、訪問しました。トイレ介助のみで問題ありません。', '定期訪問は1日4回で安定しています。', '承知しました。夜間の巡回を1回追加します。'],
    夜間対応型訪問介護: ['夜間の巡回で、おむつ交換を実施しました。良眠されています。', '昨夜コールがあり訪問しました。ベッドからずり落ちかけていましたが、けがはありません。'],
    福祉用具貸与: ['手すりの高さを調整しました。', '車いすの点検を行いました。異常ありません。', '介護ベッドの搬入日を{d}で調整しました。'],
    特定福祉用具販売: ['入浴用いすのカタログをお送りします。', 'ご注文の品が入荷しました。{d}にお届けします。'],
    住宅改修: ['手すり取付の見積もりをお送りします。ご確認ください。', '工事は{d}の予定です。理由書の作成をお願いします。', '工事が完了しました。写真を添付して報告書を作成します。'],
    '介護老人福祉施設（特養）': ['入所の申し込みを受け付けました。順番が近づいたらご連絡します。', '入所判定会議の結果は来月お知らせします。', '来月、空きが出る見込みです。ご家族のご意向を確認いただけますか。'],
    地域密着型介護老人福祉施設: ['申し込みを受け付けました。現在の待機は5名です。', '見学の日程を{d}で承りました。'],
    '介護老人保健施設（老健）': ['入所の判定会議で、受け入れ可能となりました。', 'リハビリ目的の入所は、3か月程度を目安にしています。', '退所前のカンファレンスを{d}に行います。'],
    介護医療院: ['見学のご予約を{d}で承りました。', '医療的な処置が必要な方も受け入れ可能です。主治医の情報提供書をお願いします。'],
    特定施設入居者生活介護: ['見学のご予約を{d}で承りました。', '体験入居は1週間から可能です。'],
    地域密着型特定施設入居者生活介護: ['入居のご相談ありがとうございます。空き状況をお知らせします。', '面談の日程を{d}で調整させてください。'],
    '認知症対応型共同生活介護（グループホーム）': ['現在の空き待ちは3名です。順番が近づいたらご連絡します。', '見学の際の様子から、受け入れは可能と考えています。'],
  };
  const fill = (s) => s.replace('{d}', md(T + (3 + rnd(10)) * D));
  const sayOf = (svcIdx) => fill(pick(SAY[ST[svcIdx]]));
  const cmSay = () => fill(pick(CM_SAY));
  const say = (c, author, body, at) => { db.messages.push({ id: ++db.seq, client_id: c.id, author_id: author, body, at: Math.min(at, T - 2 * M) }); };

  // ふだんのやり取り（直近3週間）
  for (const c of db.clients) {
    if (c.archived || chance(0.15)) continue;
    const posters = postersOf(c);
    let t = T - (rnd(20) + 1) * D - rnd(10) * H;
    const n = 1 + rnd(5);
    for (let k = 0; k < n; k++) {
      const p = posters.length && (k % 2 === 1 || chance(0.35)) ? pick(posters) : null;
      if (p) say(c, p.user.id, sayOf(svcOfOffice(p.oid)), t); else say(c, c.cm_id, cmSay(), t);
      t += (rnd(30) + 1) * H;
      if (t > T) t = T - rnd(90) * M;
    }
  }

  // ---- ていねいに作った見本の会話（一覧の上のほうに出ます） ----
  const find = (cmId, types, minLv = 2) => db.clients.find((c) => c.cm_id === cmId && !c.archived && !c.used && c.lv >= minLv && types.every((t) => c.svc.has(si(t))))
    || db.clients.find((c) => c.cm_id === cmId && !c.archived && !c.used && c.lv >= minLv);
  const ensure = (c, types) => { for (const t of types) { c.svc.add(si(t)); } c.office_ids = [...c.svc].sort((a, z) => a - z).map((i) => officeId(c.cm_id, i)); c.used = true; };
  const P = (type) => providerOf(si(type)).id;
  function story(cmId, types, lines, minLv) {
    const c = find(cmId, types, minLv);
    if (!c) return null;
    ensure(c, types);
    for (const [ago, who, body] of lines) say(c, who === 'cm' ? cmId : P(who), body, T - ago);
    return c;
  }
  const tomorrow = md(T + D);
  for (const cm of CMS) {
    // 退院の調整（複数の事業所が同じトークでやり取り）
    story(cm.id, ['訪問看護', '福祉用具貸与', '訪問介護'], [
      [27 * H, 'cm', `${tomorrow}の午前に退院が決まりました。退院後は、訪問看護・福祉用具・ヘルパーで支えます。皆さん、よろしくお願いします。`],
      [26 * H, '福祉用具貸与', `介護ベッドとポータブルトイレは、${tomorrow}の9時に搬入します。`],
      [25 * H, '訪問看護', '承知しました。退院当日の15時に初回訪問します。主治医の指示書は受け取りずみです。'],
      [20 * H, '訪問介護', '夕方の訪問を、退院当日から入れられます。17時でいかがでしょうか。'],
      [19 * H, 'cm', '17時でお願いします。長女さんにも伝えました。'],
      [95 * M, '訪問看護', '退院時カンファレンスの内容を確認しました。食事はとろみ付きでお願いします。'],
    ], 4);
    // デイからの気づき → ケアマネ → 訪問看護
    story(cm.id, ['通所介護', '訪問看護'], [
      [2 * D + 3 * H, '通所介護', '本日、送迎の車に乗る際にふらつきがありました。転倒はしていません。'],
      [2 * D + 2 * H, 'cm', 'ありがとうございます。訪問看護さん、次回の訪問で血圧を気にかけていただけますか。'],
      [2 * D + 1 * H, '訪問看護', '承知しました。明日伺います。'],
      [40 * M, '訪問看護', '血圧 102/60 と低めでした。主治医に報告し、降圧薬が1種類減ることになりました。'],
    ], 3);
    // ショートステイの空き
    story(cm.id, ['短期入所生活介護'], [
      [4 * H, '短期入所生活介護', `${md(T + 6 * D)}から3泊の空きが出ました。ご利用されますか。`],
      [3 * H, 'cm', 'ありがとうございます。ご家族に確認して、今日中にお返事します。'],
      [25 * M, 'cm', 'ご家族の了承が取れました。3泊でお願いします。'],
    ], 3);
    // 特養の入所調整
    story(cm.id, ['介護老人福祉施設（特養）'], [
      [3 * D, '介護老人福祉施設（特養）', '来月、1床空く見込みです。入所のご意向に変わりはないでしょうか。'],
      [3 * D - 2 * H, 'cm', '長男さんに確認します。少しお時間をください。'],
      [12 * M, 'cm', '長男さんから、ぜひお願いしたいとのお返事でした。面談の日程を調整させてください。'],
    ], 4);
  }
  // 事業所からの新しい報告（ケアマネはまだ読んでいない）
  for (const cm of CMS) {
    const fresh = db.clients.filter((c) => c.cm_id === cm.id && !c.archived && !c.used && postersOf(c).length).slice(0, 4 + cm.id);
    fresh.forEach((c, k) => { const p = pick(postersOf(c)); say(c, p.user.id, sayOf(svcOfOffice(p.oid)), T - (20 + k * 47) * M); });
  }
  // ケアマネから事業所への新しい連絡（事業所はまだ読んでいない）
  SVC.forEach((_, i) => {
    for (const cm of CMS) {
      const c = db.clients.find((x) => x.cm_id === cm.id && !x.archived && x.svc.has(i) && linkOf(cm.id, officeId(cm.id, i)));
      if (c && chance(0.6)) say(c, cm.id, cmSay(), T - (30 + rnd(600)) * M);
    }
  });

  // ---- 添付ファイルの見本（CSV・写真・PDF） ----
  const files = new Map();
  function addFile(clientId, authorId, name, mime, blob, at, caption) {
    const mid = ++db.seq;
    db.messages.push({ id: mid, client_id: clientId, author_id: authorId, body: caption || `📎 ${name}`, at });
    files.set(mid, { id: ++db.seq, message_id: mid, client_id: clientId, name, mime, size: blob.size, blob });
  }
  function samplePng() {
    try {
      const c = document.createElement('canvas'); c.width = 640; c.height = 440;
      const g = c.getContext('2d');
      g.fillStyle = '#fffaf0'; g.fillRect(0, 0, 640, 440);
      g.fillStyle = '#333'; g.font = 'bold 30px sans-serif'; g.fillText('お薬カレンダー（見本）', 24, 50);
      const days = ['月', '火', '水', '木', '金', '土', '日'], times = ['朝', '昼', '夕', '寝る前'];
      g.font = 'bold 22px sans-serif';
      days.forEach((d, i) => g.fillText(d, 110 + i * 72, 100));
      times.forEach((t, j) => {
        g.fillText(t, 20, 160 + j * 72);
        days.forEach((_, i) => {
          g.fillStyle = (i * 4 + j) % 5 === 3 ? '#f4b6b6' : '#cdebd5';
          g.fillRect(96 + i * 72, 120 + j * 72, 62, 58);
          g.fillStyle = '#333';
        });
      });
      const bin = atob(c.toDataURL('image/png').split(',')[1]);
      const u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      return new Blob([u8], { type: 'image/png' });
    } catch { return null; }
  }
  function samplePdf() {
    const objs = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
      null,
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    ];
    const text = 'BT /F1 22 Tf 60 770 Td (Care Plan - sample document) Tj 0 -40 Td /F1 14 Tf (This is a sample PDF for the preview.) Tj ET';
    objs[3] = `<< /Length ${text.length} >>\nstream\n${text}\nendstream`;
    let out = '%PDF-1.4\n'; const offs = [];
    objs.forEach((o, i) => { offs.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
    const x = out.length;
    out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offs.map((n) => String(n).padStart(10, '0') + ' 00000 n \n').join('');
    out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${x}\n%%EOF`;
    return new Blob([out], { type: 'application/pdf' });
  }
  for (const cm of CMS) {
    const nurse = db.clients.find((c) => c.cm_id === cm.id && !c.archived && c.svc.has(si('訪問看護')) && linkOf(cm.id, officeId(cm.id, si('訪問看護'))));
    const home = db.clients.find((c) => c.cm_id === cm.id && !c.archived && c.svc.has(si('訪問介護')) && c !== nurse);
    const csv = '日付,血圧（上）,血圧（下）,脈拍,体温,メモ\n11/3,142,84,72,36.4,むくみ軽度\n11/5,138,82,70,36.5,\n11/7,136,80,74,36.6,服薬の飲み忘れ1回\n11/9,140,85,71,36.4,\n11/11,134,80,70,36.5,\n';
    if (nurse) addFile(nurse.id, P('訪問看護'), '11月_バイタル記録.csv', 'text/csv', new Blob([csv], { type: 'text/csv' }), T - (6 + cm.id) * H, '11月のバイタル記録です。血圧がやや高めで推移しています。');
    const png = samplePng();
    if (home && png) addFile(home.id, P('訪問介護'), 'お薬カレンダー.png', 'image/png', png, T - (5 + cm.id) * H, '本日、お薬カレンダーの飲み忘れ（赤い所）を確認しました。');
    if (home) addFile(home.id, cm.id, 'ケアプラン_見本.pdf', 'application/pdf', samplePdf(), T - (4 + cm.id) * H, '来月からのケアプランです。ご確認ください。');
  }

  // id を時刻順に振り直す（添付の紐づけも合わせる）
  db.messages.sort((a, z) => a.at - z.at);
  {
    const remap = new Map();
    db.messages.forEach((m, i) => { remap.set(m.id, i + 1); m.id = i + 1; });
    for (const [oldId, f] of [...files]) { files.delete(oldId); f.message_id = remap.get(oldId); files.set(f.message_id, f); }
    db.seq = db.messages.length + 1000;
  }
  // 既読：トークに入れる人（ケアマネと、つながっている事業所）のうち、書いた人以外。直近の分は未読のまま
  const members = (c) => [c.cm_id, ...c.office_ids.filter((oid) => linkOf(c.cm_id, oid)).map((oid) => providerOf(svcOfOffice(oid)).id)];
  const clientById = new Map(db.clients.map((c) => [c.id, c]));
  for (const m of db.messages) {
    const age = T - m.at;
    const c = clientById.get(m.client_id);
    for (const u of members(c)) {
      if (u === m.author_id) continue;
      // 30時間より前は全員が既読。それより新しいものは、6時間以上たっていれば半分くらいの人が読んでいる
      if (age > 30 * H || (age > 6 * H && (u + m.id) % 2 === 0)) db.reads.add(`${u}:${m.id}`);
    }
  }
  for (const c of db.clients) { delete c.svc; delete c.used; delete c.lv; }

  let session = null;
  const nextId = () => ++db.seq;
  const err = (status, error) => ({ status, body: { error } });
  const ok = (body) => ({ status: 200, body });
  // 操作の記録は、どのケアマネの記録かを持たせる（事業所の操作は、相手のケアマネの記録に入る）
  const log = (u, action, target, cm) => db.audit.unshift({ id: nextId(), at: Date.now(), action, target, ip: 'デモ', login_id: u?.login_id, name: u?.name, cm: cm ?? u?.cm_id });
  // デモ：通知をオンにしていると、送った連絡に相手から自動で返事が来て、サーバーの「合図」をまねて画面に知らせる
  let demoPush = false;
  // 相手役：ケアマネが見ている → 返信できる事業所のどれか／事業所が見ている → 担当のケアマネ
  function counterpart(u, c) {
    if (u.role !== 'cm') return { user: db.users.find((x) => x.id === c.cm_id), text: cmSay() };
    const p = postersOf(c);
    if (!p.length) return null;
    const one = p[rnd(p.length)];
    return { user: one.user, text: sayOf(svcOfOffice(one.oid)) };
  }
  function demoReply(u, c, wait, text) {
    const other = counterpart(u, c);
    if (!other || (wait && !demoPush)) return false;
    const post = () => {
      db.messages.push({ id: nextId(), client_id: c.id, author_id: other.user.id, body: text || other.text, at: Date.now() });
      if (demoPush) window.dispatchEvent(new Event('careble-signal'));
    };
    if (wait) setTimeout(post, wait); else post();
    return true;
  }
  // テスト用：いまログインしている人あてに、相手からの連絡を1件届ける
  window.demoInject = (clientId, text) => { const c = db.clients.find((x) => x.id === clientId); return !!(session && c && demoReply(session, c, 0, text)); };
  // デモの画面から使う：相手から連絡が1件届く（name を渡すと、その利用者のトークに届く）
  window.demoArrive = (name) => {
    const u = session;
    if (!u) return null;
    const vis = db.clients.filter((c) => visible(u, c) && counterpart(u, c));
    const c = (name && vis.find((x) => x.name === name)) || vis[rnd(Math.min(vis.length, 12))];
    if (!c || !demoReply(u, c, 0)) return null;
    return c.name;
  };
  window.demoPushOn = () => demoPush;
  window.demoSession = () => (session ? { id: session.id, role: session.role, login_id: session.login_id, name: session.name } : null);
  // 切り替えボタン用の一覧
  window.demoInfo = {
    cms: CMS.map((c) => ({ login_id: c.login_id, name: c.name, total: c.active + c.ended, active: c.active })),
    providers: SVC.map(([type, name, staff, login], i) => ({ login_id: login, type, office: name, staff, group: i >= 18 ? '入所サービス' : '居宅サービス' })),
  };
  const userOf = (id) => db.users.find((x) => x.id === id);
  // 事業所アカウントが、そのケアマネとつながっていて使える状態か（使えるならそのケアマネ側の事業所を返す）
  const linkFor = (u, cmId) => {
    const l = db.links.find((x) => x.user_id === u.id && x.cm_id === cmId && x.status === 'active' && x.active);
    return l && office(l.office_id)?.active ? l : null;
  };
  const activeLinks = (u) => db.links.filter((l) => l.user_id === u.id && linkFor(u, l.cm_id)).sort((a, z) => a.at - z.at);
  const pub = (u) => {
    if (u.role === 'cm') return { id: u.id, role: u.role, login_id: u.login_id, name: u.name, must_change_pw: u.must, font_size: u.font_size || null, pref: u.pref || null, office: null };
    const act = activeLinks(u);
    const l = act.find((x) => x.cm_id === u.cm_id) || act[0];
    const o = l ? office(l.office_id) : null;
    return {
      id: u.id, role: u.role, login_id: u.login_id, name: u.name, must_change_pw: u.must, font_size: u.font_size || null, pref: u.pref || null,
      office: o ? { id: o.id, name: o.name, can_post: o.can_post, service_type: o.service_type } : null,
      links: act.length, pending: db.links.filter((x) => x.user_id === u.id && x.status === 'pending').length,
    };
  };
  const visible = (u, c) => {
    if (c.archived) return false;
    if (u.role === 'cm') return c.cm_id === u.cm_id;
    const l = linkFor(u, c.cm_id);
    return !!l && c.office_ids.includes(l.office_id);
  };
  const postable = (u, c) => u.role === 'cm' || !!office(linkFor(u, c.cm_id)?.office_id)?.can_post;

  function handle(method, path, q, b) {
    if (method === 'POST' && path === '/api/login') {
      const u = db.users.find((x) => x.login_id === b.login_id);
      if (!u || u.pw !== b.password || !u.active) { log(u, 'login_fail', b.login_id); return err(401, 'ログインIDまたはパスワードが違います'); }
      session = u; demoPush = false; log(u, 'login_success');
      return ok({ token: 'demo-token-000000000000000', user: pub(u) });
    }
    const u = session;
    if (!u) return err(401, 'ログインしてください');
    if (path === '/api/me') return ok({ user: pub(u), push_key: 'demo' });
    if (path === '/api/me/prefs') {
      if (b.font_size === undefined && b.pref === undefined) return err(400, '変更する内容がありません');
      if (b.font_size !== undefined) {
        if (!['normal', 'large', 'xlarge'].includes(b.font_size)) return err(400, '文字の大きさが不正です');
        u.font_size = b.font_size;
      }
      if (b.pref !== undefined) u.pref = b.pref;
      return ok({ ok: true });
    }
    if (path === '/api/logout') { log(u, 'logout'); session = null; return ok({ ok: true }); }
    if (path === '/api/password') {
      if (b.current !== u.pw) return err(400, '現在のパスワードが違います');
      if (!b.next || b.next.length < 10) return err(400, 'パスワードは10文字以上にしてください');
      u.pw = b.next; u.must = false; log(u, 'password_change'); return ok({ ok: true });
    }
    // 通知の合図（デモではブラウザの中でまねをする）
    if (path === '/api/push/key') return ok({ key: 'demo' });
    if (path === '/api/push/subscribe') { demoPush = true; return ok({ ok: true }); }
    if (path === '/api/push/unsubscribe') { demoPush = false; return ok({ ok: true }); }
    if (path === '/api/unread') {
      let rooms = 0, unread = 0, latest = 0;
      db.clients.filter((c) => visible(u, c)).forEach((c) => {
        const un = db.messages.filter((m) => m.client_id === c.id && m.author_id !== u.id && !db.reads.has(`${u.id}:${m.id}`));
        if (un.length) { rooms++; unread += un.length; latest = Math.max(latest, ...un.map((m) => m.id)); }
      });
      return ok({ rooms, unread, latest });
    }
    if (path === '/api/rooms') {
      const of = Number(q.get('office_id') || 0);
      const st = q.get('service_type');
      const rooms = db.clients.filter((c) => visible(u, c) && (!of || c.office_ids.includes(of))
        && (!st || c.office_ids.some((id) => office(id).active && office(id).service_type === st))).map((c) => {
        const ms = db.messages.filter((m) => m.client_id === c.id);
        const last = ms[ms.length - 1];
        return {
          id: c.id, name: c.name,
          ...(u.role === 'cm' ? {} : { cm: { id: c.cm_id, name: userOf(c.cm_id).name } }),
          offices: c.office_ids.map((id) => ({ id, name: office(id).name, service_type: office(id).service_type })),
          last_message: last ? last.body.slice(0, 60) : '', last_at: last ? last.at : T - 5 * D,
          unread: ms.filter((m) => m.author_id !== u.id && !db.reads.has(`${u.id}:${m.id}`)).length,
        };
      }).sort((a, z) => z.last_at - a.last_at);
      if (u.role === 'cm') return ok({ rooms });
      return ok({ rooms, cms: activeLinks(u).map((l) => ({ id: l.cm_id, name: userOf(l.cm_id).name })) });
    }
    let m;
    if ((m = path.match(/^\/api\/rooms\/(\d+)\/messages$/))) {
      const c = db.clients.find((x) => x.id === Number(m[1]));
      if (!c || !visible(u, c)) return err(404, '見つかりません');
      const canPost = postable(u, c);
      if (method === 'POST') {
        if (!canPost) return err(403, 'この事業所は閲覧のみです');
        const text = (b.body || '').trim();
        if (!text) return err(400, 'メッセージを入力してください');
        const id = nextId();
        db.messages.push({ id, client_id: c.id, author_id: u.id, body: text, at: Date.now() });
        log(u, 'message_post', `${c.name} 様`, c.cm_id);
        demoReply(u, c, 6000);
        return ok({ ok: true, id });
      }
      const after = Number(q.get('after') || 0);
      const list = db.messages.filter((x) => x.client_id === c.id && x.id > after);
      list.forEach((x) => { if (x.author_id !== u.id) db.reads.add(`${u.id}:${x.id}`); });
      if (!after) log(u, 'room_view', `${c.name} 様`, c.cm_id);
      const roomIds = db.messages.filter((x) => x.client_id === c.id).map((x) => x.id);
      const reads = db.users.filter((y) => y.id !== u.id).map((y) => Math.max(0, ...roomIds.filter((id) => db.reads.has(`${y.id}:${id}`)))).filter((x) => x > 0);
      return ok({
        reads,
        can_post: canPost,
        messages: list.map((x) => {
          const a = db.users.find((y) => y.id === x.author_id);
          return {
            id: x.id, body: x.body, created_at: x.at, mine: x.author_id === u.id, author: a.name, author_role: a.role,
            author_office: a.role === 'provider' ? office(db.links.find((l) => l.user_id === a.id && l.cm_id === c.cm_id)?.office_id)?.name || '' : '',
            file: files.has(x.id) ? (({ id, name, mime, size }) => ({ id, name, mime, size }))(files.get(x.id)) : null,
            read_count: x.author_id === u.id ? db.users.filter((y) => y.id !== u.id && db.reads.has(`${y.id}:${x.id}`)).length : null,
          };
        }),
      });
    }
    if (u.role === 'provider' && path === '/api/links') {
      return ok({ links: db.links.filter((l) => l.user_id === u.id).sort((a, z) => (a.status === 'pending' ? 0 : 1) - (z.status === 'pending' ? 0 : 1) || a.at - z.at).map((l) => {
        const o = office(l.office_id);
        return { cm_id: l.cm_id, cm_name: userOf(l.cm_id).name, office_name: o?.name || '', status: l.status, active: !!(l.active && o?.active), can_post: !!o?.can_post, home: l.cm_id === u.cm_id, created_at: l.at };
      }) });
    }
    if (u.role === 'provider' && (m = path.match(/^\/api\/links\/(\d+)\/(accept|remove)$/))) {
      const l = db.links.find((x) => x.user_id === u.id && x.cm_id === Number(m[1]));
      if (!l) return err(404, '見つかりません');
      const was = l.status;
      if (m[2] === 'accept') l.status = 'active'; else db.links.splice(db.links.indexOf(l), 1);
      log(u, m[2] === 'accept' ? 'link_accept' : (was === 'pending' ? 'link_reject' : 'link_remove'), u.login_id, l.cm_id);
      return ok({ ok: true });
    }
    if (u.role !== 'cm') return err(403, 'この操作はケアマネジャーのみ可能です');
    // 事業所の名簿（デモでは、どの県・種別でも同じ見本を出します）
    if (path.startsWith('/api/directory/')) {
      const type = q.get('type') || '';
      const none = ['居宅療養管理指導', '住宅改修', 'その他'].includes(type);
      const cities = ['葵区', '駿河区', '清水区'];
      const names = ['あさひ', 'ふじのくに', 'みかん', 'お茶の里', 'するが', 'しみず', 'はごろも', 'やまびこ'];
      const all = none ? [] : cities.flatMap((c, i) => names.slice(0, 5 + i).map((n, k) => ({
        city: '見本市' + c, name: `${n}${type.replace(/（.*$/, '')}（見本）`, address: `見本市${c}見本町${k + 1}-${i + 1}`, tel: `054-000-${String(1000 + i * 10 + k)}`, office_no: `22${i}${k}000000`,
      })));
      if (path === '/api/directory/status') return ok({ available: !none, codes: none ? [] : ['000'], missing: [], count: all.length, imported_at: Date.now() - 86400000 });
      if (path === '/api/directory/cities') return ok({ cities: [...new Set(all.map((x) => x.city))].map((c) => ({ city: c, n: all.filter((x) => x.city === c).length })) });
      if (path === '/api/directory/list') {
        const c = q.get('city'), kw = (q.get('q') || '').trim();
        return ok({ offices: all.filter((x) => (!c || x.city === c) && (!kw || x.name.includes(kw))) });
      }
      return ok({ ok: true });
    }
    if (path === '/api/offices' && method === 'GET') {
      return ok({ offices: db.offices.filter((o) => o.cm_id === u.cm_id).map((o) => ({ ...o, client_count: db.clients.filter((c) => !c.archived && c.office_ids.includes(o.id)).length })) });
    }
    if (path === '/api/offices' && method === 'POST') {
      if (!b.name?.trim()) return err(400, '事業所名を入力してください');
      const id = nextId(); db.offices.push({ id, cm_id: u.cm_id, name: b.name.trim(), service_type: b.service_type || 'その他', can_post: !!b.can_post, active: true }); log(u, 'office_create', b.name);
      return ok({ ok: true, id });
    }
    if ((m = path.match(/^\/api\/offices\/(\d+)$/))) {
      const o = office(Number(m[1])); if (!o || o.cm_id !== u.cm_id) return err(404, '見つかりません');
      if (b.name != null) o.name = b.name.trim();
      if (b.can_post != null) o.can_post = !!b.can_post;
      if (b.service_type != null) o.service_type = b.service_type;
      if (b.active != null) o.active = !!b.active;
      log(u, 'office_update', o.name); return ok({ ok: true });
    }
    if ((m = path.match(/^\/api\/offices\/(\d+)\/delete$/))) {
      const o = office(Number(m[1])); if (!o || o.cm_id !== u.cm_id) return err(404, '見つかりません');
      for (const c of db.clients) if (c.cm_id === u.cm_id) c.office_ids = c.office_ids.filter((x) => x !== o.id);
      db.links = db.links.filter((l) => !(l.cm_id === u.cm_id && l.office_id === o.id));
      db.offices.splice(db.offices.indexOf(o), 1);
      log(u, 'office_delete', o.name); return ok({ ok: true });
    }
    if ((m = path.match(/^\/api\/clients\/(\d+)\/delete$/))) {
      const c = db.clients.find((x) => x.id === Number(m[1])); if (!c || c.cm_id !== u.cm_id) return err(404, '見つかりません');
      db.messages = db.messages.filter((x) => x.client_id !== c.id);
      for (const [k, f] of [...files]) if (f.client_id === c.id) files.delete(k);
      db.clients.splice(db.clients.indexOf(c), 1);
      log(u, 'client_delete', c.name); return ok({ ok: true });
    }
    if (path === '/api/clients' && method === 'GET') return ok({ clients: db.clients.filter((c) => c.cm_id === u.cm_id).map((c) => ({ ...c })).sort((a, z) => a.archived - z.archived) });
    if (path === '/api/clients' && method === 'POST') {
      if (!b.name?.trim()) return err(400, '利用者名を入力してください');
      const id = nextId(); db.clients.push({ id, cm_id: u.cm_id, name: b.name.trim(), note: b.note || '', archived: false, office_ids: b.office_ids || [] }); log(u, 'client_create', b.name);
      return ok({ ok: true, id });
    }
    if ((m = path.match(/^\/api\/clients\/(\d+)$/))) {
      const c = db.clients.find((x) => x.id === Number(m[1])); if (!c || c.cm_id !== u.cm_id) return err(404, '見つかりません');
      if (b.name != null) c.name = b.name.trim();
      if (b.note != null) c.note = b.note;
      if (b.archived != null) c.archived = !!b.archived;
      if (b.office_ids != null) c.office_ids = b.office_ids;
      log(u, 'client_update', c.name); return ok({ ok: true });
    }
    const others = (x) => db.links.filter((l) => l.user_id === x.id && l.cm_id !== u.cm_id && l.status === 'active').length;
    if (path === '/api/accounts' && method === 'GET') {
      return ok({ accounts: db.links.filter((l) => l.cm_id === u.cm_id).sort((a, z) => a.at - z.at).map((l) => {
        const x = userOf(l.user_id);
        const last = db.audit.find((a) => a.login_id === x.login_id && a.action === 'login_success');
        return { id: x.id, login_id: x.login_id, name: x.name, office_id: l.office_id, status: l.status, active: !!(l.active && x.active), locked: false, home: x.cm_id === u.cm_id, shared: others(x) > 0, last_login: last ? last.at : (l.status === 'active' ? T - 3 * H : null) };
      }) });
    }
    if (path === '/api/accounts' && method === 'POST') {
      const lid = String(b.login_id || '').normalize('NFKC').trim();
      if (!/^[A-Za-z0-9._-]{4,64}$/.test(lid)) return err(400, 'ログインIDは、半角の英字・数字で4文字以上にしてください（例：1234）');
      const ex = db.users.find((x) => x.login_id === lid);
      if (ex) return err(409, ex.role === 'provider' ? 'このログインIDは、すでに発行されています。同じ事業所なら「発行済みのIDとつなぐ」を使ってください' : 'このログインIDは使われています');
      if (!b.name?.trim()) return err(400, '担当者名を入力してください');
      const id = nextId(); db.users.push({ id, role: 'provider', cm_id: u.cm_id, office_id: b.office_id, login_id: lid, name: b.name.trim(), pw: b.password, must: true, active: true });
      db.links.push({ user_id: id, cm_id: u.cm_id, office_id: b.office_id, status: 'active', active: true, at: Date.now() });
      log(u, 'account_create', lid); return ok({ ok: true, id });
    }
    if (path === '/api/accounts/link' && method === 'POST') {
      const lid = String(b.login_id || '').normalize('NFKC').trim();
      const x = db.users.find((y) => y.login_id === lid && y.role === 'provider' && y.active);
      if (!x) return err(404, 'このログインIDの事業所アカウントは見つかりません。IDを事業所に確認してください');
      const ex = db.links.find((l) => l.user_id === x.id && l.cm_id === u.cm_id);
      if (ex) return err(409, ex.status === 'pending' ? 'すでに依頼しています。事業所の承認を待っています' : 'すでにつながっています');
      db.links.push({ user_id: x.id, cm_id: u.cm_id, office_id: b.office_id, status: 'pending', active: true, at: Date.now() });
      log(u, 'account_link_request', lid); return ok({ ok: true, id: x.id });
    }
    if ((m = path.match(/^\/api\/accounts\/(\d+)$/))) {
      const l = db.links.find((y) => y.user_id === Number(m[1]) && y.cm_id === u.cm_id);
      const x = l && userOf(l.user_id);
      if (!x) return err(404, '見つかりません');
      const home = x.cm_id === u.cm_id;
      if (b.remove) {
        if (home) return err(400, 'このケアマネが発行したアカウントです。使わなくなったら「停止」してください');
        db.links.splice(db.links.indexOf(l), 1); log(u, 'account_unlink', x.login_id); return ok({ ok: true });
      }
      if (b.password != null) {
        if (!home) return err(403, 'パスワードの再発行は、このアカウントを発行したケアマネジャーだけができます');
        if (others(x)) return err(403, 'ほかのケアマネジャーともつながっているため、ここでは再発行できません。事業所の方ご自身で「パスワード変更」をしてもらってください');
        x.pw = b.password; x.must = true; log(u, 'account_reset_pw', x.login_id);
      }
      if (b.active != null) {
        l.active = !!b.active;
        if (home && !others(x)) x.active = !!b.active;
        log(u, b.active ? 'account_enable' : 'account_disable', x.login_id);
      }
      return ok({ ok: true });
    }
    if (path === '/api/audit') return ok({ logs: db.audit.filter((a) => a.cm === u.cm_id).slice(0, 100) });
    return err(404, '見つかりません');
  }

  const realFetch = window.fetch.bind(window);
  const jsonRes = (r) => new Response(JSON.stringify(r.body), { status: r.status, headers: { 'Content-Type': 'application/json' } });
  window.fetch = async (input, init = {}) => {
    const url = String(input);
    if (!url.startsWith('demo/')) return realFetch(input, init);
    const [path, qs] = url.slice(4).split('?');
    const method = (init.method || 'GET').toUpperCase();
    await new Promise((res) => setTimeout(res, 120));
    let m;
    if ((m = path.match(/^\/api\/attachments\/(\d+)$/))) {
      const f = [...files.values()].find((x) => x.id === Number(m[1]));
      const c = f && db.clients.find((x) => x.id === f.client_id);
      if (!session || !f || !visible(session, c)) return jsonRes(err(404, '見つかりません'));
      log(session, 'file_view', `${c.name} 様`, c.cm_id);
      return new Response(f.blob, { status: 200, headers: { 'Content-Type': f.mime } });
    }
    if ((m = path.match(/^\/api\/rooms\/(\d+)\/attachments$/)) && method === 'POST') {
      const u = session; const c = db.clients.find((x) => x.id === Number(m[1]));
      if (!u || !c || !visible(u, c)) return jsonRes(err(404, '見つかりません'));
      if (!postable(u, c)) return jsonRes(err(403, 'この事業所は閲覧のみです'));
      const hd = init.headers || {};
      const blob = init.body instanceof Blob ? init.body : new Blob([init.body]);
      if (blob.size > 5 * 1024 * 1024) return jsonRes(err(413, 'ファイルは5MBまでです'));
      const name = decodeURIComponent(hd['X-File-Name'] || 'ファイル');
      const caption = decodeURIComponent(hd['X-Caption'] || '');
      addFile(c.id, u.id, name, hd['Content-Type'], new Blob([blob], { type: hd['Content-Type'] }), Date.now(), caption);
      const mid = db.messages[db.messages.length - 1].id;
      db.reads.add(`${u.id}:${mid}`);
      log(u, 'file_upload', `${c.name} 様`, c.cm_id);
      return jsonRes(ok({ ok: true, id: mid }));
    }
    return jsonRes(handle(method, path, new URLSearchParams(qs || ''), init.body ? JSON.parse(init.body) : {}));
  };

  window.demoLogin = (id) => {
    const i = document.querySelector('input[autocomplete="username"]');
    const p = document.querySelector('input[autocomplete="current-password"]');
    if (!i || !p) return false;
    i.value = id; p.value = 'Demo-pass-123';
    i.closest('form').requestSubmit();
    return true;
  };
})();
