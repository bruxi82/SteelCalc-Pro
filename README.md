# SteelCalc Pro — Rock-Stal Konfigurator

კონსტრუქციის ფასის კალკულატორი Firebase-ით. ადმინი ფასებს ცვლის Firebase-ში, კალკულატორი ავტომატურად კითხულობს.

---

## პროექტის სტრუქტურა

```
steelcalc-pro/
├── index.html      ← კალკულატორი (მომხმარებლის გვერდი)
├── script.js       ← კალკულატორის ლოგიკა
├── admin.html      ← ადმინის პანელი
├── admin.js        ← ადმინის ლოგიკა
├── style.css       ← კალკულატორის სტილები
├── admin.css       ← ადმინ პანელის სტილები
└── README.md
```

---

## Firebase პროექტი

**Project:** `steelcalc-pro-574a5`  
**Console:** https://console.firebase.google.com/project/steelcalc-pro-574a5  
**Live site:** https://bruxi82.github.io/SteelCalc-Pro/

### Firestore სტრუქტურა

```
settings/
  prices/                     ← ერთი document, ყველა ფასი
    p1_rate: 750              (Płyta 10cm — PLN/m²)
    p2_rate: 680              (Płyta 5cm — PLN/m²)
    konstr_ocynk: 0           (Konstrukcja Ocynkowana)
    konstr_ral: 0             (Konstrukcja RAL)
    konstr_ral_mat: 0         (Konstrukcja RAL MAT)
    wykon_drewno: 0           (Wykończenie Drewnopodobne)
    nadwymiar: 15             (Nadwymiar wysokości — PLN/m²)
    okucia: 700               (Okucia blacharskie)
    scionaPerMeter: 350       (Ściana działowa — PLN/mb)
    t8_rate: 0                (Pokrycie T8)
    filc_rate: 12             (Folia/Filc — PLN/m²)
    bramaUchylna: 1100        (Brama uchylna — za szt.)
    okno: 600                 (Okno PCV — za szt.)
    napedCame: 950            (Napęd Came — za szt.)
    furtka: 450               (Dodatkowa furtka)
    dostawa: 100              (Dostawa regionalna)
    rynny: 1200               (System rynnowy fallback — PLN/mb)
    kotwienie: 250            (Kotwienie do podłoża)
    brama_segm: 6000          (Brama Segmentowa)
    blachodach: 4000          (Blachodachówka)
    dach_2sk: 0               (Dach 2SK)
    _updatedAt: timestamp     (ბოლო შენახვის დრო)

    typDachuOptions: [        ← სახურავის ტიპები (ადმინიდან)
      {
        id: "td_dwu",
        label: "Dwuspadowy",
        value: "dwu",         ← select-ში value
        price: 550,           ← ამ ტიპის ფასი (ySum-ში ჩაემატება)
        rynnyPerMb: 90        ← რინოს ფასი mb-ზე (0 = გლობალური rynny)
      },
      ...
    ]

    transportPrices: {        ← ტრანსპორტი ვოევოდზე
      "Śląskie": { blachane: 350, x4: 1400 },
      "Małopolska": { blachane: 270, x4: 1080 },
      ...
    }

    dynamicItems: {           ← ადმინიდან დამატებული პოზიციები
      "card-plyty": [
        { id, label, price, perM2: false }
      ],
      "card-dach": [...],
      "card-akcesoria": [...],
      "card-logistyka": [...]
    }
```

### Firebase Auth

მომხმარებელი: `rokhvadzebeka@gmail.com`  
ახალი ადმინის დასამატებლად → Firebase Console → Authentication → Add user

---

## გვერდები

### index.html — კალკულატორი

მომხმარებელი ვერ შევა გვერდზე ავტორიზაციის გარეშე — `onAuthStateChanged` ამოწმებს, თუ არ არის logged in → redirect `admin.html`-ზე.

**სექციები:**

| # | სათაური | input ID-ები |
|---|---------|--------------|
| 01 | Wymiary Konstrukcji | `w_szer`, `w_gleb`, `w_wys_cm` |
| 02 | Typ Konstrukcji | `cb_p1`–`cb_p6`, `cb_nad`, `cb_okuc` |
| 03 | Typ Dachu | `typ_dachu` (select), `cb_filc`, `cb_blach`, `t8_check`, `check_2sk`, `cb_ryn` |
| 04 | Ściana / Bramy / Dodatki | `sciana_m`, `qty_b_uch`, `qty_okno`, `qty_came`, `cb_seg`, `cb_furtka`, `cb_kot`, `tr_type`, `tr_woj`, `cb_reg` |
| 05 | Podsumowanie | `rabat_pct`, `val_doplata` |

**მნიშვნელოვანი ID-ები:**

| ID | აღწერა |
|----|--------|
| `main-app-content` | მთლიანი app-ი — auth-მდე დამალული |
| `header-price` | header-ის ბრუტო ფასი |
| `disp_base` | ბაზა |
| `disp_discount` | ფასდაკლება |
| `disp_profil_netto` | ნეტო |
| `disp_profil` | ბრუტო (მრგვალი) |
| `dim-summary` | "Powierzchnia: X m²" |
| `ryn_meters_badge` | "X mb" badge სისტემ rynnowy-ზე |
| `tr_selected_label` | ტრანსპორტის label |
| `pdf_specs` | PDF-ის სპეც სია |
| `pdf_total` | PDF-ის ჯამი |
| `pdf-date` | PDF-ის თარიღი |
| `dyn-section-*` | დინამიური პოზიციების კონტეინერები |

**CSS კლასები — ლოგიკისთვის:**

| კლასი | მიზანი |
|-------|--------|
| `.calc-trigger` | ნებისმიერი input/select/checkbox — `runCalc()` გამოიძახება ცვლილებაზე |
| `.y-check` | ბაზის checkbox — ფასი `ySum`-ში ემატება (ფასდაკლება ამ ჯამზე) |
| `.w-check` | დანამატის checkbox — ფასი `wSum`-ში ემატება (ფასდაკლება არ ეხება) |
| `.price-input` | readonly ველი ფასის ჩვენებისთვის |
| `.active-price` | მწვანე — არჩეული ვარიანტი |
| `.price-result` | ნაცრისფერი — ჩვენებისთვის, არ ემატება ავტომატურად |

---

### admin.html + admin.js — ადმინის პანელი

შესვლა: `rokhvadzebeka@gmail.com` / Firebase Auth password

**კარდები ადმინ გრიდში:**

| კარდი ID | სათაური | რას მართავს |
|----------|---------|-------------|
| `card-plyty` | Płyty Konstrukcyjne | `p1_rate`, `p2_rate` + დინამიური პოზიციები |
| `card-dach` | Dach i Pokrycie | `t8_rate`, `filc_rate`, `blachodach`, `dach_2sk`, `rynny` + დინამიური |
| `card-typdachu` | Typ Dachu | `typDachuOptions` ცხრილი |
| `card-akcesoria` | Bramy i Akcesoria | `okucia`, `bramaUchylna`, `brama_segm`, `okno`, `napedCame`, `furtka` + დინამიური |
| `card-logistyka` | Logistyka i Montaż | `nadwymiar`, `scionaPerMeter`, `kotwienie`, `dostawa` + transport ცხრილი + დინამიური |

**Typ Dachu ცხრილი** (`typDachuOptions`):

- **Nazwa** — კალკულატორის select-ში ჩანს (`label`)
- **Rynny PLN/mb** — ამ ტიპის სახურავის რინო ფასი. `0` = გამოიყენება გლობალური `ap_rynny`
- `value` ველი (შენახული Firebase-ში) განსაზღვრავს mb-ის გამოთვლას:
  - `dwu` → `głębokość × 2`
  - `tyl` → `szerokość`
  - `lewo` / `prawo` → `głębokość`
  - სხვა value → `0 mb` (რინო არ ემატება)

**დინამიური პოზიციები:**

ყველა კარდში `+ Dodaj pozycję` ღილაკი. თითოეულ პოზიციას აქვს:
- **Nazwa** — კალკულატორში ჩანს
- **Cena PLN** — ფასი
- **×m²** — checkbox: თუ ჩართულია, ფასი მრავლდება m²-ზე

---

## script.js სექციები

```
1. FIREBASE          → config, initializeApp, getFirestore, getAuth
2. STATE             → PRICES{}, dynamicItems{}, transportPrices{}, typDachuOptions[]
3. FIREBASE SYNC     → syncPricesWithFirebase()
4. HELPERS           → $(id), getNum(), getInt(), setDisp(), setVal(), fmt(), escHtml()
5. INJECT            → injectDynamicItems(), injectTypDachuSelect()
6. PRICE DISPLAYS    → fillPriceDisplays(m2)
7. MAIN CALCULATION  → runCalc()
8. PDF UPDATE        → updatePdf(sz, gl, hCm, brutto, pdfItems)
9. INIT              → DOMContentLoaded → auth check → sync → inject → runCalc()
```

**გამოთვლის ლოგიკა (`runCalc`):**

```
ySum = y-check checkboxes + Ściana działowa + Typ Dachu ფასი + T8 + (სხვა y-კატეგორია)
wSum = w-check checkboxes + Brama/Okno/Napęd (რაოდენობა) + Rynny + Transport + 2SK + Korekta

baseTotal  = ySum + wSum
discountVal = ySum × (rabat% / 100)   ← ფასდაკლება მხოლოდ ySum-ზე!
netto      = baseTotal - discountVal
brutto     = round(netto / 10) × 10   ← ათეულამდე მრგვალდება
```

---

## admin.js სექციები

```
1. FIREBASE          → config, db, auth
2. HELPERS           → $(id), escHtml(), generateId(), showStatus(), formatTimestamp()
3. CONFIG            → FIELD_MAP{} (HTML id → Firebase key), CARD_SECTIONS{}
4. STATE             → dynamicItems{}, WOJEWODZTWA[], DEFAULT_TRANSPORT{}, transportPrices{}, typDachuOptions[]
5. RENDER FUNCTIONS  → renderDynamicItems(cardId), renderTransportPrices(), renderTypDachuOptions()
6. FIREBASE          → loadPrices(), savePrices()
7. EVENT LISTENERS   → document.addEventListener('input'), ('change'), ('click')
8. AUTH              → showLogin(), showAdmin(user), btn-login, btn-logout, onAuthStateChanged
```

---

## Git Workflow

```bash
# ცვლილებების push
git add . && git commit -m "შენიშვნა" && git push

# GitHub Pages ავტომატურად განახლდება 1–2 წუთში
# URL: https://bruxi82.github.io/SteelCalc-Pro/
```

---

## ხშირი ამოცანები

### ახალი სტატიკური ფასის დამატება

1. `admin.html` → შესაბამის კარდში ახალი `.admin-price-row` input-ით (`id="ap_xxx"`)
2. `admin.js` → `FIELD_MAP`-ში დაამატე `ap_xxx: 'xxx'`
3. `script.js` → `PRICES`-ში დაამატე `xxx: 0` (fallback)
4. `script.js` → `fillPriceDisplays()`-ში დაამატე mapping
5. `script.js` → `runCalc()`-ში გამოიყენე `PRICES.xxx`

### ახალი Typ Dachu ოფციის value-ს Rynny mb-ის ლოგიკა

`script.js` → `runCalc()` → System rynnowy ბლოკი:
```js
if      (typDachu === 'dwu')                          rynMeters = gl * 2;
else if (typDachu === 'tyl')                          rynMeters = sz;
else if (typDachu === 'lewo' || typDachu === 'prawo') rynMeters = gl;
// ახალი value-სთვის ჩაამატე else if აქ
```

### ახალი województwo-ს დამატება (Transport)

1. `admin.js` → `WOJEWODZTWA[]` მასივში ჩაამატე
2. `admin.js` → `DEFAULT_TRANSPORT{}` ობიექტში ჩაამატე default ფასებით
3. `index.html` → `#tr_woj` select-ში ახალი `<option>` ჩაამატე

### ადმინ მომხმარებლის დამატება

Firebase Console → Authentication → Users → Add user

---

## ტექნიკური დეტალები

- **Hosting:** GitHub Pages (static)
- **Backend:** Firebase Firestore (NoSQL) + Firebase Auth
- **Firebase SDK:** v10.8.0 (ESM, CDN)
- **Fonts:** Google Fonts — Syne (სათაურები), DM Sans (ტექსტი)
- **Build tool:** არ არის — vanilla JS, პირდაპირ ბრაუზერში
- **Module type:** `<script type="module">` — ES modules
- **Print/PDF:** `window.print()` + CSS `@media print`