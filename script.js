/**
 * SteelCalc Pro — Calculator Logic
 * კითხულობს ფასებს Firebase-დან (მხოლოდ წასაკითხი)
 */

import { initializeApp }          from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// ════════════════════════════════════════════════════════════
//  1. FIREBASE
// ════════════════════════════════════════════════════════════

const firebaseConfig = {
    apiKey: "AIzaSyALU1YfHjjve-j1GPaL7097i51LWi1sVf4",
    authDomain: "steelcalc-pro-574a5.firebaseapp.com",
    projectId: "steelcalc-pro-574a5",
    storageBucket: "steelcalc-pro-574a5.firebasestorage.app",
    messagingSenderId: "648977443919",
    appId: "1:648977443919:web:2e7af26e77c3090412ce3a"
};

const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);
const auth = getAuth(app);

// ════════════════════════════════════════════════════════════
//  2. STATE — ფასები და დინამიური მონაცემები
// ════════════════════════════════════════════════════════════

// ფალბექ ფასები — Firebase-ის ჩატვირთვამდე გამოიყენება
let PRICES = {
    p1_rate: 750, p2_rate: 680,
    konstr_ocynk: 0, konstr_ral: 0, konstr_ral_mat: 0, wykon_drewno: 0,
    nadwymiar: 15, okucia: 700, scionaPerMeter: 350,
    kratownica: 0, slup: 0, filc_rate: 12,
    bramaUchylna: 1100, bramaDwu: 1100, okno: 600, napedCame: 950,
    drzwiBlaszane: 0, drzwiEco: 0, drzwiGerda: 0, drzwiMtbram: 0,
    dostawa: 100, rynny: 1200, kotwienie: 250,
    brama_segm: 6000, blachodach: 4000,
};

// ადმინიდან ჩამოტვირთული მონაცემები
let dynamicItems   = {};   // { 'card-plyty': [{id,label,price,perM2},...], ... }
let transportPrices = {};  // { 'Śląskie': { blachane: 350, x4: 1400 }, ... }
let typDachuOptions = [];  // [{ id, label, value, price, rynnyPerMb }, ...]

// კარდი → კალკულატორის სექციის კონტეინერი
const CARD_TO_SECTION = {
    'card-plyty':     'konstrukcja',
    'card-dach':      'dach',
    'card-akcesoria': 'akcesoria',
    'card-logistyka': 'logistyka',
};

// კარდი → checkbox კლასი (y = ბაზა, w = დანამატი)
const CARD_CALC_TYPE = {
    'card-plyty':     'y',
    'card-dach':      'y',
    'card-akcesoria': 'w',
    'card-logistyka': 'w',
};

// ════════════════════════════════════════════════════════════
//  3. FIREBASE SYNC
// ════════════════════════════════════════════════════════════

async function syncPricesWithFirebase() {
    try {
        const snap = await getDoc(doc(db, "settings", "prices"));
        if (!snap.exists()) return;
        const data = snap.data();

        // სტატიკური ფასები
        Object.keys(PRICES).forEach(key => {
            if (data[key] !== undefined) PRICES[key] = data[key];
        });

        if (data.dynamicItems)    dynamicItems    = data.dynamicItems;
        if (data.transportPrices) transportPrices = data.transportPrices;
        if (Array.isArray(data.typDachuOptions)) typDachuOptions = data.typDachuOptions;

    } catch (e) {
        console.warn("Firebase sync error — using defaults:", e.message);
    }
}

// ════════════════════════════════════════════════════════════
//  4. HELPERS
// ════════════════════════════════════════════════════════════

const $       = (id)       => document.getElementById(id);
const getNum  = (id)       => parseFloat($(id)?.value) || 0;
const getInt  = (id)       => parseInt($(id)?.value, 10) || 0;
const setDisp = (id, val)  => { const el = $(id); if (el) el.textContent = val; };
const setVal  = (id, val)  => { const el = $(id); if (el) el.value = val; };
const fmt     = (v)        => v.toLocaleString('pl-PL') + ' PLN';

function escHtml(str) {
    return String(str || '')
        .replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ════════════════════════════════════════════════════════════
//  5. INJECT — HTML-ში ელემენტების ჩასმა Firebase-ის მონაცემებიდან
// ════════════════════════════════════════════════════════════

// ადმინიდან დამატებული პოზიციები → კალკულატორის სექციებში
function injectDynamicItems() {
    const containers = {
        'konstrukcja': 'dyn-section-konstrukcja',
        'dach':        'dyn-section-dach',
        'akcesoria':   'dyn-section-akcesoria',
        'logistyka':   'dyn-section-logistyka',
    };

    Object.entries(CARD_TO_SECTION).forEach(([cardId, section]) => {
        const container = $(containers[section]);
        if (!container) return;

        const items = dynamicItems[cardId] || [];
        if (items.length === 0) { container.innerHTML = ''; return; }

        const checkClass = CARD_CALC_TYPE[cardId] === 'y' ? 'y-check' : 'w-check';

        container.innerHTML = '<div class="option-group option-group--dynamic">' +
            items.map(item => `
                <div class="option-row">
                    <label class="option-label" for="dyn_cb_${item.id}">
                        <input type="checkbox" id="dyn_cb_${item.id}"
                            class="${checkClass} calc-trigger"
                            data-label="${escHtml(item.label)}"
                            data-dyn-id="${item.id}"
                            data-perm2="${item.perM2 ? '1' : '0'}">
                        <span class="option-check"></span>
                        <span class="option-text">${escHtml(item.label)}</span>
                    </label>
                    <input type="number" id="dyn_price_${item.id}" class="price-input" readonly>
                </div>`).join('') +
            '</div>';
    });

    // calc-trigger listener-ების განახლება ახალ ელემენტებზე
    document.querySelectorAll('.calc-trigger').forEach(el => {
        el.removeEventListener('change', runCalc);
        el.removeEventListener('input',  runCalc);
        el.addEventListener(
            (el.type === 'checkbox' || el.tagName === 'SELECT') ? 'change' : 'input',
            runCalc
        );
    });
}

// Typ Dachu select-ის ოფციები Firebase-იდან
function injectTypDachuSelect() {
    const sel = $('typ_dachu');
    if (!sel) return;

    const prev = sel.value;
    sel.innerHTML = '<option value="">— wybierz —</option>';

    const opts = typDachuOptions.length > 0 ? typDachuOptions : [
        { value: 'dwu', label: 'Dwuspadowy' },
        { value: 'tyl', label: 'Tył' },
        { value: 'przod', label: 'Przod' },
        { value: 'lewo', label: 'Lewo' },
        { value: 'prawo', label: 'Prawo' },
    ];

    opts.forEach(opt => {
        const el = document.createElement('option');
        el.value       = opt.value;
        el.textContent = opt.label;
        sel.appendChild(el);
    });

    if (prev && [...sel.options].some(o => o.value === prev)) sel.value = prev;
}

// ════════════════════════════════════════════════════════════
//  6. PRICE DISPLAYS — ყველა price-input ველის შევსება
// ════════════════════════════════════════════════════════════

function fillPriceDisplays(m2) {
    // სტატიკური ფასების ველები
    const map = {
        'price_p1':    m2 * PRICES.p1_rate,
        'price_p2':    m2 * PRICES.p2_rate,
        'price_p3':    PRICES.konstr_ocynk,
        'price_p4':    PRICES.konstr_ral,
        'price_p5':    PRICES.konstr_ral_mat,
        'price_p6':    PRICES.wykon_drewno,
        'price_nad':   m2 * PRICES.nadwymiar,
        'price_okuc':  PRICES.okucia,
        'price_filc':  m2 * PRICES.filc_rate,
        'price_reg':   PRICES.dostawa,
        'price_ryn':   0,   // → runCalc-ში განახლდება
        'price_kot':   PRICES.kotwienie,
        'price_seg':   PRICES.brama_segm,
        'price_blach': PRICES.blachodach,
        // price_dwu  → runCalc-ში (typDachuOptions-დან)
        // price_tr   → runCalc-ში (transport combo-დან)
    };
    Object.entries(map).forEach(([id, val]) => setVal(id, Math.round(val)));

    // დინამიური პოზიციების ფასები
    Object.values(dynamicItems).flat().forEach(item => {
        setVal('dyn_price_' + item.id,
            Math.round(item.perM2 ? item.price * m2 : item.price));
    });
}

// ════════════════════════════════════════════════════════════
//  7. MAIN CALCULATION
// ════════════════════════════════════════════════════════════

function runCalc() {
    const szCm = getNum('w_szer');
    const glCm = getNum('w_gleb');
    const sz   = szCm / 100;   // Szerokość w metrach (do obliczeń)
    const gl   = glCm / 100;   // Głębokość w metrach (do obliczeń)
    const hCm  = getNum('w_wys_cm');
    const m2   = sz * gl;

    setDisp('dim-summary', `Powierzchnia: ${m2.toFixed(1)} m² | Wysokość: ${(hCm/100).toFixed(2)} m`);
    fillPriceDisplays(m2);

    // Nadwymiar — auto-check
    const nadCb = $('cb_nad');
    if (nadCb) nadCb.checked = hCm > 235;

    let ySum     = 0;   // ბაზა (სახელ-ფასი პირდაპირ კონსტრუქციაში)
    let wSum     = 0;   // დანამატები
    let pdfItems = [];  // PDF-ისთვის ჩამონათვალი

    // ── y-check: ბაზის კონსტრუქციის checkbox-ები ──
    document.querySelectorAll('.y-check').forEach(cb => {
        const pInput = cb.closest('.option-row')?.querySelector('.price-input');
        if (cb.checked && pInput) {
            ySum += parseFloat(pInput.value) || 0;
            pdfItems.push(cb.dataset.label || '');
            pInput.classList.add('active-price');
        } else if (pInput) {
            pInput.classList.remove('active-price');
        }
    });

    // ── Ściana działowa ──
    const sMeters = getNum('sciana_m');
    const sTotal  = sMeters * PRICES.scionaPerMeter;
    setVal('sciana_res', Math.round(sTotal));
    if (sMeters > 0) {
        ySum += sTotal;
        pdfItems.push(`Ściana działowa: ${sMeters} mb`);
    }

    // ── Kratownica / Słup (rozliczane na bazie, jak konstrukcja) ──
    [
        { qId: 'qty_kratownica', rId: 'res_kratownica', price: PRICES.kratownica, label: 'Kratownica', unit: 'szt.', int: true },
        { qId: 'qty_slup',       rId: 'res_slup',        price: PRICES.slup,       label: 'Słup',       unit: 'mb',   int: false },
    ].forEach(({ qId, rId, price, label, unit, int }) => {
        const qty   = int ? getInt(qId) : getNum(qId);
        const total = qty * price;
        setVal(rId, total);
        if (qty > 0) { ySum += total; pdfItems.push(`${label}: ${qty} ${unit}`); }
    });

    // ── Brama uchylna — szerokość × wysokość → m² × cena/m² ──
    const uchSzCm  = getNum('brama_uch_szer');
    const uchWyCm  = getNum('brama_uch_wys');
    const uchM2    = (uchSzCm / 100) * (uchWyCm / 100);
    const uchTotal = uchM2 * PRICES.bramaUchylna;
    setVal('res_brama_uch', Math.round(uchTotal));
    if (uchM2 > 0) {
        wSum += uchTotal;
        pdfItems.push(`Brama uchylna: ${uchSzCm}×${uchWyCm} cm (${uchM2.toFixed(2)} m²)`);
    }

    // ── Brama dwuskrzydłowa — szerokość × wysokość → m² × cena/m² ──
    const dwuSzCm  = getNum('brama_dwu_szer');
    const dwuWyCm  = getNum('brama_dwu_wys');
    const dwuM2    = (dwuSzCm / 100) * (dwuWyCm / 100);
    const dwuTotal = dwuM2 * PRICES.bramaDwu;
    setVal('res_brama_dwu', Math.round(dwuTotal));
    if (dwuM2 > 0) {
        wSum += dwuTotal;
        pdfItems.push(`Brama dwuskrzydłowa: ${dwuSzCm}×${dwuWyCm} cm (${dwuM2.toFixed(2)} m²)`);
    }

    // ── რაოდენობის პოზიციები (Okno, Napęd) ──
    [
        { qId: 'qty_okno',  rId: 'res_okno',  price: PRICES.okno,         label: 'Okno PCV (80x60)' },
        { qId: 'qty_came',  rId: 'res_came',  price: PRICES.napedCame,    label: 'Napęd Came'       },
        { qId: 'qty_drzwi_blaszane', rId: 'res_drzwi_blaszane', price: PRICES.drzwiBlaszane, label: 'Drzwi blaszane'   },
        { qId: 'qty_drzwi_eco',      rId: 'res_drzwi_eco',      price: PRICES.drzwiEco,      label: 'Drzwi Eco Basic' },
        { qId: 'qty_drzwi_gerda',    rId: 'res_drzwi_gerda',    price: PRICES.drzwiGerda,    label: 'Drzwi Gerda'     },
        { qId: 'qty_drzwi_mtbram',   rId: 'res_drzwi_mtbram',   price: PRICES.drzwiMtbram,   label: 'Drzwi MT-Bram'   },
    ].forEach(({ qId, rId, price, label }) => {
        const qty   = getInt(qId);
        const total = qty * price;
        setVal(rId, total);
        if (qty > 0) { wSum += total; pdfItems.push(`${label}: ${qty} szt.`); }
    });

    // ── Okno PCV inne — ręcznie wpisana ilość i cena jednostkowa ──
    const oknoInneQty   = getInt('qty_okno_inne');
    const oknoInneCena  = getNum('cena_okno_inne');
    const oknoInneTotal = oknoInneQty * oknoInneCena;
    setVal('res_okno_inne', Math.round(oknoInneTotal));
    if (oknoInneQty > 0 && oknoInneCena > 0) {
        wSum += oknoInneTotal;
        pdfItems.push(`Okno PCV inne: ${oknoInneQty} szt. × ${oknoInneCena} PLN`);
    }

    // ── w-check: დანამატების checkbox-ები ──
    document.querySelectorAll('.w-check').forEach(cb => {
        const pInput = cb.closest('.option-row')?.querySelector('.price-input');
        if (cb.checked && pInput) {
            wSum += parseFloat(pInput.value) || 0;
            pdfItems.push(cb.dataset.label || '');
            pInput.classList.add('active-price');
        } else if (pInput) {
            pInput.classList.remove('active-price');
        }
    });

    // ── Typ Dachu — select → price_dwu ──
    const typDachu   = $('typ_dachu')?.value || '';
    const activeOpt  = typDachuOptions.find(o => o.value === typDachu);
    const dachuPrice = activeOpt?.price || 0;
    const dwuPriceEl = $('price_dwu');

    if (typDachu && dwuPriceEl) {
        dwuPriceEl.value = Math.round(dachuPrice) || '';
        dwuPriceEl.classList.toggle('active-price', dachuPrice > 0);
        if (dachuPrice > 0) {
            ySum += dachuPrice;
            pdfItems.push(`Typ Dachu: ${activeOpt.label}`);
        }
    } else if (dwuPriceEl) {
        dwuPriceEl.value = '';
        dwuPriceEl.classList.remove('active-price');
    }

    // ── System rynnowy ──
    const rynCb      = $('cb_ryn');
    const rynPriceEl = $('price_ryn');
    const rynBadge   = $('ryn_meters_badge');

    let rynMeters = 0;
    if      (typDachu === 'dwu')                               rynMeters = gl * 2;
    else if (typDachu === 'tyl' || typDachu === 'przod')       rynMeters = sz;
    else if (typDachu === 'lewo' || typDachu === 'prawo')      rynMeters = gl;

    const rynnyRate = (activeOpt?.rynnyPerMb > 0) ? activeOpt.rynnyPerMb : PRICES.rynny;
    const rynTotal  = rynMeters * rynnyRate;

    if (rynBadge)   rynBadge.textContent  = rynMeters > 0 ? `${rynMeters} mb` : '';
    if (rynPriceEl) rynPriceEl.value      = Math.round(rynTotal);

    if (rynCb?.checked && rynTotal > 0) {
        rynPriceEl?.classList.add('active-price');
        wSum += rynTotal;
        pdfItems.push(`Rynny ${activeOpt?.label || typDachu}: ${Math.round(rynTotal)} PLN`);
    } else {
        rynPriceEl?.classList.remove('active-price');
    }

    // ── Transport (województwo combo) ──
    const trType    = $('tr_type')?.value || '';
    const trWoj     = $('tr_woj')?.value  || '';
    const trLabel   = $('tr_selected_label');
    const trPriceEl = $('price_tr');

    if (trType && trWoj && transportPrices[trWoj]) {
        const trVal = transportPrices[trWoj][trType] || 0;
        if (trPriceEl) {
            trPriceEl.value = trVal;
            trPriceEl.classList.replace('price-result', 'active-price') ||
            trPriceEl.classList.add('active-price');
        }
        if (trLabel) trLabel.textContent = `${trWoj} · ${trType === 'blachane' ? 'Blachane' : 'Garaże X4'}`;
        if (trVal > 0) { wSum += trVal; pdfItems.push(`Transport ${trWoj}: ${trVal} PLN`); }
    } else {
        if (trPriceEl) {
            trPriceEl.value = '';
            trPriceEl.classList.remove('active-price');
            trPriceEl.classList.add('price-result');
        }
        if (trLabel) trLabel.textContent =
            (!trType && !trWoj) ? 'Wybierz typ i województwo' :
            !trType             ? 'Wybierz typ produktu'      :
                                  'Wybierz województwo';
    }

    // ── Korekta (ручна корекція) ──
    wSum += getNum('val_doplata');

    // ════ TOTALS ════
    const rabat       = getNum('rabat_pct');
    const baseTotal   = ySum + wSum;
    const discountVal = ySum * (rabat / 100);
    const netto       = baseTotal - discountVal;
    const brutto      = Math.round(netto / 10) * 10;

    setDisp('disp_base',         fmt(baseTotal));
    setDisp('disp_discount',     '−' + fmt(discountVal));
    setDisp('disp_profil_netto', fmt(netto));
    setDisp('disp_profil',       fmt(brutto));
    setDisp('header-price',      fmt(brutto));

    updatePdf(sz, gl, hCm, brutto, pdfItems);
}

// ════════════════════════════════════════════════════════════
//  8. PDF UPDATE
// ════════════════════════════════════════════════════════════

function updatePdf(sz, gl, hCm, brutto, pdfItems) {
    const specsEl = $('pdf_specs');
    if (specsEl) {
        specsEl.innerHTML =
            `<li><span>Wymiary</span><strong>${sz.toFixed(2).replace(/\.?0+$/, '')}×${gl.toFixed(2).replace(/\.?0+$/, '')} m</strong></li>` +
            `<li><span>Wysokość</span><strong>${(hCm/100).toFixed(2)} m</strong></li>` +
            pdfItems.filter(Boolean)
                .map(i => `<li><span>${i}</span><span>✔</span></li>`).join('');
    }

    const pdfTotal = $('pdf_total');
    if (pdfTotal) pdfTotal.textContent = brutto.toLocaleString('pl-PL');

    const pdfDate = $('pdf-date');
    if (pdfDate) pdfDate.textContent = new Date().toLocaleDateString('pl-PL',
        { day: '2-digit', month: 'long', year: 'numeric' });
}

// ════════════════════════════════════════════════════════════
//  9. INIT
// ════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, async (user) => {
        if (!user) { window.location.href = 'admin.html'; return; }

        await syncPricesWithFirebase();

        const appEl = $('main-app-content');
        if (appEl) appEl.style.display = '';

        injectDynamicItems();
        injectTypDachuSelect();

        document.querySelectorAll('.calc-trigger').forEach(el => {
            el.addEventListener(
                (el.type === 'checkbox' || el.tagName === 'SELECT') ? 'change' : 'input',
                runCalc
            );
        });

        runCalc();
    });
});