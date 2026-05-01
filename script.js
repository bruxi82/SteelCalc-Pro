/**
 * SteelCalc Pro — Business Logic Engine
 * Refactored: modular, maintainable, no global state pollution.
 */

// ─── 1. SECURITY / EXPIRY ────────────────────────────────────────────────────
(function checkExpiry() {
    const EXPIRY = new Date('2026-12-31');
    if (new Date() <= EXPIRY) return;

    const errorEl = document.getElementById('critical-error');
    const appEl   = document.getElementById('main-app-content');
    if (errorEl) errorEl.classList.add('active');
    if (appEl)   appEl.style.display = 'none';

    // Prevent calc from running
    window.runCalc = () => {};
})();


// ─── 2. CONSTANTS ────────────────────────────────────────────────────────────
const PRICES = {
    scionaPerMeter: 350,
    bramaUchylna:   1100,
    okno:           600,
    napedCame:      950,
};


// ─── 3. HELPERS ──────────────────────────────────────────────────────────────
/** Get a numeric value from an input element safely. */
function getNum(id) {
    return parseFloat(document.getElementById(id)?.value) || 0;
}

/** Get an integer value from an input element safely. */
function getInt(id) {
    return parseInt(document.getElementById(id)?.value, 10) || 0;
}

/** Set the display value of an element by id. */
function setDisplay(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

/** Set a numeric input value. */
function setInputVal(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
}

/** Toggle the active-price highlight class on a price input. */
function setPriceActive(inputEl, isActive) {
    if (!inputEl) return;
    inputEl.classList.toggle('active-price', isActive);
}

/** Format a number as Polish currency string. */
function formatPLN(value) {
    return value.toLocaleString('pl-PL') + ' PLN';
}


// ─── 4. AUTO-PRICING (dimension-based defaults) ──────────────────────────────
function updateAutoprices(m2) {
    const AUTO = [
        ['price_p1', m2 * 750],
        ['price_p2', m2 * 680],
        ['price_p3', m2 * 300],
        ['price_p4', m2 * 360],
        ['price_p5', m2 * 380],
        ['price_p6', m2 * 420],
        ['price_filc', m2 * 12],
        ['price_nad', m2 * 15],
    ];
    AUTO.forEach(([id, val]) => setInputVal(id, val.toFixed(0)));
}


// ─── 5. MAIN CALCULATION ─────────────────────────────────────────────────────
function runCalc(isManual) {
    // Dimensions
    const sz   = getNum('w_szer');
    const gl   = getNum('w_gleb');
    const hCm  = getNum('w_wys_cm');
    const m2   = sz * gl;

    // Update dimension summary
    const summaryEl = document.getElementById('dim-summary');
    if (summaryEl) {
        summaryEl.innerHTML = `Powierzchnia: <strong>${m2.toFixed(1)} m²</strong> &nbsp;·&nbsp; Wysokość: <strong>${(hCm / 100).toFixed(2)} m</strong>`;
    }

    // Auto-price only when dimensions change, not on manual price edits
    if (!isManual) {
        updateAutoprices(m2);
    }

    // Height surcharge — auto-enable when > 235cm
    const nadCb = document.getElementById('cb_nad');
    if (nadCb) nadCb.checked = hCm > 235;

    let ySum = 0; // "base" construction prices
    let wSum = 0; // "extras"
    const pdfItems = [];

    // ── 5a. Checkboxes: .y-check (base construction) ──
    document.querySelectorAll('.y-check').forEach(cb => {
        const priceInput = cb.closest('.option-row')?.querySelector('.price-input');
        const isChecked  = cb.checked;
        if (isChecked && priceInput) {
            ySum += getNum(priceInput.id);
            pdfItems.push(cb.dataset.label);
        }
        setPriceActive(priceInput, isChecked);
    });

    // ── 5b. Ściana działowa ──
    const scianaM = getNum('sciana_m');
    const scianaV = scianaM * PRICES.scionaPerMeter;
    setInputVal('sciana_res', scianaV);
    const scianaResEl = document.getElementById('sciana_res');
    if (scianaM > 0) {
        ySum += scianaV;
        pdfItems.push(`Ściana działowa: ${scianaM} mb`);
        setPriceActive(scianaResEl, true);
    } else {
        setPriceActive(scianaResEl, false);
    }

    // ── 5c. T8 przetłoczenia ──
    const t8Active = document.getElementById('t8_check')?.checked;
    const t8Input  = document.getElementById('t8_val');
    if (t8Active) {
        ySum += getNum('t8_val');
        pdfItems.push('Przetłoczenia poziome T8');
    }
    setPriceActive(t8Input, t8Active);

    // ── 5d. Filc ──
    const filcActive = document.getElementById('filc_active')?.checked;
    const filcInput  = document.getElementById('price_filc');
    if (filcActive) {
        wSum += getNum('price_filc');
        pdfItems.push('Filc antykondensacyjny');
    }
    setPriceActive(filcInput, filcActive);

    // ── 5e. Quantity items ──
    const QTY_ITEMS = [
        { qtyId: 'qty_b_uch', resId: 'res_b_uch', unitPrice: PRICES.bramaUchylna, label: 'Brama uchylna' },
        { qtyId: 'qty_okno',  resId: 'res_okno',  unitPrice: PRICES.okno,         label: 'Okno PCV' },
        { qtyId: 'qty_came',  resId: 'res_came',  unitPrice: PRICES.napedCame,    label: 'Napęd automatyczny' },
    ];

    QTY_ITEMS.forEach(({ qtyId, resId, unitPrice, label }) => {
        const qty   = getInt(qtyId);
        const total = qty * unitPrice;
        setInputVal(resId, total);
        const resEl = document.getElementById(resId);
        if (qty > 0) {
            wSum += total;
            pdfItems.push(`${label}: ${qty} szt.`);
            setPriceActive(resEl, true);
        } else {
            setPriceActive(resEl, false);
        }
    });

    // ── 5f. Checkboxes: .w-check (extras) ──
    document.querySelectorAll('.w-check').forEach(cb => {
        const priceInput = cb.closest('.option-row')?.querySelector('.price-input');
        const isChecked  = cb.checked;
        if (isChecked && priceInput) {
            wSum += getNum(priceInput.id);
            pdfItems.push(cb.dataset.label);
        }
        setPriceActive(priceInput, isChecked);
    });

    // ── 5g. Dach 2SK ──
    const sk2Active = document.getElementById('check_2sk')?.checked;
    const sk2Input  = document.getElementById('val_2sk');
    if (sk2Active) {
        wSum += getNum('val_2sk');
        pdfItems.push('Konstrukcja dachu 2SK');
    }
    setPriceActive(sk2Input, sk2Active);

    // ── 5h. Korekta (manual price adjustment) ──
    const korektaVal   = getNum('val_doplata');
    const korektaInput = document.getElementById('val_doplata');
    wSum += korektaVal;
    setPriceActive(korektaInput, korektaVal !== 0);

    // ─── 6. TOTALS ────────────────────────────────────────────────────────────
    const rabatPct  = getNum('rabat_pct');
    const discount  = ySum * (rabatPct / 100);
    const baseTotal = ySum + wSum;
    const netto     = baseTotal - discount;
    const brutto    = Math.round(netto / 10) * 10;

    // ─── 7. UPDATE UI ─────────────────────────────────────────────────────────
    setDisplay('disp_base',     formatPLN(baseTotal));
    setDisplay('disp_discount', '−' + formatPLN(discount));
    setDisplay('disp_florian',  formatPLN(netto));
    setDisplay('disp_profil',   formatPLN(brutto));
    setDisplay('header-price',  formatPLN(brutto));

    // ─── 8. PDF PREPARATION ──────────────────────────────────────────────────
    const dateStr = new Date().toLocaleDateString('pl-PL', {
        day: '2-digit', month: 'long', year: 'numeric'
    });
    setDisplay('pdf-date', `Data wyceny: ${dateStr}`);

    const specsEl = document.getElementById('pdf_specs');
    if (specsEl) {
        const baseItems = [
            `<li><span>Wymiary konstrukcji</span><strong>${sz} × ${gl} m</strong></li>`,
            `<li><span>Wysokość całkowita</span><strong>${(hCm / 100).toFixed(2)} m</strong></li>`,
            `<li><span>Powierzchnia</span><strong>${m2.toFixed(1)} m²</strong></li>`,
        ];
        const optionItems = pdfItems.map(label => `<li><span>${label}</span><span>✔</span></li>`);
        specsEl.innerHTML = [...baseItems, ...optionItems].join('');
    }

    setDisplay('pdf_total', brutto.toLocaleString('pl-PL'));
}


// ─── 9. INITIALISATION ───────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Attach listeners to all calc triggers
    document.querySelectorAll('.calc-trigger').forEach(el => {
        const eventType = (el.type === 'checkbox') ? 'change' : 'input';
        el.addEventListener(eventType, (e) => {
            // isManual = true when user directly edits a price input
            const isManual = e.target.classList.contains('price-input');
            runCalc(isManual);
        });
    });

    // Run initial calculation on load
    runCalc(false);
});