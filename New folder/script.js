/**
 * SteelCalc Pro — Business Logic Engine (Cloud-Connected)
 * User-facing calculator: prices are READ-ONLY from Firebase.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
const db  = getFirestore(app);

// ─── 1. DEFAULT PRICES (fallback if Firebase unreachable) ────────────────────
let PRICES = {
    p1_rate: 750, p2_rate: 680, konstr_ocynk: 0, konstr_ral: 0,
    konstr_ral_mat: 0, wykon_drewno: 0, nadwymiar: 15, okucia: 700,
    dach_dwuspad: 550, scionaPerMeter: 350, t8_rate: 0, filc_rate: 12,
    bramaUchylna: 1100, okno: 600, napedCame: 950, furtka: 450,
    transport: 100, dostawa: 100, rynny: 1200, kotwienie: 250,
    brama_segm: 6000, blachodach: 4000, dach_2sk: 0
};

// ─── 2. SYNC FROM FIREBASE ───────────────────────────────────────────────────
async function syncPricesWithFirebase() {
    try {
        const docSnap = await getDoc(doc(db, "settings", "prices"));
        if (docSnap.exists()) {
            const data = docSnap.data();
            Object.keys(PRICES).forEach(key => {
                if (data[key] !== undefined) PRICES[key] = data[key];
            });
            console.log("✅ Firebase: ფასები სინქრონიზებულია.");
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

// ─── 4. FILL PRICE DISPLAY INPUTS (read-only, auto from Firebase) ────────────
function fillPriceDisplays(m2) {
    const mapping = {
        'price_p1':   m2 * PRICES.p1_rate,
        'price_p2':   m2 * PRICES.p2_rate,
        'price_p3':   PRICES.konstr_ocynk,
        'price_p4':   PRICES.konstr_ral,
        'price_p5':   PRICES.konstr_ral_mat,
        'price_p6':   PRICES.wykon_drewno,
        'price_nad':  m2 * PRICES.nadwymiar,
        'price_okuc': PRICES.okucia,
        'price_dwu':  PRICES.dach_dwuspad,
        'price_filc': m2 * PRICES.filc_rate,
        't8_val':     PRICES.t8_rate,
        'price_furtka': PRICES.furtka,
        'price_tr':   PRICES.transport,
        'price_reg':  PRICES.dostawa,
        'price_ryn':  PRICES.rynny,
        'price_kot':  PRICES.kotwienie,
        'price_seg':  PRICES.brama_segm,
        'price_blach':PRICES.blachodach,
        'val_2sk':    PRICES.dach_2sk,
    };
    Object.entries(mapping).forEach(([id, val]) => setVal(id, Math.round(val)));
}

// ─── 5. MAIN CALCULATION ─────────────────────────────────────────────────────
function runCalc() {
    const sz  = getNum('w_szer');
    const gl  = getNum('w_gleb');
    const hCm = getNum('w_wys_cm');
    const m2  = sz * gl;

    // Dimensions info
    setDisp('dim-summary', `Powierzchnia: ${m2.toFixed(1)} m² | Wysokość: ${(hCm/100).toFixed(2)} m`);

    // Always refresh price displays from PRICES object
    fillPriceDisplays(m2);

    // Auto nadwymiar checkbox
    const nadCb = document.getElementById('cb_nad');
    if (nadCb) nadCb.checked = hCm > 235;

    let ySum = 0; // Construction base
    let wSum = 0; // Extras
    let pdfItems = [];

    // --- Base construction checkboxes (y-check) ---
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

    // --- Ściana działowa ---
    const sMeters = getNum('sciana_m');
    const sTotal  = sMeters * PRICES.scionaPerMeter;
    setVal('sciana_res', Math.round(sTotal));
    if (sMeters > 0) {
        ySum += sTotal;
        pdfItems.push(`Ściana działowa: ${sMeters} mb`);
    }

    // --- Quantity items (Bramy, Okna, Napęd) ---
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

    // --- Extras checkboxes (w-check) ---
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

    // --- T8, 2SK ---
    if (document.getElementById('t8_check')?.checked)  ySum += getNum('t8_val');
    if (document.getElementById('check_2sk')?.checked) wSum += getNum('val_2sk');

    // --- Korekta (manual adjustment) ---
    wSum += getNum('val_doplata');

    // --- Final totals ---
    const rabat       = getNum('rabat_pct');
    const baseTotal   = ySum + wSum;
    const discountVal = ySum * (rabat / 100);
    const netto       = baseTotal - discountVal;
    const brutto      = Math.round(netto / 10) * 10;

    setDisp('disp_base',     formatPLN(baseTotal));
    setDisp('disp_discount', '−' + formatPLN(discountVal));
    setDisp('disp_profil_netto', formatPLN(netto));
    setDisp('disp_profil',   formatPLN(brutto));
    setDisp('header-price',  formatPLN(brutto));

    // --- PDF specs ---
    const specsEl = document.getElementById('pdf_specs');
    if (specsEl) {
        const base = [
            `<li><span>Wymiary</span><strong>${sz}×${gl} m</strong></li>`,
            `<li><span>Wysokość</span><strong>${(hCm/100).toFixed(2)} m</strong></li>`,
        ];
        specsEl.innerHTML = base.join('') +
            pdfItems.filter(Boolean).map(i => `<li><span>${i}</span><span>✔</span></li>`).join('');
    }

    // PDF total
    const pdfTotal = document.getElementById('pdf_total');
    if (pdfTotal) pdfTotal.textContent = brutto.toLocaleString('pl-PL');

    // PDF date
    const pdfDate = document.getElementById('pdf-date');
    if (pdfDate) pdfDate.textContent = new Date().toLocaleDateString('pl-PL', {
        day: '2-digit', month: 'long', year: 'numeric'
    });
}

// ─── 6. INIT ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    // Load prices from Firebase first
    await syncPricesWithFirebase();

    // Attach listeners — only dimension/checkbox/qty inputs trigger recalc
    // Price inputs are readonly so users can't change them
    document.querySelectorAll('.calc-trigger').forEach(el => {
        const event = el.type === 'checkbox' ? 'change' : 'input';
        el.addEventListener(event, runCalc);
    });

    // Initial calculation
    runCalc();
});
