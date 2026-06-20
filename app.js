/* ============================================================
   自分史 & 自分トリセツ – app.js
   ============================================================ */

/* TODO: LINE DevelopersでLIFFアプリを発行し、LIFF IDを書き換えてください */
const LIFF_ID = "2010312230-PXgMb4I3";

const STORAGE_KEY = "life_story_draft_v2";

const CATEGORY_LIST = [
  "小学校入学前","小学校","中学校","高校","高専","専門学校","短期大学","大学","大学院",
  "会社","その他",
];

const DEFAULT_STARTER_CATEGORIES = [
  "小学校入学前","小学校","中学校","高校","大学","会社",
];

const CARD_FIELD_ORDER = [
  "category","categoryName","startYear","startAge","endYear","endAge",
  "orgName","livedPlace","hobby","lessons","bestMemory","onePhrase",
];

/* 自分トリセツの質問定義 */
const TORISETSU_QUESTIONS = [
  { id:"tq1", emotion:"joy",    kanji:"喜", label:"うれしい・たのしい",
    q:"最近、人からしてもらって嬉しかったことはなんですか？" },
  { id:"tq2", emotion:"joy",    kanji:"喜", label:"うれしい・たのしい",
    q:"今の自分の自慢（仕事でも家事でも趣味でもなんでも）" },
  { id:"tq3", emotion:"anger",  kanji:"怒", label:"いかり・ストレス",
    q:"イラつくことがあるとどうなるタイプですか？（黙り込む・すぐカッとなる・いったん持ち帰ってから冷静に話したい　など）" },
  { id:"tq4", emotion:"anger",  kanji:"怒", label:"いかり・ストレス",
    q:"ストレス発散方法はなんですか？" },
  { id:"tq5", emotion:"sorrow", kanji:"哀", label:"かなしい・落ち込む",
    q:"最近落ち込んだ出来事" },
  { id:"tq6", emotion:"sorrow", kanji:"哀", label:"かなしい・落ち込む",
    q:"落ち込んだ時はどうしてほしいですか？（一人にしてほしい・話を聞いてほしい・いつも通りにしてほしい　など）希望を教えてください。" },
  { id:"tq7", emotion:"fun",    kanji:"楽", label:"たのしい・しあわせ",
    q:"家族や友人と盛り上がる話題はどんなジャンルが多いですか？" },
  { id:"tq8", emotion:"fun",    kanji:"楽", label:"たのしい・しあわせ",
    q:"「人生が充実している、幸せだ」と感じる瞬間はどんな場面ですか？" },
];

/* ------------------------------------------------------------
   URLセーフ Base64 エンコード／デコード
   ------------------------------------------------------------ */
function base64UrlEncode(str) {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}

function base64UrlDecode(str) {
  const padded = str.replace(/-/g,"+").replace(/_/g,"/");
  const pad = padded.length % 4;
  return decodeURIComponent(escape(atob(pad ? padded + "=".repeat(4-pad) : padded)));
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

/* ------------------------------------------------------------
   生年月日にもとづく「年 ⇄ 年齢」の相互計算
   ------------------------------------------------------------ */
function getBirthYear() {
  const el = document.getElementById("profileBirthdate");
  if (!el || !el.value) return null;
  const y = parseInt(el.value.slice(0,4), 10);
  return isNaN(y) ? null : y;
}

function ageFromYear(year, birthYear) {
  const y = parseInt(year, 10);
  if (isNaN(y) || !birthYear) return "";
  return String(y - birthYear);
}

function yearFromAge(age, birthYear) {
  const a = parseInt(age, 10);
  if (isNaN(a) || !birthYear) return "";
  return String(birthYear + a);
}

function syncYearAgePair(yearEl, ageEl) {
  const by = getBirthYear();
  if (!by) return;
  const yearVal = yearEl.value.trim();
  const ageVal  = ageEl.value.trim();
  if (yearVal !== "" && ageVal === "") {
    const a = ageFromYear(yearVal, by);
    if (a !== "") ageEl.value = a;
  } else if (ageVal !== "" && yearVal === "") {
    const y = yearFromAge(ageVal, by);
    if (y !== "") yearEl.value = y;
  }
}

/* ------------------------------------------------------------
   カードデータの初期値
   ------------------------------------------------------------ */
function createCardData(overrides = {}) {
  return Object.assign({
    category:"", categoryName:"",
    startYear:"", startAge:"", endYear:"", endAge:"",
    orgName:"", livedPlace:"", hobby:"", lessons:"",
    bestMemory:"", onePhrase:"",
  }, overrides);
}

/* ------------------------------------------------------------
   カードDOM生成
   ------------------------------------------------------------ */
function renderCard(cardData) {
  const tpl  = document.getElementById("cardTemplate");
  const node = tpl.content.firstElementChild.cloneNode(true);

  const select = node.querySelector(".card-category");
  select.innerHTML =
    `<option value="" disabled ${cardData.category ? "" : "selected"}>カテゴリを選択</option>` +
    CATEGORY_LIST.map(c =>
      `<option value="${escapeHTML(c)}" ${c === cardData.category ? "selected" : ""}>${escapeHTML(c)}</option>`
    ).join("");

  const otherField = node.querySelector(".other-category-field");
  otherField.classList.toggle("hidden", cardData.category !== "その他");

  const fieldMap = {
    ".card-categoryName": "categoryName",
    ".card-startYear":    "startYear",
    ".card-startAge":     "startAge",
    ".card-endYear":      "endYear",
    ".card-endAge":       "endAge",
    ".card-orgName":      "orgName",
    ".card-livedPlace":   "livedPlace",
    ".card-hobby":        "hobby",
    ".card-lessons":      "lessons",
    ".card-bestMemory":   "bestMemory",
    ".card-onePhrase":    "onePhrase",
  };
  Object.keys(fieldMap).forEach(sel => {
    const el = node.querySelector(sel);
    if (el) el.value = cardData[fieldMap[sel]] || "";
  });

  select.addEventListener("change", () => {
    otherField.classList.toggle("hidden", select.value !== "その他");
    if (select.value !== "その他") node.querySelector(".card-categoryName").value = "";
    saveDraft();
  });

  const startYearEl = node.querySelector(".card-startYear");
  const startAgeEl  = node.querySelector(".card-startAge");
  const endYearEl   = node.querySelector(".card-endYear");
  const endAgeEl    = node.querySelector(".card-endAge");

  [startYearEl, startAgeEl].forEach(el => el.addEventListener("blur", () => {
    syncYearAgePair(startYearEl, startAgeEl);
    saveDraft();
  }));
  [endYearEl, endAgeEl].forEach(el => el.addEventListener("blur", () => {
    syncYearAgePair(endYearEl, endAgeEl);
    saveDraft();
  }));

  node.querySelector(".delete-card").addEventListener("click", () => {
    if (!confirm("このカードを削除しますか？この操作は取り消せません。")) return;
    node.remove();
    saveDraft();
  });

  document.getElementById("cardList").appendChild(node);
  return node;
}

/* ------------------------------------------------------------
   スターターカード
   ------------------------------------------------------------ */
const DEFAULT_STARTER_AGE_RANGES = {
  "小学校入学前": { startAge: 0,  endAge: 6  },
  "小学校":       { startAge: 6,  endAge: 12 },
  "中学校":       { startAge: 12, endAge: 15 },
  "高校":         { startAge: 15, endAge: 18 },
  "大学":         { startAge: 18, endAge: 22 },
  "会社":         { startAge: 22 },
};

function addCard(data) {
  renderCard(data || createCardData());
  saveDraft();
}

function addStarterCards() {
  const by = getBirthYear();
  DEFAULT_STARTER_CATEGORIES.forEach(cat => {
    const range     = DEFAULT_STARTER_AGE_RANGES[cat] || {};
    const startAge  = range.startAge !== undefined ? String(range.startAge) : "";
    const endAge    = range.endAge   !== undefined ? String(range.endAge)   : "";
    const startYear = (by && startAge !== "") ? yearFromAge(startAge, by) : "";
    const endYear   = (by && endAge   !== "") ? yearFromAge(endAge, by)   : "";
    renderCard(createCardData({ category:cat, startAge, endAge, startYear, endYear }));
  });
  saveDraft();
}

/* ------------------------------------------------------------
   ドラッグ＆ドロップ並び替え
   ------------------------------------------------------------ */
function setupDragReorder() {
  const list = document.getElementById("cardList");
  let dragCard = null, pointerId = null, lastClientY = 0;

  function onPointerMove(e) {
    if (!dragCard) return;
    const dy = e.clientY - lastClientY;
    dragCard.style.transform = `translateY(${dy}px) scale(1.03)`;
    const rect    = dragCard.getBoundingClientRect();
    const centerY = rect.top + rect.height / 2;
    for (const sib of [...list.children].filter(c => c !== dragCard)) {
      const sr = sib.getBoundingClientRect();
      if (centerY > sr.top && centerY < sr.bottom) {
        list.insertBefore(dragCard, centerY < sr.top + sr.height / 2 ? sib : sib.nextElementSibling);
        lastClientY = e.clientY;
        dragCard.style.transform = "translateY(0px) scale(1.03)";
        break;
      }
    }
  }

  function onPointerUp() {
    if (!dragCard) return;
    try { dragCard.querySelector(".drag-handle").releasePointerCapture(pointerId); } catch(_) {}
    dragCard.classList.remove("dragging");
    dragCard.style.transform = "";
    dragCard.style.zIndex = "";
    list.removeEventListener("pointermove", onPointerMove);
    list.removeEventListener("pointerup", onPointerUp);
    list.removeEventListener("pointercancel", onPointerUp);
    dragCard = null;
    saveDraft();
  }

  list.addEventListener("pointerdown", e => {
    const handle = e.target.closest(".drag-handle");
    if (!handle) return;
    const card = handle.closest(".life-card");
    if (!card) return;
    e.preventDefault();
    dragCard = card; pointerId = e.pointerId; lastClientY = e.clientY;
    card.classList.add("dragging");
    card.style.zIndex = "50";
    handle.setPointerCapture(pointerId);
    list.addEventListener("pointermove", onPointerMove);
    list.addEventListener("pointerup", onPointerUp);
    list.addEventListener("pointercancel", onPointerUp);
  });
}

/* ------------------------------------------------------------
   入力値の収集
   ------------------------------------------------------------ */
function collectProfile() {
  return {
    name:      document.getElementById("profileName").value.trim(),
    age:       document.getElementById("profileAge").value.trim(),
    birthdate: document.getElementById("profileBirthdate").value.trim(),
  };
}

function collectCards() {
  return [...document.querySelectorAll("#cardList .life-card")].map(node => ({
    category:     node.querySelector(".card-category").value,
    categoryName: node.querySelector(".card-categoryName").value.trim(),
    startYear:    node.querySelector(".card-startYear").value.trim(),
    startAge:     node.querySelector(".card-startAge").value.trim(),
    endYear:      node.querySelector(".card-endYear").value.trim(),
    endAge:       node.querySelector(".card-endAge").value.trim(),
    orgName:      node.querySelector(".card-orgName").value.trim(),
    livedPlace:   node.querySelector(".card-livedPlace").value.trim(),
    hobby:        node.querySelector(".card-hobby").value.trim(),
    lessons:      node.querySelector(".card-lessons").value.trim(),
    bestMemory:   node.querySelector(".card-bestMemory").value.trim(),
    onePhrase:    node.querySelector(".card-onePhrase").value.trim(),
  }));
}

function collectTorisetsu() {
  return Object.fromEntries(
    TORISETSU_QUESTIONS.map(q => [q.id, (document.getElementById(q.id)?.value || "").trim()])
  );
}

/* ------------------------------------------------------------
   下書き保存／復元（LocalStorage）
   ------------------------------------------------------------ */
let createdAt = null;

function saveDraft() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      profile: collectProfile(),
      cards:   collectCards(),
      torisetsu: collectTorisetsu(),
      createdAt,
    }));
    flashSaved();
  } catch(e) { console.warn("draft save failed", e); }
}

function flashSaved() {
  const badge = document.getElementById("saveStatus");
  if (!badge) return;
  badge.classList.add("just-saved");
  setTimeout(() => badge.classList.remove("just-saved"), 400);
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);

    document.getElementById("profileName").value      = data.profile?.name      || "";
    document.getElementById("profileAge").value        = data.profile?.age       || "";
    document.getElementById("profileBirthdate").value  = data.profile?.birthdate || "";
    createdAt = data.createdAt || null;

    (data.cards || []).forEach(c => renderCard(createCardData(c)));

    const ts = data.torisetsu || {};
    TORISETSU_QUESTIONS.forEach(q => {
      const el = document.getElementById(q.id);
      if (el) el.value = ts[q.id] || "";
    });

    return (data.cards && data.cards.length > 0)
      || !!(data.profile?.name)
      || Object.values(ts).some(v => v !== "");
  } catch(e) { console.warn("draft load failed", e); return false; }
}

/* ------------------------------------------------------------
   共有URL エンコード／デコード
   ------------------------------------------------------------ */
function encodeShareData(profile, cards, torisetsu) {
  return base64UrlEncode(JSON.stringify({
    n: profile.name      || "",
    a: profile.age       || "",
    d: createdAt          || "",
    c: cards.map(card => CARD_FIELD_ORDER.map(f => card[f] || "")),
    t: TORISETSU_QUESTIONS.map(q => torisetsu[q.id] || ""),
  }));
}

function decodeShareData(encoded) {
  const p = JSON.parse(base64UrlDecode(encoded));
  const profile = { name: p.n || "", age: p.a || "" };
  const cards = (p.c || []).map(arr => {
    const obj = {};
    CARD_FIELD_ORDER.forEach((f,i) => { obj[f] = arr[i] || ""; });
    return obj;
  });
  const torisetsu = Object.fromEntries(
    TORISETSU_QUESTIONS.map((q,i) => [q.id, (p.t || [])[i] || ""])
  );
  return { profile, cards, torisetsu, createdAt: p.d || "" };
}

function getFormBaseURL() {
  return location.href.split("?")[0].split("#")[0];
}

function buildShareURL() {
  return `${getFormBaseURL()}?share=${encodeShareData(collectProfile(), collectCards(), collectTorisetsu())}`;
}

function getSharedDataFromURL() {
  const raw = new URLSearchParams(location.search).get("share");
  if (!raw) return null;
  try { return decodeShareData(raw); } catch(e) { console.error("share decode error", e); return null; }
}

/* ------------------------------------------------------------
   期間・日付の整形
   ------------------------------------------------------------ */
function formatPeriod(card) {
  const { startYear:y1, endYear:y2, startAge:a1, endAge:a2 } = card;
  const yearPart = (y1 && y2) ? `${y1}〜${y2}` : y1 ? `${y1}〜` : y2 ? `〜${y2}` : "";
  const agePart  = (a1 !== "" && a2 !== "") ? `（${a1}〜${a2}歳）`
                 : a1 !== "" ? `（${a1}歳〜）` : a2 !== "" ? `（〜${a2}歳）` : "";
  return [yearPart, agePart].filter(Boolean).join("") || "期間未設定";
}

function formatDateLabel(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}`;
}

/* ------------------------------------------------------------
   カテゴリアイコン
   ------------------------------------------------------------ */
const CATEGORY_ICON_SVG = {
  home:   '<svg viewBox="0 0 24 24"><path d="M3 11 12 4l9 7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 10v9h14v-9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  school: '<svg viewBox="0 0 24 24"><path d="M12 4 2 9l10 5 10-5-10-5Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M6 11.5V17c0 1 2.7 2 6 2s6-1 6-2v-5.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  work:   '<svg viewBox="0 0 24 24"><rect x="3" y="8" width="18" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
  spark:  '<svg viewBox="0 0 24 24"><path d="M12 3v6M12 15v6M3 12h6M15 12h6M5.5 5.5l4 4M14.5 14.5l4 4M18.5 5.5l-4 4M9.5 14.5l-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  dot:    '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>',
};

function categoryIconKind(category) {
  if (!category) return "dot";
  if (category === "小学校入学前") return "home";
  if (["小学校","中学校","高校","高専","専門学校","短期大学","大学","大学院"].includes(category)) return "school";
  if (category === "会社") return "work";
  return "spark";
}

function categoryIconHTML(category) {
  return `<span class="cat-icon">${CATEGORY_ICON_SVG[categoryIconKind(category)]}</span>`;
}

function decoFlourishSVG() {
  return `<svg viewBox="0 0 160 28" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 14 C32 3,50 25,76 13 S122 1,154 14" fill="none" stroke="#f4b8c5" stroke-width="2" stroke-linecap="round"/>
    <circle cx="24" cy="9" r="2.6" fill="#f48ca0"/><circle cx="58" cy="19" r="2.6" fill="#f48ca0"/>
    <circle cx="96" cy="8" r="2.6" fill="#f48ca0"/><circle cx="132" cy="18" r="2.6" fill="#f48ca0"/>
  </svg>`;
}

/* ------------------------------------------------------------
   自分史 タイムライン HTML生成
   ------------------------------------------------------------ */
function buildTimelineHTML(profile, cards, dateLabel) {
  const itemsHTML = cards.map(card => {
    const period   = formatPeriod(card);
    const catLabel = card.category === "その他" ? (card.categoryName || "その他") : card.category;
    const rows = [
      ["学校名・施設名", card.orgName],
      ["住んでいた場所", card.livedPlace],
      ["趣味",          card.hobby],
      ["習い事・部活動", card.lessons],
      ["一番の思い出",   card.bestMemory],
      ["一言で表すと",   card.onePhrase],
    ].filter(([,v]) => v && String(v).trim() !== "");

    return `
      <div class="timeline-item">
        <div class="timeline-rail"><span class="timeline-dot"></span></div>
        <div class="timeline-card">
          <p class="timeline-period">${escapeHTML(period)}</p>
          <p class="timeline-category">${categoryIconHTML(card.category)}<span>${escapeHTML(catLabel || "（カテゴリ未設定）")}</span></p>
          ${rows.map(([label,val]) => `
            <div class="field-row">
              <span class="field-row-label">${escapeHTML(label)}</span>
              <span class="field-row-value">${escapeHTML(val).replace(/\n/g,"<br>")}</span>
            </div>`).join("")}
        </div>
      </div>`;
  }).join("");

  return `
    <div class="timeline-header">
      <div class="timeline-header-deco">${decoFlourishSVG()}</div>
      <p class="timeline-header-title">自分史</p>
      <p class="timeline-header-sub">MY STORY</p>
      <div class="timeline-profile">
        <div class="avatar-circle">${escapeHTML((profile.name||"?").trim().slice(0,1)||"?")}</div>
        <div>
          <p class="timeline-profile-name">${escapeHTML(profile.name||"名前未設定")}${profile.age?`（${escapeHTML(String(profile.age))}歳）`:""}</p>
        </div>
      </div>
      ${dateLabel ? `<p class="timeline-date">作成日：${escapeHTML(dateLabel)}</p>` : ""}
    </div>
    <div class="timeline-list">
      ${itemsHTML || `<div class="timeline-empty">まだ出来事が登録されていません</div>`}
    </div>`;
}

/* ------------------------------------------------------------
   自分トリセツ 表示HTML生成
   ------------------------------------------------------------ */
const EMOTION_GROUPS = [
  { key:"joy",    kanji:"喜", label:"うれしい・たのしい",   ids:["tq1","tq2"] },
  { key:"anger",  kanji:"怒", label:"いかり・ストレス",     ids:["tq3","tq4"] },
  { key:"sorrow", kanji:"哀", label:"かなしい・落ち込む",   ids:["tq5","tq6"] },
  { key:"fun",    kanji:"楽", label:"たのしい・しあわせ",   ids:["tq7","tq8"] },
];

function buildTorisetsuHTML(torisetsu) {
  const hasAny = TORISETSU_QUESTIONS.some(q => torisetsu[q.id] && torisetsu[q.id].trim() !== "");

  const groupsHTML = EMOTION_GROUPS.map(group => {
    const qList = TORISETSU_QUESTIONS.filter(q => group.ids.includes(q.id));
    const qaHTML = qList.map(q => {
      const ans = (torisetsu[q.id] || "").trim();
      if (!ans) return "";
      return `
        <div class="torisetsu-qa">
          <p class="torisetsu-question">${escapeHTML(q.q)}</p>
          <p class="torisetsu-answer">${escapeHTML(ans).replace(/\n/g,"<br>")}</p>
        </div>`;
    }).join("");
    if (!qaHTML) return "";
    return `
      <div class="torisetsu-emotion-block torisetsu-${group.key}">
        <div class="torisetsu-emotion-heading">
          <span class="torisetsu-kanji-badge badge-${group.key}">${escapeHTML(group.kanji)}</span>
          <span>${escapeHTML(group.label)}</span>
        </div>
        ${qaHTML}
      </div>`;
  }).join("");

  return `
    <div class="torisetsu-view-header">
      <div class="torisetsu-view-header-deco">${decoFlourishSVG()}</div>
      <p class="torisetsu-view-title">自分トリセツ</p>
      <p class="torisetsu-view-sub">喜怒哀楽からよむ、わたしの感情と価値観</p>
    </div>
    ${hasAny ? groupsHTML : `<div class="timeline-empty">まだ回答が入力されていません</div>`}`;
}

/* ------------------------------------------------------------
   プレビュー／公開ビュー レンダリング
   ------------------------------------------------------------ */
function renderContent(container, profile, cards, torisetsu, opts = {}) {
  const { showViewerCTA = false } = opts;
  const dateLabel = formatDateLabel(createdAt || profile.createdAt || "");

  const ctaHTML = showViewerCTA ? `
    <div class="cta-card">
      <p class="cta-title">あなたも自分史・トリセツを作ってみませんか？</p>
      <p class="cta-text">生い立ちから今までの歩みと、喜怒哀楽の感情・価値観をまとめてお相手に届けられます。</p>
      <button type="button" class="btn-primary cta-btn" id="ctaCreateBtn">私も作成する</button>
    </div>` : "";

  container.innerHTML =
    buildTimelineHTML(profile, cards, dateLabel) +
    buildTorisetsuHTML(torisetsu) +
    ctaHTML;

  if (showViewerCTA) {
    const btn = container.querySelector("#ctaCreateBtn");
    if (btn) btn.addEventListener("click", () => { location.href = getFormBaseURL(); });
  }
}

/* ------------------------------------------------------------
   公開ビュー（共有リンクで開いたとき）
   ------------------------------------------------------------ */
function renderPublicView(shared) {
  document.getElementById("app").style.display = "none";
  const pv = document.getElementById("publicView");
  pv.style.display = "block";
  createdAt = shared.createdAt || null;
  renderContent(pv, shared.profile, shared.cards, shared.torisetsu, { showViewerCTA:true });
}

/* ------------------------------------------------------------
   タブ切り替え
   ------------------------------------------------------------ */
function switchTab(tab) {
  ["input","preview","share","settings"].forEach(t => {
    document.getElementById(`tab-${t}`).classList.toggle("hidden", t !== tab);
  });
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tab);
  });
  document.getElementById("appBarTitle").textContent =
    tab === "preview"  ? "プレビュー" :
    tab === "share"    ? "共有" :
    tab === "settings" ? "設定" : "自分史を作成";

  if (tab === "preview") {
    if (!createdAt) { createdAt = new Date().toISOString(); saveDraft(); }
    renderContent(document.getElementById("previewContent"),
      collectProfile(), collectCards(), collectTorisetsu(), { showViewerCTA:false });
  }
  if (tab === "share") {
    if (!createdAt) { createdAt = new Date().toISOString(); saveDraft(); }
    document.getElementById("shareUrlInput").value = buildShareURL();
  }
}

/* ------------------------------------------------------------
   サブタブ切り替え（自分史 ／ 自分トリセツ）
   ------------------------------------------------------------ */
function switchSub(sub) {
  document.getElementById("sub-story").classList.toggle("hidden", sub !== "story");
  document.getElementById("sub-torisetsu").classList.toggle("hidden", sub !== "torisetsu");
  document.querySelectorAll(".sub-switch-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.sub === sub);
  });
  document.getElementById("appBarTitle").textContent =
    sub === "torisetsu" ? "自分トリセツを作成" : "自分史を作成";
}

/* ------------------------------------------------------------
   LINEトーク（本人）への送信
   ------------------------------------------------------------ */
async function sendShareMessageToSelf(text) {
  try {
    if (liff.isInClient() && liff.isApiAvailable("sendMessages")) {
      await liff.sendMessages([{ type:"text", text }]);
    }
  } catch(e) { console.warn("sendMessages skipped:", e); }
}

/* ------------------------------------------------------------
   イベント登録
   ------------------------------------------------------------ */
function bindEvents() {
  document.getElementById("addCardBtn").addEventListener("click", () => addCard());

  let saveTimer = null;
  document.getElementById("tab-input").addEventListener("input", () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveDraft, 500);
  });

  // 生年月日：フォーカスを外した瞬間（blur）にのみ計算
  document.getElementById("profileBirthdate").addEventListener("blur", () => {
    document.querySelectorAll("#cardList .life-card").forEach(card => {
      syncYearAgePair(card.querySelector(".card-startYear"), card.querySelector(".card-startAge"));
      syncYearAgePair(card.querySelector(".card-endYear"), card.querySelector(".card-endAge"));
    });
    saveDraft();
  });

  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  document.querySelectorAll(".sub-switch-btn").forEach(btn => {
    btn.addEventListener("click", () => switchSub(btn.dataset.sub));
  });

  document.getElementById("backToInputBtn").addEventListener("click", () => switchTab("input"));

  document.getElementById("copyUrlBtn").addEventListener("click", async () => {
    const input = document.getElementById("shareUrlInput");
    const btn   = document.getElementById("copyUrlBtn");
    try {
      await navigator.clipboard.writeText(input.value);
    } catch(_) {
      input.removeAttribute("readonly");
      input.select();
      try { document.execCommand("copy"); } catch(_) {}
      input.setAttribute("readonly","true");
    }
    btn.textContent = "コピーしました";
    btn.classList.add("copied");
    setTimeout(() => { btn.textContent = "コピー"; btn.classList.remove("copied"); }, 1800);
  });

  document.getElementById("lineShareBtn").addEventListener("click", async () => {
    const url  = document.getElementById("shareUrlInput").value || buildShareURL();
    const name = collectProfile().name;
    const message = name
      ? `${name}さんの自分史・トリセツが届きました。\n見てみる→${url}`
      : `自分史・トリセツが届きました。\n見てみる→${url}`;
    await sendShareMessageToSelf(message);
    const lineURL = `https://line.me/R/msg/text/?${encodeURIComponent(message)}`;
    if (liff.isInClient()) { window.location.href = lineURL; }
    else { window.open(lineURL, "_blank"); }
  });

  document.getElementById("resetBtn").addEventListener("click", () => {
    if (!confirm("下書きを削除して最初から作成しますか？この操作は取り消せません。")) return;
    try { localStorage.removeItem(STORAGE_KEY); } catch(_) {}
    location.href = getFormBaseURL();
  });

  setupDragReorder();
}

/* ------------------------------------------------------------
   メイン処理
   ------------------------------------------------------------ */
(async () => {
  const shared = getSharedDataFromURL();
  if (shared) { renderPublicView(shared); return; }

  try {
    await liff.init({ liffId: LIFF_ID });
  } catch(e) {
    console.error("LIFF init failed", e);
    alert("LIFFの初期化に失敗しました。");
    return;
  }

  if (!liff.isLoggedIn()) { liff.login(); return; }

  const hadDraft = loadDraft();
  bindEvents();

  const startBtn  = document.getElementById("startBtn");
  const resumeBtn = document.getElementById("resumeBtn");

  if (hadDraft) {
    resumeBtn.classList.remove("hidden");
    startBtn.textContent = "新しく作成する";
  }

  function goToMain() {
    document.getElementById("screen-top").classList.add("hidden");
    document.getElementById("screen-main").classList.remove("hidden");
    switchTab("input");
    switchSub("story");
  }

  startBtn.addEventListener("click", () => {
    if (hadDraft && !confirm("これまでの下書きを削除して、新しく作成しますか？")) return;
    if (hadDraft) {
      document.getElementById("cardList").innerHTML = "";
      document.getElementById("profileName").value      = "";
      document.getElementById("profileAge").value        = "";
      document.getElementById("profileBirthdate").value  = "";
      TORISETSU_QUESTIONS.forEach(q => {
        const el = document.getElementById(q.id);
        if (el) el.value = "";
      });
      createdAt = null;
      try { localStorage.removeItem(STORAGE_KEY); } catch(_) {}
    }
    if (document.querySelectorAll("#cardList .life-card").length === 0) addStarterCards();
    goToMain();
  });

  resumeBtn.addEventListener("click", goToMain);
})();
