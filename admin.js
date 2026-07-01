/**
 * SteelCalc Pro — Admin Panel Logic v2.1
 * Firebase Auth + Firestore ფასების მართვა
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp }
    from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged }
    from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

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
//  2. HELPERS
// ════════════════════════════════════════════════════════════

const $  = (id) => document.getElementById(id);

function escHtml(str) {
    return String(str || '')
        .replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function generateId() {
    return 'dyn_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

function showStatus(msg, isError = false) {
    const el   = $('save-status');
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

// ════════════════════════════════════════════════════════════
//  3. CONFIG — ველი → Firebase გასაღები
// ════════════════════════════════════════════════════════════

// HTML input ID → Firebase document key
const FIELD_MAP = {
    // Płyty ścienne
    ap_plyta_scienna_pir_40:   'plyta_scienna_pir_40',
    ap_plyta_scienna_pir_60:   'plyta_scienna_pir_60',
    ap_plyta_scienna_pir_100:  'plyta_scienna_pir_100',
    ap_plyta_scienna_sty_50:   'plyta_scienna_sty_50',
    ap_plyta_scienna_sty_100:  'plyta_scienna_sty_100',
    // Płyty dachowe
    ap_plyta_dachowa_pir_40:   'plyta_dachowa_pir_40',
    ap_plyta_dachowa_pir_60:   'plyta_dachowa_pir_60',
    ap_plyta_dachowa_pir_100:  'plyta_dachowa_pir_100',
    // Płyty działowe
    ap_plyta_dzialowa_pir_40:  'plyta_dzialowa_pir_40',
    ap_plyta_dzialowa_pir_60:  'plyta_dzialowa_pir_60',
    ap_plyta_dzialowa_pir_100: 'plyta_dzialowa_pir_100',
    ap_plyta_dzialowa_sty_50:  'plyta_dzialowa_sty_50',
    ap_plyta_dzialowa_sty_100: 'plyta_dzialowa_sty_100',
    ap_konstr_ocynk:   'konstr_ocynk',
    ap_konstr_ral:     'konstr_ral',
    ap_konstr_ral_mat: 'konstr_ral_mat',
    ap_wykon_drewno:   'wykon_drewno',
    ap_nadwymiar:      'nadwymiar',
    ap_okucia:         'okucia',
    ap_kratownica:     'kratownica',
    ap_slup:           'slup',
    ap_filc_rate:      'filc_rate',
    ap_bramaUchylna:   'bramaUchylna',
    ap_bramaDwu:       'bramaDwu',
    ap_okno:           'okno',
    ap_napedCame:      'napedCame',
    ap_drzwiBlaszane:  'drzwiBlaszane',
    ap_drzwiEco:       'drzwiEco',
    ap_drzwiGerda:     'drzwiGerda',
    ap_drzwiMtbram:    'drzwiMtbram',
    ap_dostawa:        'dostawa',
    ap_rynny:          'rynny',
    ap_kotwienie:      'kotwienie',
    ap_brama_segm:     'brama_segm',
    ap_blachodach:     'blachodach',
};

// კარდის config — რომელ სექციაში ჩაიდება და y/w ტიპი
const CARD_SECTIONS = {
    'card-plyty':     { section: 'konstrukcja', calcType: 'y', label: 'Płyty Konstrukcyjne' },
    'card-dach':      { section: 'dach',        calcType: 'y', label: 'Dach i Pokrycie'     },
    'card-akcesoria': { section: 'akcesoria',   calcType: 'w', label: 'Bramy i Akcesoria'   },
    'card-logistyka': { section: 'logistyka',   calcType: 'w', label: 'Logistyka i Montaż'  },
};

// ════════════════════════════════════════════════════════════
//  4. STATE — ადმინის მიერ რედაქტირებადი მონაცემები
// ════════════════════════════════════════════════════════════

// დინამიური პოზიციები: { cardId: [{id, label, price, perM2}] }
let dynamicItems = {
    'card-plyty': [], 'card-dach': [], 'card-akcesoria': [], 'card-logistyka': [],
};

// ── Transport ──
const WOJEWODZTWA = [
    'Dolnośląskie','Kuj-Pomorskie','Lubelskie','Lubuskie',
    'Mazowieckie','Małopolska','Opolskie','Podkarpackie',
    'Podlaskie','Pomorskie','Warm-Mazurskie','Wielkopolskie',
    'Zach-Pomorskie','Łódzkie','Śląskie','Świętokrzyskie',
];

const DEFAULT_TRANSPORT = {
    'Dolnośląskie':   { blachane: 400, x4: 1600 },
    'Kuj-Pomorskie':  { blachane: 510, x4: 2040 },
    'Lubelskie':      { blachane: 460, x4: 1840 },
    'Lubuskie':       { blachane: 510, x4: 2040 },
    'Mazowieckie':    { blachane: 510, x4: 2040 },
    'Małopolska':     { blachane: 270, x4: 1080 },
    'Opolskie':       { blachane: 350, x4: 1400 },
    'Podkarpackie':   { blachane: 350, x4: 1400 },
    'Podlaskie':      { blachane: 570, x4: 2280 },
    'Pomorskie':      { blachane: 570, x4: 2280 },
    'Warm-Mazurskie': { blachane: 570, x4: 2280 },
    'Wielkopolskie':  { blachane: 570, x4: 2280 },
    'Zach-Pomorskie': { blachane: 630, x4: 2520 },
    'Łódzkie':        { blachane: 460, x4: 1840 },
    'Śląskie':        { blachane: 350, x4: 1400 },
    'Świętokrzyskie': { blachane: 350, x4: 1400 },
};

let transportPrices = JSON.parse(JSON.stringify(DEFAULT_TRANSPORT));

// ── Typ Dachu ──
const DEFAULT_TYP_DACHU = [
    { id: 'td_dwu',   label: 'Dwuspadowy', value: 'dwu',   price: 0, rynnyPerMb: 0 },
    { id: 'td_tyl',   label: 'Tył',        value: 'tyl',   price: 0, rynnyPerMb: 0 },

    { id: 'td_przod',   label: 'Przod',        value: 'przod',   price: 0, rynnyPerMb: 0 },
    
    { id: 'td_lewo',  label: 'Lewo',       value: 'lewo',  price: 0, rynnyPerMb: 0 },
    { id: 'td_prawo', label: 'Prawo',      value: 'prawo', price: 0, rynnyPerMb: 0 },
];

let typDachuOptions = JSON.parse(JSON.stringify(DEFAULT_TYP_DACHU));

// ════════════════════════════════════════════════════════════
//  5. RENDER FUNCTIONS — UI-ს განახლება state-ის მიხედვით
// ════════════════════════════════════════════════════════════

function renderDynamicItems(cardId) {
    const container = $(`dynamic-list-${cardId}`);
    if (!container) return;

    container.innerHTML = dynamicItems[cardId].map(item => `
        <div class="admin-price-row dynamic-item-row" data-id="${item.id}">
            <div class="dynamic-item-fields">
                <input type="text"   class="admin-input-text dyn-label"
                    value="${escHtml(item.label)}" placeholder="Nazwa pozycji..."
                    data-id="${item.id}" data-card="${cardId}">
                <div class="admin-input-wrap" style="width:110px;">
                    <input type="number" class="admin-input dyn-price"
                        value="${item.price}" min="0"
                        data-id="${item.id}" data-card="${cardId}">
                    <span class="admin-unit">PLN</span>
                </div>
                <label class="dyn-perm2-label" title="Pomnóż przez m²">
                    <input type="checkbox" class="dyn-perm2"
                        data-id="${item.id}" data-card="${cardId}" ${item.perM2 ? 'checked' : ''}>
                    <span>×m²</span>
                </label>
            </div>
            <button class="btn-remove-item" data-id="${item.id}" data-card="${cardId}">✕</button>
        </div>`).join('');
}

function renderTransportPrices() {
    const list = $('transport-prices-list');
    if (!list) return;

    list.innerHTML = WOJEWODZTWA.map(woj => {
        const p = transportPrices[woj] || { blachane: 0, x4: 0 };
        return `
        <div style="display:grid; grid-template-columns: 1fr auto auto; gap:4px; align-items:center; padding:5px 8px; border-radius:var(--r-input);">
            <span style="font-size:12px; color:var(--c-text-dim);">${escHtml(woj)}</span>
            <div class="admin-input-wrap" style="width:100px;">
                <input type="number" class="admin-input tr-blachane" data-woj="${escHtml(woj)}" value="${p.blachane}" min="0">
                <span class="admin-unit">PLN</span>
            </div>
            <div class="admin-input-wrap" style="width:100px;">
                <input type="number" class="admin-input tr-x4" data-woj="${escHtml(woj)}" value="${p.x4}" min="0">
                <span class="admin-unit">PLN</span>
            </div>
        </div>`;
    }).join('');
}

function renderTypDachuOptions() {
    const list = $('typdachu-list');
    if (!list) return;

    list.innerHTML = typDachuOptions.map(opt => `
        <div style="display:grid; grid-template-columns: 1fr 110px 140px auto; gap:6px; align-items:center; padding:5px 8px; border-radius:var(--r-input);" data-id="${opt.id}">
            <input type="text" class="admin-input-text td-label"
                value="${escHtml(opt.label)}" placeholder="Nazwa opcji..."
                data-id="${opt.id}">
            <div class="admin-input-wrap">
                <input type="number" class="admin-input td-price"
                    value="${opt.price || 0}" min="0" data-id="${opt.id}">
                <span class="admin-unit">PLN</span>
            </div>
            <div class="admin-input-wrap">
                <input type="number" class="admin-input td-rynny"
                    value="${opt.rynnyPerMb || 0}" min="0" data-id="${opt.id}">
                <span class="admin-unit">PLN/mb</span>
            </div>
            <button class="btn-remove-item td-remove" data-id="${opt.id}">✕</button>
        </div>`).join('');
}

// ════════════════════════════════════════════════════════════
//  6. FIREBASE — ჩატვირთვა და შენახვა
// ════════════════════════════════════════════════════════════

async function loadPrices() {
    try {
        const snap = await getDoc(doc(db, "settings", "prices"));
        const data = snap.exists() ? snap.data() : {};

        // სტატიკური ველები
        Object.entries(FIELD_MAP).forEach(([inputId, fbKey]) => {
            const el = $(inputId);
            if (el && data[fbKey] !== undefined) el.value = data[fbKey];
        });

        // Transport
        transportPrices = data.transportPrices
            ? data.transportPrices
            : JSON.parse(JSON.stringify(DEFAULT_TRANSPORT));
        renderTransportPrices();

        // Typ Dachu
        typDachuOptions = Array.isArray(data.typDachuOptions)
            ? data.typDachuOptions
            : JSON.parse(JSON.stringify(DEFAULT_TYP_DACHU));
        renderTypDachuOptions();

        // დინამიური პოზიციები
        if (data.dynamicItems) {
            Object.keys(dynamicItems).forEach(cardId => {
                if (data.dynamicItems[cardId]) dynamicItems[cardId] = data.dynamicItems[cardId];
            });
        }
        Object.keys(dynamicItems).forEach(renderDynamicItems);

        $('last-updated').textContent = data._updatedAt
            ? formatTimestamp(data._updatedAt)
            : 'Dane załadowane';

    } catch (e) {
        console.error('loadPrices error:', e);
        $('last-updated').textContent = '⚠ Błąd ładowania danych';
    }
}

async function savePrices() {
    const btn = $('btn-save-prices');
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-icon">⏳</span> Zapisywanie...';

    try {
        const data = { _updatedAt: serverTimestamp() };

        // სტატიკური ველები
        Object.entries(FIELD_MAP).forEach(([inputId, fbKey]) => {
            const val = parseFloat($(inputId)?.value);
            data[fbKey] = isNaN(val) ? 0 : val;
        });

        // Typ Dachu
        data.typDachuOptions = typDachuOptions
            .filter(o => o.label.trim())
            .map(o => ({
                id:         o.id,
                label:      o.label.trim(),
                value:      o.value.trim() || o.label.trim().toLowerCase()
                                .replace(/\s+/g, '_')
                                .replace(/[^a-z0-9_]/g, ''),
                price:      o.price || 0,
                rynnyPerMb: o.rynnyPerMb || 0,
            }));

        // Transport
        data.transportPrices = transportPrices;

        // დინამიური პოზიციები
        data.dynamicItems = {};
        Object.keys(dynamicItems).forEach(cardId => {
            data.dynamicItems[cardId] = dynamicItems[cardId]
                .map(i => ({ id: i.id, label: i.label.trim(), price: i.price, perM2: i.perM2 || false }))
                .filter(i => i.label !== '');
        });

        await setDoc(doc(db, "settings", "prices"), data, { merge: true });

        showStatus('✅ Ceny zapisane pomyślnie!');
        $('last-updated').textContent = formatTimestamp(new Date());

    } catch (e) {
        console.error('savePrices error:', e);
        showStatus('❌ Błąd zapisu: ' + e.message, true);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span class="btn-icon">💾</span> Zapisz wszystkie ceny';
    }
}

// ════════════════════════════════════════════════════════════
//  7. EVENT LISTENERS — ყველა input/click მოვლენა
// ════════════════════════════════════════════════════════════

document.addEventListener('input', (e) => {
    const t = e.target;

    // Transport ფასები
    if (t.matches('.tr-blachane')) {
        if (!transportPrices[t.dataset.woj]) transportPrices[t.dataset.woj] = { blachane: 0, x4: 0 };
        transportPrices[t.dataset.woj].blachane = parseFloat(t.value) || 0;
    }
    if (t.matches('.tr-x4')) {
        if (!transportPrices[t.dataset.woj]) transportPrices[t.dataset.woj] = { blachane: 0, x4: 0 };
        transportPrices[t.dataset.woj].x4 = parseFloat(t.value) || 0;
    }

    // Typ Dachu
    if (t.matches('.td-label')) {
        const opt = typDachuOptions.find(o => o.id === t.dataset.id);
        if (opt) {
            opt.label = t.value;
            // value ავტომატურად label-იდან (თუ არ ყოფილა ხელით შეყვანილი)
            if (!opt._valueManual) {
                opt.value = t.value.trim().toLowerCase()
                    .replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
            }
        }
    }
    if (t.matches('.td-price')) {
        const opt = typDachuOptions.find(o => o.id === t.dataset.id);
        if (opt) opt.price = parseFloat(t.value) || 0;
    }
    if (t.matches('.td-rynny')) {
        const opt = typDachuOptions.find(o => o.id === t.dataset.id);
        if (opt) opt.rynnyPerMb = parseFloat(t.value) || 0;
    }

    // დინამიური პოზიციები
    if (t.matches('.dyn-label')) {
        const item = dynamicItems[t.dataset.card]?.find(i => i.id === t.dataset.id);
        if (item) item.label = t.value;
    }
    if (t.matches('.dyn-price')) {
        const item = dynamicItems[t.dataset.card]?.find(i => i.id === t.dataset.id);
        if (item) item.price = parseFloat(t.value) || 0;
    }
});

document.addEventListener('change', (e) => {
    if (e.target.matches('.dyn-perm2')) {
        const item = dynamicItems[e.target.dataset.card]?.find(i => i.id === e.target.dataset.id);
        if (item) item.perM2 = e.target.checked;
    }
});

document.addEventListener('click', (e) => {
    const t = e.target;

    // Typ Dachu — წაშლა
    if (t.matches('.td-remove')) {
        typDachuOptions = typDachuOptions.filter(o => o.id !== t.dataset.id);
        renderTypDachuOptions();
    }

    // Typ Dachu — დამატება
    if (t.id === 'btn-add-typdachu') {
        typDachuOptions.push({ id: 'td_' + Date.now(), label: '', value: '', price: 0, rynnyPerMb: 0 });
        renderTypDachuOptions();
        $('typdachu-list')?.querySelector('.td-label:last-of-type')?.focus();
    }

    // დინამიური პოზიცია — წაშლა
    if (t.matches('.btn-remove-item[data-card]')) {
        dynamicItems[t.dataset.card] = dynamicItems[t.dataset.card].filter(i => i.id !== t.dataset.id);
        renderDynamicItems(t.dataset.card);
    }

    // დინამიური პოზიცია — დამატება
    if (t.matches('.btn-add-item[data-card]')) {
        dynamicItems[t.dataset.card].push({ id: generateId(), label: '', price: 0, perM2: false });
        renderDynamicItems(t.dataset.card);
        $(`dynamic-list-${t.dataset.card}`)
            ?.querySelector('.dynamic-item-row:last-child .dyn-label')?.focus();
    }
});

// ════════════════════════════════════════════════════════════
//  8. AUTH — შესვლა / გამოსვლა
// ════════════════════════════════════════════════════════════

function showLogin() {
    $('login-screen').style.display = 'flex';
    $('admin-panel').style.display  = 'none';
}

function showAdmin(user) {
    $('login-screen').style.display = 'none';
    $('admin-panel').style.display  = 'block';
    $('admin-user-email').textContent = user.email;
    renderTransportPrices();
    renderTypDachuOptions();
    loadPrices();
}

$('btn-login').addEventListener('click', async () => {
    const email    = $('admin-email').value.trim();
    const password = $('admin-pass').value;
    const errEl    = $('login-error');
    const btn      = $('btn-login');

    errEl.style.display = 'none';
    if (!email || !password) {
        errEl.textContent = 'Wypełnij wszystkie pola.';
        errEl.style.display = 'block';
        return;
    }

    btn.disabled = true;
    $('login-btn-text').style.display = 'none';
    $('login-spinner').style.display  = 'inline';

    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
        const msgs = {
            'auth/user-not-found':    'Nieprawidłowy e-mail lub hasło.',
            'auth/wrong-password':    'Nieprawidłowy e-mail lub hasło.',
            'auth/invalid-credential':'Nieprawidłowy e-mail lub hasło.',
            'auth/too-many-requests': 'Zbyt wiele prób. Spróbuj ponownie później.',
            'auth/invalid-email':     'Nieprawidłowy format e-mail.',
        };
        errEl.textContent   = msgs[e.code] || 'Błąd logowania. Sprawdź dane.';
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

$('btn-logout').addEventListener('click', () => signOut(auth));

$('btn-save-prices').addEventListener('click', savePrices);

onAuthStateChanged(auth, user => user ? showAdmin(user) : showLogin());ს