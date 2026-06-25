/**
 * SteelCalc Pro — Business Logic Engine (Cloud-Connected)
 * User-facing calculator: prices are READ-ONLY from Firebase.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// ─── 0. FIREBASE CONFIG ───────────────────────────────────────────────────────
const firebaseConfig = {
    apiKey: "AIzaSyALU1YfHjjve-j1GPaL7097i51LWi1sVf4",
    authDomain: "steelcalc-pro-574a5.firebaseapp.com",
    projectId: "steelcalc-pro-574a5",
    storageBucket: "steelcalc-pro-574a5.firebasestorage.app",
    messagingSenderId: "648977443919",
    appId: "1:648977443919:web:2e7af26e77c3090412ce3a"
};

const app = initializeApp(firebaseConfig);
const db   = getFirestore(app);
const auth = getAuth(app);

// ─── 1. DEFAULT PRICES (fallback) ────────────────────────────────────────────
let PRICES = {
    p1_rate: 750, p2_rate: 680, konstr_ocynk: 0, konstr_ral: 0,
    konstr_ral_mat: 0, wykon_drewno: 0, nadwymiar: 15, okucia: 700,
    scionaPerMeter: 350, t8_rate: 0, filc_rate: 12,
    bramaUchylna: 1100, okno: 600, napedCame: 950, furtka: 450,
    transport: 100, dostawa: 100, rynny: 1200, kotwienie: 250,
    brama_segm: 6000, blachodach: 4000, dach_2sk: 0
};

// Dynamic items from Firebase: { 'card-plyty': [...], 'card-dach': [...], ... }
// card → calculator section mapping
const CARD_TO_SECTION = {
    'card-plyty':     'konstrukcja',
    'card-dach':      'dach',
    'card-akcesoria': 'akcesoria',
    'card-logistyka': 'logistyka',
};

// calcType for each card: 'y' = base (ySum), 'w' = extras (wSum)
const CARD_CALC_TYPE = {
    'card-plyty':     'y',
    'card-dach':      'y',
    'card-akcesoria': 'w',
    'card-logistyka': 'w',
};

let dynamicItems = {};
let transportPrices = {};
let typDachuOptions = []; // loaded from Firebase

// ─── 2. SYNC FROM FIREBASE ───────────────────────────────────────────────────
async function syncPricesWithFirebase() {
    try {
        const docSnap = await getDoc(doc(db, "settings", "prices"));
        if (docSnap.exists()) {
            const data = docSnap.data();
            Object.keys(PRICES).forEach(key => {
                if (data[key] !== undefined) PRICES[key] = data[key];
            });
            if (data.dynamicItems) {
                dynamicItems = data.dynamicItems;
            }
            if (data.transportPrices) {
                transportPrices = data.transportPrices;
            }
            if (data.typDachuOptions && Array.isArray(data.typDachuOptions)) {
                typDachuOptions = data.typDachuOptions;
            }
        }
    } catch (e) {
        console.warn("⚠ Firebase sync error — using defaults:", e.message);
    }
}

// ─── 3. HELPERS ──────────────────────────────────────────────────────────────
const getNum    = (id) => parseFloat(document.getElementById(id)?.value) || 0;
const getInt    = (id) => parseInt(document.getElementById(id)?.value, 10) || 0;
const setDisp   = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
const setVal    = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
const formatPLN = (v) => v.toLocaleString('pl-PL') + ' PLN';

// ─── 4. INJECT DYNAMIC ITEMS INTO CALCULATOR HTML ───────────────────────────
function injectDynamicItems() {
    // Map section names to the container element IDs in index.html
    const sectionContainers = {
        'konstrukcja': 'dyn-section-konstrukcja',
        'dach':        'dyn-section-dach',
        'akcesoria':   'dyn-section-akcesoria',
        'logistyka':   'dyn-section-logistyka',
    };

    Object.entries(CARD_TO_SECTION).forEach(([cardId, section]) => {
        const containerId = sectionContainers[section];
        const container = document.getElementById(containerId);
        if (!container) return;

        const items = dynamicItems[cardId] || [];
        if (items.length === 0) {
            container.innerHTML = '';
            return;
        }

        const calcType = CARD_CALC_TYPE[cardId]; // 'y' or 'w'
        const checkClass = calcType === 'y' ? 'y-check' : 'w-check';

        let html = '<div class="option-group option-group--dynamic">';
        items.forEach(item => {
            const safeId  = 'dyn_cb_' + item.id;
            const priceId = 'dyn_price_' + item.id;
            const label   = escHtml(item.label);
            html += `
            <div class="option-row">
                <label class="option-label" for="${safeId}">
                    <input type="checkbox" id="${safeId}"
                        class="${checkClass} calc-trigger"
                        data-label="${label}"
                        data-dyn-id="${item.id}"
                        data-perm2="${item.perM2 ? '1' : '0'}">
                    <span class="option-check"></span>
                    <span class="option-text">${label}</span>
                </label>
                <input type="number" id="${priceId}" class="price-input" readonly>
            </div>`;
        });
        html += '</div>';
        container.innerHTML = html;
    });

    // Re-attach calc-trigger listeners for newly injected elements
    document.querySelectorAll('.calc-trigger').forEach(el => {
        el.removeEventListener('change', runCalc);
        el.removeEventListener('input', runCalc);
        const event = (el.type === 'checkbox' || el.tagName === 'SELECT') ? 'change' : 'input';
        el.addEventListener(event, runCalc);
    });
}

function escHtml(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── 4b. INJECT TYP DACHU SELECT OPTIONS ────────────────────────────────────
function injectTypDachuSelect() {
    const sel = document.getElementById('typ_dachu');
    if (!sel) return;

    // remember current value
    const prev = sel.value;

    // Clear and rebuild
    sel.innerHTML = '<option value="">— wybierz —</option>';

    const opts = typDachuOptions.length > 0
        ? typDachuOptions
        : [
            { value: 'dwu',   label: 'Dwuspadowy' },
            { value: 'tyl',   label: 'Tył' },
            { value: 'lewo',  label: 'Lewo' },
            { value: 'prawo', label: 'Prawo' },
          ];

    opts.forEach(opt => {
        const el = document.createElement('option');
        el.value = opt.value;
        el.textContent = opt.label;
        sel.appendChild(el);
    });

    // restore selection if still valid
    if (prev && [...sel.options].some(o => o.value === prev)) sel.value = prev;
}

// ─── 5. FILL PRICE DISPLAY INPUTS ────────────────────────────────────────────
function fillPriceDisplays(m2) {
    const mapping = {
        'price_p1':    m2 * PRICES.p1_rate,
        'price_p2':    m2 * PRICES.p2_rate,
        'price_p3':    PRICES.konstr_ocynk,
        'price_p4':    PRICES.konstr_ral,
        'price_p5':    PRICES.konstr_ral_mat,
        'price_p6':    PRICES.wykon_drewno,
        'price_nad':   m2 * PRICES.nadwymiar,
        'price_okuc':  PRICES.okucia,
        // price_dwu driven by typ_dachu select in runCalc
        'price_filc':  m2 * PRICES.filc_rate,
        't8_val':      PRICES.t8_rate,
        'price_furtka':PRICES.furtka,
        // price_tr is now driven by transport combo boxes
        'price_reg':   PRICES.dostawa,
        // price_ryn is driven by typ_dachu select + cb_ryn checkbox
        'price_ryn':   0,
        'price_kot':   PRICES.kotwienie,
        'price_seg':   PRICES.brama_segm,
        'price_blach': PRICES.blachodach,
        'val_2sk':     PRICES.dach_2sk,
    };
    Object.entries(mapping).forEach(([id, val]) => setVal(id, Math.round(val)));

    // Dynamic items price displays
    Object.values(dynamicItems).flat().forEach(item => {
        const priceId = 'dyn_price_' + item.id;
        const val = item.perM2 ? Math.round(item.price * m2) : Math.round(item.price);
        setVal(priceId, val);
    });
}

// ─── 6. MAIN CALCULATION ─────────────────────────────────────────────────────
function runCalc() {
    const sz  = getNum('w_szer');
    const gl  = getNum('w_gleb');
    const hCm = getNum('w_wys_cm');
    const m2  = sz * gl;

    setDisp('dim-summary', `Powierzchnia: ${m2.toFixed(1)} m² | Wysokość: ${(hCm/100).toFixed(2)} m`);
    fillPriceDisplays(m2);

    const nadCb = document.getElementById('cb_nad');
    if (nadCb) nadCb.checked = hCm > 235;

    let ySum = 0;
    let wSum = 0;
    let pdfItems = [];

    // Base construction checkboxes (y-check)
    document.querySelectorAll('.y-check').forEach(cb => {
        const row    = cb.closest('.option-row');
        const pInput = row?.querySelector('.price-input');
        if (cb.checked && pInput) {
            ySum += parseFloat(pInput.value) || 0;
            pdfItems.push(cb.dataset.label || '');
            pInput.classList.add('active-price');
        } else if (pInput) {
            pInput.classList.remove('active-price');
        }
    });

    // Ściana działowa
    const sMeters = getNum('sciana_m');
    const sTotal  = sMeters * PRICES.scionaPerMeter;
    setVal('sciana_res', Math.round(sTotal));
    if (sMeters > 0) {
        ySum += sTotal;
        pdfItems.push(`Ściana działowa: ${sMeters} mb`);
    }

    // Quantity items
    const QTY_MAP = [
        { qId: 'qty_b_uch', rId: 'res_b_uch', price: PRICES.bramaUchylna, label: 'Brama uchylna' },
        { qId: 'qty_okno',  rId: 'res_okno',  price: PRICES.okno,         label: 'Okno PCV' },
        { qId: 'qty_came',  rId: 'res_came',  price: PRICES.napedCame,    label: 'Napęd Came' },
    ];
    QTY_MAP.forEach(item => {
        const qty   = getInt(item.qId);
        const total = qty * item.price;
        setVal(item.rId, total);
        if (qty > 0) {
            wSum += total;
            pdfItems.push(`${item.label}: ${qty} szt.`);
        }
    });

    // Extras checkboxes (w-check)
    document.querySelectorAll('.w-check').forEach(cb => {
        const row    = cb.closest('.option-row');
        const pInput = row?.querySelector('.price-input');
        if (cb.checked && pInput) {
            wSum += parseFloat(pInput.value) || 0;
            pdfItems.push(cb.dataset.label || '');
            pInput.classList.add('active-price');
        } else if (pInput) {
            pInput.classList.remove('active-price');
        }
    });

    // Typ Dachu select → price_dwu auto + ySum
    const typDachu   = document.getElementById('typ_dachu')?.value || '';
    const dwuPriceEl = document.getElementById('price_dwu');
    const activeOpt  = typDachuOptions.find(o => o.value === typDachu);
    const dachuPrice = activeOpt?.price || 0;

    if (typDachu && dwuPriceEl && dachuPrice > 0) {
        dwuPriceEl.value = Math.round(dachuPrice);
        dwuPriceEl.classList.add('active-price');
        ySum += dachuPrice;
        pdfItems.push(`Typ Dachu: ${activeOpt.label}`);
    } else if (dwuPriceEl) {
        dwuPriceEl.value = dachuPrice > 0 ? Math.round(dachuPrice) : '';
        dwuPriceEl.classList.remove('active-price');
    }

    // System rynnowy
    const rynCb      = document.getElementById('cb_ryn');
    const rynPriceEl = document.getElementById('price_ryn');
    const rynBadge   = document.getElementById('ryn_meters_badge');

    // Determine mb multiplier from dimension (same as before)
    let rynMeters = 0;
    if (typDachu === 'dwu')                               rynMeters = gl * 2;
    else if (typDachu === 'tyl')                          rynMeters = sz;
    else if (typDachu === 'lewo' || typDachu === 'prawo') rynMeters = gl;

    // Allow override via typDachuOptions rynnyPerMb
    const rynnyRate = (activeOpt && activeOpt.rynnyPerMb > 0)
        ? activeOpt.rynnyPerMb
        : PRICES.rynny;

    const rynTotal = rynMeters * rynnyRate;
    if (rynBadge) rynBadge.textContent = rynMeters > 0 ? `${rynMeters} mb` : '';
    if (rynPriceEl) rynPriceEl.value = Math.round(rynTotal);

    if (rynCb?.checked && rynTotal > 0) {
        if (rynPriceEl) rynPriceEl.classList.add('active-price');
        wSum += rynTotal;
        const rynLabel = activeOpt ? `Rynny ${activeOpt.label}` : `Rynny ${typDachu}`;
        pdfItems.push(`${rynLabel}: ${Math.round(rynTotal)} PLN`);
    } else {
        if (rynPriceEl) rynPriceEl.classList.remove('active-price');
    }

    // Transport combo boxes
    const trType = document.getElementById('tr_type')?.value || '';
    const trWoj  = document.getElementById('tr_woj')?.value  || '';
    const trLabel = document.getElementById('tr_selected_label');
    const trPriceEl = document.getElementById('price_tr');

    if (trType && trWoj && transportPrices[trWoj]) {
        const trVal = transportPrices[trWoj][trType] || 0;
        if (trPriceEl) {
            trPriceEl.value = trVal;
            trPriceEl.classList.remove('price-result');
            trPriceEl.classList.add('active-price');
        }
        if (trLabel) trLabel.textContent = `${trWoj} · ${trType === 'blachane' ? 'Blachane' : 'Garaże X4'}`;
        if (trVal > 0) {
            wSum += trVal;
            pdfItems.push(`Transport ${trWoj}: ${trVal} PLN`);
        }
    } else {
        if (trPriceEl) {
            trPriceEl.value = '';
            trPriceEl.classList.add('price-result');
            trPriceEl.classList.remove('active-price');
        }
        if (trLabel) {
            if (!trType && !trWoj) trLabel.textContent = 'Wybierz typ i województwo';
            else if (!trType)      trLabel.textContent = 'Wybierz typ produktu';
            else                   trLabel.textContent = 'Wybierz województwo';
        }
    }

    // T8, 2SK
    if (document.getElementById('t8_check')?.checked)  ySum += getNum('t8_val');
    if (document.getElementById('check_2sk')?.checked) wSum += getNum('val_2sk');

    // Korekta
    wSum += getNum('val_doplata');

    // Totals
    const rabat       = getNum('rabat_pct');
    const baseTotal   = ySum + wSum;
    const discountVal = ySum * (rabat / 100);
    const netto       = baseTotal - discountVal;
    const brutto      = Math.round(netto / 10) * 10;

    setDisp('disp_base',          formatPLN(baseTotal));
    setDisp('disp_discount',      '−' + formatPLN(discountVal));
    setDisp('disp_profil_netto',  formatPLN(netto));
    setDisp('disp_profil',        formatPLN(brutto));
    setDisp('header-price',       formatPLN(brutto));

    // PDF specs
    const specsEl = document.getElementById('pdf_specs');
    if (specsEl) {
        const base = [
            `<li><span>Wymiary</span><strong>${sz}×${gl} m</strong></li>`,
            `<li><span>Wysokość</span><strong>${(hCm/100).toFixed(2)} m</strong></li>`,
        ];
        specsEl.innerHTML = base.join('') +
            pdfItems.filter(Boolean).map(i => `<li><span>${i}</span><span>✔</span></li>`).join('');
    }

    const pdfTotal = document.getElementById('pdf_total');
    if (pdfTotal) pdfTotal.textContent = brutto.toLocaleString('pl-PL');

    const pdfDate = document.getElementById('pdf-date');
    if (pdfDate) pdfDate.textContent = new Date().toLocaleDateString('pl-PL', {
        day: '2-digit', month: 'long', year: 'numeric'
    });
}

// ─── 7. INIT ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = 'admin.html';
            return;
        }

        await syncPricesWithFirebase();

        // Show app now that auth is confirmed
        const appEl = document.getElementById('main-app-content');
        if (appEl) appEl.style.display = '';

        // Inject dynamic items into the calculator HTML
        injectDynamicItems();
        injectTypDachuSelect();

        // Attach listeners
        document.querySelectorAll('.calc-trigger').forEach(el => {
            const event = (el.type === 'checkbox' || el.tagName === 'SELECT') ? 'change' : 'input';
            el.addEventListener(event, runCalc);
        });

        runCalc();
    });
});