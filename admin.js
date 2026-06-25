/**
 * SteelCalc Pro — Admin Panel Logic
 * Firebase Auth + Firestore price management + Dynamic items
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    serverTimestamp,
    collection,
    addDoc,
    getDocs,
    updateDoc,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import {
    getAuth,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// ─── Firebase Init ────────────────────────────────────────────────────────────
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

// ─── Field → Firebase Key Mapping ────────────────────────────────────────────
const FIELD_MAP = {
    ap_p1_rate:         'p1_rate',
    ap_p2_rate:         'p2_rate',
    ap_konstr_ocynk:    'konstr_ocynk',
    ap_konstr_ral:      'konstr_ral',
    ap_konstr_ral_mat:  'konstr_ral_mat',
    ap_wykon_drewno:    'wykon_drewno',
    ap_nadwymiar:       'nadwymiar',
    ap_okucia:          'okucia',
    ap_scionaPerMeter:  'scionaPerMeter',
    ap_t8_rate:         't8_rate',
    ap_filc_rate:       'filc_rate',
    ap_bramaUchylna:    'bramaUchylna',
    ap_okno:            'okno',
    ap_napedCame:       'napedCame',
    ap_furtka:          'furtka',
    // ap_transport handled separately via transportPrices table
    ap_dostawa:         'dostawa',
    ap_rynny:           'rynny',
    ap_kotwienie:       'kotwienie',
    ap_brama_segm:      'brama_segm',
    ap_blachodach:      'blachodach',
    ap_dach_2sk:        'dach_2sk',
};

// ─── Card sections config ────────────────────────────────────────────────────
// section = which calculator section to inject into
// calcType = 'y' (base/construction) or 'w' (extras)
// perM2 = true if price is multiplied by m²
const CARD_SECTIONS = {
    'card-plyty':    { section: 'konstrukcja', calcType: 'y', label: 'Płyty Konstrukcyjne' },
    'card-dach':     { section: 'dach',        calcType: 'y', label: 'Dach i Pokrycie'     },
    'card-akcesoria':{ section: 'akcesoria',   calcType: 'w', label: 'Bramy i Akcesoria'   },
    'card-logistyka':{ section: 'logistyka',   calcType: 'w', label: 'Logistyka i Montaż'  },
};

// ─── Transport prices per województwo ────────────────────────────────────────
const WOJEWODZTWA = [
    'Dolnośląskie',
    'Kuj-Pomorskie',
    'Lubelskie',
    'Lubuskie',
    'Mazowieckie',
    'Małopolska',
    'Opolskie',
    'Podkarpackie',
    'Podlaskie',
    'Pomorskie',
    'Warm-Mazurskie',
    'Wielkopolskie',
    'Zach-Pomorskie',
    'Łódzkie',
    'Śląskie',
    'Świętokrzyskie',
];

// Default transport prices from the Excel sheet
const DEFAULT_TRANSPORT = {
    'Dolnośląskie':    { blachane: 400,  x4: 1600 },
    'Kuj-Pomorskie':   { blachane: 510,  x4: 2040 },
    'Lubelskie':       { blachane: 460,  x4: 1840 },
    'Lubuskie':        { blachane: 510,  x4: 2040 },
    'Mazowieckie':     { blachane: 510,  x4: 2040 },
    'Małopolska':      { blachane: 270,  x4: 1080 },
    'Opolskie':        { blachane: 350,  x4: 1400 },
    'Podkarpackie':    { blachane: 350,  x4: 1400 },
    'Podlaskie':       { blachane: 570,  x4: 2280 },
    'Pomorskie':       { blachane: 570,  x4: 2280 },
    'Warm-Mazurskie':  { blachane: 570,  x4: 2280 },
    'Wielkopolskie':   { blachane: 570,  x4: 2280 },
    'Zach-Pomorskie':  { blachane: 630,  x4: 2520 },
    'Łódzkie':         { blachane: 460,  x4: 1840 },
    'Śląskie':         { blachane: 350,  x4: 1400 },
    'Świętokrzyskie':  { blachane: 350,  x4: 1400 },
};

// Live state of transport prices (edited by admin)
let transportPrices = JSON.parse(JSON.stringify(DEFAULT_TRANSPORT));

function renderTransportPrices() {
    const list = document.getElementById('transport-prices-list');
    if (!list) return;
    list.innerHTML = '';
    WOJEWODZTWA.forEach(woj => {
        const prices = transportPrices[woj] || { blachane: 0, x4: 0 };
        const row = document.createElement('div');
        row.style.cssText = 'display:grid; grid-template-columns: 1fr auto auto; gap:4px; align-items:center; padding: 5px 8px; border-radius: var(--r-input); transition: background 0.15s;';
        row.innerHTML = `
            <span style="font-size:12px; color:var(--c-text-dim);">${escHtml(woj)}</span>
            <div class="admin-input-wrap" style="width:100px;">
                <input type="number" class="admin-input tr-blachane" data-woj="${escHtml(woj)}" value="${prices.blachane}" min="0">
                <span class="admin-unit">PLN</span>
            </div>
            <div class="admin-input-wrap" style="width:100px;">
                <input type="number" class="admin-input tr-x4" data-woj="${escHtml(woj)}" value="${prices.x4}" min="0">
                <span class="admin-unit">PLN</span>
            </div>
        `;
        row.addEventListener('mouseenter', () => row.style.background = 'var(--c-surface-2)');
        row.addEventListener('mouseleave', () => row.style.background = '');
        list.appendChild(row);
    });
}

// Listen for changes in transport price inputs
document.addEventListener('input', (e) => {
    if (e.target.matches('.tr-blachane')) {
        const woj = e.target.dataset.woj;
        if (!transportPrices[woj]) transportPrices[woj] = { blachane: 0, x4: 0 };
        transportPrices[woj].blachane = parseFloat(e.target.value) || 0;
    }
    if (e.target.matches('.tr-x4')) {
        const woj = e.target.dataset.woj;
        if (!transportPrices[woj]) transportPrices[woj] = { blachane: 0, x4: 0 };
        transportPrices[woj].x4 = parseFloat(e.target.value) || 0;
    }
});

// ─── Typ Dachu Options ───────────────────────────────────────────────────────
// Each entry: { id, label, value, price, rynnyPerMb }
const DEFAULT_TYP_DACHU = [
    { id: 'td_dwu',   label: 'Dwuspadowy', value: 'dwu',   price: 0, rynnyPerMb: 0 },
    { id: 'td_tyl',   label: 'Tył',        value: 'tyl',   price: 0, rynnyPerMb: 0 },
    { id: 'td_lewo',  label: 'Lewo',       value: 'lewo',  price: 0, rynnyPerMb: 0 },
    { id: 'td_prawo', label: 'Prawo',      value: 'prawo', price: 0, rynnyPerMb: 0 },
];

let typDachuOptions = JSON.parse(JSON.stringify(DEFAULT_TYP_DACHU));

function renderTypDachuOptions() {
    const list = document.getElementById('typdachu-list');
    if (!list) return;
    list.innerHTML = '';

    typDachuOptions.forEach((opt) => {
        const row = document.createElement('div');
        row.style.cssText = 'display:grid; grid-template-columns: 1fr 120px 110px 110px auto; gap:6px; align-items:center; padding: 5px 8px; border-radius: var(--r-input); transition: background 0.15s;';
        row.dataset.id = opt.id;
        row.innerHTML = `
            <input
                type="text"
                class="admin-input-text td-label"
                value="${escHtml(opt.label)}"
                placeholder="Nazwa opcji..."
                data-id="${opt.id}"
                style="font-size:13px;"
            >
            <input
                type="text"
                class="admin-input td-value"
                value="${escHtml(opt.value)}"
                placeholder="np. dwu"
                data-id="${opt.id}"
                style="font-size:12px; font-family:monospace; text-align:center;"
            >
            <div class="admin-input-wrap">
                <input
                    type="number"
                    class="admin-input td-price"
                    value="${opt.price || 0}"
                    min="0"
                    data-id="${opt.id}"
                >
                <span class="admin-unit">PLN</span>
            </div>
            <div class="admin-input-wrap">
                <input
                    type="number"
                    class="admin-input td-rynny"
                    value="${opt.rynnyPerMb || 0}"
                    min="0"
                    data-id="${opt.id}"
                >
                <span class="admin-unit">PLN/mb</span>
            </div>
            <button class="btn-remove-item td-remove" data-id="${opt.id}" title="Usuń opcję">✕</button>
        `;
        row.addEventListener('mouseenter', () => row.style.background = 'var(--c-surface-2)');
        row.addEventListener('mouseleave', () => row.style.background = '');
        list.appendChild(row);
    });
}

// Event listeners for typDachuOptions edits
document.addEventListener('input', (e) => {
    if (e.target.matches('.td-label')) {
        const opt = typDachuOptions.find(o => o.id === e.target.dataset.id);
        if (opt) opt.label = e.target.value;
    }
    if (e.target.matches('.td-value')) {
        const opt = typDachuOptions.find(o => o.id === e.target.dataset.id);
        if (opt) opt.value = e.target.value.trim();
    }
    if (e.target.matches('.td-price')) {
        const opt = typDachuOptions.find(o => o.id === e.target.dataset.id);
        if (opt) opt.price = parseFloat(e.target.value) || 0;
    }
    if (e.target.matches('.td-rynny')) {
        const opt = typDachuOptions.find(o => o.id === e.target.dataset.id);
        if (opt) opt.rynnyPerMb = parseFloat(e.target.value) || 0;
    }
});

document.addEventListener('click', (e) => {
    if (e.target.matches('.td-remove')) {
        typDachuOptions = typDachuOptions.filter(o => o.id !== e.target.dataset.id);
        renderTypDachuOptions();
    }
    if (e.target.id === 'btn-add-typdachu') {
        typDachuOptions.push({
            id:          'td_' + Date.now(),
            label:       '',
            value:       '',
            rynnyPerMb:  0,
        });
        renderTypDachuOptions();
        const list = document.getElementById('typdachu-list');
        list?.querySelector('.td-label:last-of-type')?.focus();
    }
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

function showStatus(msg, isError = false) {
    const el = $('save-status');
    const text = $('save-status-text');
    text.textContent = msg;
    el.classList.remove('save-status--hidden', 'save-status--error');
    if (isError) el.classList.add('save-status--error');
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.add('save-status--hidden'), 4000);
}

function formatTimestamp(ts) {
    if (!ts) return 'Brak danych';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return 'Ostatnia aktualizacja: ' + d.toLocaleString('pl-PL');
}

function generateId() {
    return 'dyn_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

// ─── Dynamic Items State ──────────────────────────────────────────────────────
// Structure: { cardId: [ { id, label, price, unit, perM2 }, ... ] }
let dynamicItems = {
    'card-plyty': [],
    'card-dach': [],
    'card-akcesoria': [],
    'card-logistyka': [],
};

// ─── Render Dynamic Items for a card ─────────────────────────────────────────
function renderDynamicItems(cardId) {
    const container = document.getElementById(`dynamic-list-${cardId}`);
    if (!container) return;
    container.innerHTML = '';

    dynamicItems[cardId].forEach((item) => {
        const row = document.createElement('div');
        row.className = 'admin-price-row dynamic-item-row';
        row.dataset.id = item.id;
        row.innerHTML = `
            <div class="dynamic-item-fields">
                <input
                    type="text"
                    class="admin-input-text dyn-label"
                    value="${escHtml(item.label)}"
                    placeholder="Nazwa pozycji..."
                    data-id="${item.id}"
                    data-card="${cardId}"
                >
                <div class="admin-input-wrap" style="width:110px;">
                    <input
                        type="number"
                        class="admin-input dyn-price"
                        value="${item.price}"
                        min="0"
                        data-id="${item.id}"
                        data-card="${cardId}"
                    >
                    <span class="admin-unit">PLN</span>
                </div>
                <label class="dyn-perm2-label" title="Pomnóż przez m²">
                    <input type="checkbox" class="dyn-perm2" data-id="${item.id}" data-card="${cardId}" ${item.perM2 ? 'checked' : ''}>
                    <span>×m²</span>
                </label>
            </div>
            <button class="btn-remove-item" data-id="${item.id}" data-card="${cardId}" title="Usuń pozycję">✕</button>
        `;
        container.appendChild(row);
    });
}

function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── Event delegation for dynamic item edits ─────────────────────────────────
document.addEventListener('input', (e) => {
    if (e.target.matches('.dyn-label')) {
        const { id, card } = e.target.dataset;
        const item = dynamicItems[card]?.find(i => i.id === id);
        if (item) item.label = e.target.value;
    }
    if (e.target.matches('.dyn-price')) {
        const { id, card } = e.target.dataset;
        const item = dynamicItems[card]?.find(i => i.id === id);
        if (item) item.price = parseFloat(e.target.value) || 0;
    }
});

document.addEventListener('change', (e) => {
    if (e.target.matches('.dyn-perm2')) {
        const { id, card } = e.target.dataset;
        const item = dynamicItems[card]?.find(i => i.id === id);
        if (item) item.perM2 = e.target.checked;
    }
});

document.addEventListener('click', (e) => {
    // Remove item
    if (e.target.matches('.btn-remove-item')) {
        const { id, card } = e.target.dataset;
        dynamicItems[card] = dynamicItems[card].filter(i => i.id !== id);
        renderDynamicItems(card);
    }
    // Add item
    if (e.target.matches('.btn-add-item')) {
        const cardId = e.target.dataset.card;
        dynamicItems[cardId].push({
            id: generateId(),
            label: '',
            price: 0,
            perM2: false,
        });
        renderDynamicItems(cardId);
        // Focus the new label input
        const container = document.getElementById(`dynamic-list-${cardId}`);
        const lastInput = container?.querySelector('.dynamic-item-row:last-child .dyn-label');
        lastInput?.focus();
    }
});

// ─── Load Prices into Admin Form ─────────────────────────────────────────────
async function loadPrices() {
    try {
        const docRef  = doc(db, "settings", "prices");
        const docSnap = await getDoc(docRef);
        const data    = docSnap.exists() ? docSnap.data() : {};

        // Fill static inputs
        Object.entries(FIELD_MAP).forEach(([inputId, fbKey]) => {
            const el = $(inputId);
            if (el && data[fbKey] !== undefined) {
                el.value = data[fbKey];
            }
        });

        // Load transport prices
        if (data.transportPrices) {
            transportPrices = data.transportPrices;
        } else {
            transportPrices = JSON.parse(JSON.stringify(DEFAULT_TRANSPORT));
        }
        renderTransportPrices();

        // Load typDachuOptions
        if (data.typDachuOptions && Array.isArray(data.typDachuOptions)) {
            typDachuOptions = data.typDachuOptions;
        } else {
            typDachuOptions = JSON.parse(JSON.stringify(DEFAULT_TYP_DACHU));
        }
        renderTypDachuOptions();

        // Load dynamic items
        if (data.dynamicItems) {
            Object.keys(dynamicItems).forEach(cardId => {
                if (data.dynamicItems[cardId]) {
                    dynamicItems[cardId] = data.dynamicItems[cardId];
                }
            });
        }
        Object.keys(dynamicItems).forEach(renderDynamicItems);

        // Last updated
        if (data._updatedAt) {
            $('last-updated').textContent = formatTimestamp(data._updatedAt);
        } else {
            $('last-updated').textContent = 'Dane załadowane';
        }

    } catch (e) {
        console.error('Load prices error:', e);
        $('last-updated').textContent = '⚠ Błąd ładowania danych';
    }
}

// ─── Save Prices ──────────────────────────────────────────────────────────────
async function savePrices() {
    const btn = $('btn-save-prices');
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-icon">⏳</span> Zapisywanie...';

    try {
        const data = { _updatedAt: serverTimestamp() };

        // Static prices
        Object.entries(FIELD_MAP).forEach(([inputId, fbKey]) => {
            const el = $(inputId);
            if (el) {
                const val = parseFloat(el.value);
                data[fbKey] = isNaN(val) ? 0 : val;
            }
        });

        // Typ Dachu options
        data.typDachuOptions = typDachuOptions
            .filter(o => o.label.trim() && o.value.trim())
            .map(o => ({
                id:          o.id,
                label:       o.label.trim(),
                value:       o.value.trim(),
                price:       o.price || 0,
                rynnyPerMb:  o.rynnyPerMb || 0,
            }));

        // Transport prices per województwo
        data.transportPrices = transportPrices;

        // Dynamic items — save clean copy
        data.dynamicItems = {};
        Object.keys(dynamicItems).forEach(cardId => {
            data.dynamicItems[cardId] = dynamicItems[cardId].map(item => ({
                id:     item.id,
                label:  item.label.trim(),
                price:  item.price,
                perM2:  item.perM2 || false,
            })).filter(item => item.label !== '');
        });

        await setDoc(doc(db, "settings", "prices"), data, { merge: true });

        showStatus('✅ Ceny zapisane pomyślnie!');
        $('last-updated').textContent = formatTimestamp(new Date());

    } catch (e) {
        console.error('Save prices error:', e);
        showStatus('❌ Błąd zapisu: ' + e.message, true);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span class="btn-icon">💾</span> Zapisz wszystkie ceny';
    }
}

// ─── Auth UI ──────────────────────────────────────────────────────────────────
function showLogin() {
    $('login-screen').style.display = 'flex';
    $('admin-panel').style.display  = 'none';
}

function showAdmin(user) {
    $('login-screen').style.display = 'none';
    $('admin-panel').style.display  = 'block';
    $('admin-user-email').textContent = user.email;
    renderTransportPrices(); // render defaults immediately, loadPrices will overwrite with Firebase data
    renderTypDachuOptions();
    loadPrices();
}

// ─── Login ────────────────────────────────────────────────────────────────────
$('btn-login').addEventListener('click', async () => {
    const email    = $('admin-email').value.trim();
    const password = $('admin-pass').value;
    const errEl    = $('login-error');
    const btn      = $('btn-login');

    errEl.style.display = 'none';

    if (!email || !password) {
        errEl.textContent   = 'Wypełnij wszystkie pola.';
        errEl.style.display = 'block';
        return;
    }

    btn.disabled = true;
    $('login-btn-text').style.display  = 'none';
    $('login-spinner').style.display   = 'inline';

    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
        let msg = 'Błąd logowania. Sprawdź dane.';
        if (e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
            msg = 'Nieprawidłowy e-mail lub hasło.';
        } else if (e.code === 'auth/too-many-requests') {
            msg = 'Zbyt wiele prób. Spróbuj ponownie później.';
        } else if (e.code === 'auth/invalid-email') {
            msg = 'Nieprawidłowy format e-mail.';
        }
        errEl.textContent   = msg;
        errEl.style.display = 'block';
    } finally {
        btn.disabled = false;
        $('login-btn-text').style.display = 'inline';
        $('login-spinner').style.display  = 'none';
    }
});

$('admin-pass').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('btn-login').click();
});

$('btn-logout').addEventListener('click', async () => {
    await signOut(auth);
});

$('btn-save-prices').addEventListener('click', savePrices);

onAuthStateChanged(auth, (user) => {
    if (user) {
        showAdmin(user);
    } else {
        showLogin();
    }
});