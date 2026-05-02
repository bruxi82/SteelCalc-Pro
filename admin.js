/**
 * SteelCalc Pro — Admin Panel Logic
 * Firebase Auth + Firestore price management
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    serverTimestamp
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
// Maps admin input IDs (ap_xxx) to Firestore price keys
const FIELD_MAP = {
    ap_p1_rate:         'p1_rate',
    ap_p2_rate:         'p2_rate',
    ap_konstr_ocynk:    'konstr_ocynk',
    ap_konstr_ral:      'konstr_ral',
    ap_konstr_ral_mat:  'konstr_ral_mat',
    ap_wykon_drewno:    'wykon_drewno',
    ap_nadwymiar:       'nadwymiar',
    ap_okucia:          'okucia',
    ap_dach_dwuspad:    'dach_dwuspad',
    ap_scionaPerMeter:  'scionaPerMeter',
    ap_t8_rate:         't8_rate',
    ap_filc_rate:       'filc_rate',
    ap_bramaUchylna:    'bramaUchylna',
    ap_okno:            'okno',
    ap_napedCame:       'napedCame',
    ap_furtka:          'furtka',
    ap_transport:       'transport',
    ap_dostawa:         'dostawa',
    ap_rynny:           'rynny',
    ap_kotwienie:       'kotwienie',
    ap_brama_segm:      'brama_segm',
    ap_blachodach:      'blachodach',
    ap_dach_2sk:        'dach_2sk',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

function showStatus(msg, isError = false) {
    const el = $('save-status');
    const text = $('save-status-text');
    text.textContent = msg;
    el.classList.remove('save-status--hidden', 'save-status--error');
    if (isError) el.classList.add('save-status--error');
    // Auto-hide after 4s
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.add('save-status--hidden'), 4000);
}

function formatTimestamp(ts) {
    if (!ts) return 'Brak danych';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return 'Ostatnia aktualizacja: ' + d.toLocaleString('pl-PL');
}

// ─── Load Prices into Admin Form ─────────────────────────────────────────────
async function loadPrices() {
    try {
        const docRef  = doc(db, "settings", "prices");
        const docSnap = await getDoc(docRef);
        const data    = docSnap.exists() ? docSnap.data() : {};

        // Fill inputs
        Object.entries(FIELD_MAP).forEach(([inputId, fbKey]) => {
            const el = $(inputId);
            if (el && data[fbKey] !== undefined) {
                el.value = data[fbKey];
            }
        });

        // Last updated timestamp
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

// ─── Save Prices from Admin Form ─────────────────────────────────────────────
async function savePrices() {
    const btn = $('btn-save-prices');
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-icon">⏳</span> Zapisywanie...';

    try {
        const data = { _updatedAt: serverTimestamp() };

        Object.entries(FIELD_MAP).forEach(([inputId, fbKey]) => {
            const el = $(inputId);
            if (el) {
                const val = parseFloat(el.value);
                data[fbKey] = isNaN(val) ? 0 : val;
            }
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

// ─── Auth UI ─────────────────────────────────────────────────────────────────
function showLogin() {
    $('login-screen').style.display = 'flex';
    $('admin-panel').style.display  = 'none';
}

function showAdmin(user) {
    $('login-screen').style.display = 'none';
    $('admin-panel').style.display  = 'block';
    $('admin-user-email').textContent = user.email;
    loadPrices();
}

// ─── Login Handler ────────────────────────────────────────────────────────────
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
        // onAuthStateChanged will handle the rest
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

// Allow Enter key on password field
$('admin-pass').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('btn-login').click();
});

// ─── Logout Handler ───────────────────────────────────────────────────────────
$('btn-logout').addEventListener('click', async () => {
    await signOut(auth);
});

// ─── Save Button ─────────────────────────────────────────────────────────────
$('btn-save-prices').addEventListener('click', savePrices);

// ─── Auth State Listener ──────────────────────────────────────────────────────
onAuthStateChanged(auth, (user) => {
    if (user) {
        showAdmin(user);
    } else {
        showLogin();
    }
});
