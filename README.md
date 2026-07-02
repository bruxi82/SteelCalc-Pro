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
├── help.html       ← დახმარების გვერდი (ადმინი + იუზერი)
├── sw.js           ← Service Worker (PWA ქეში)
├── manifest.json   ← PWA მანიფესტი
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
  prices/                              ← ერთი document, ყველა ფასი
    
    // ── პლიტები ──
    plyta_scienna_pir_40: 0            (Płyta ścienna PIR 40mm — PLN/m²)
    plyta_scienna_pir_60: 0            (Płyta ścienna PIR 60mm — PLN/m²)
    plyta_scienna_pir_100: 0           (Płyta ścienna PIR 100mm — PLN/m²)
    plyta_scienna_sty_50: 0            (Płyta ścienna Styropian 50mm — PLN/m²)
    plyta_scienna_sty_100: 0           (Płyta ścienna Styropian 100mm — PLN/m²)
    plyta_dachowa_pir_40: 0            (Płyta dachowa PIR 40mm — PLN/m²)
    plyta_dachowa_pir_60: 0            (Płyta dachowa PIR 60mm — PLN/m²)
    plyta_dachowa_pir_100: 0           (Płyta dachowa PIR 100mm — PLN/m²)
    plyta_dzialowa_pir_40: 0           (Płyta działowa PIR 40mm — PLN/m²)
    plyta_dzialowa_pir_60: 0           (Płyta działowa PIR 60mm — PLN/m²)
    plyta_dzialowa_pir_100: 0          (Płyta działowa PIR 100mm — PLN/m²)
    plyta_dzialowa_sty_50: 0           (Płyta działowa Styropian 50mm — PLN/m²)
    plyta_dzialowa_sty_100: 0          (Płyta działowa Styropian 100mm — PLN/m²)

    // ── კონსტრუქცია ──
    konstr_ocynk: 0                    (Konstrukcja Ocynkowana — PLN)
    konstr_ral: 0                      (Konstrukcja RAL — PLN)
    konstr_ral_mat: 0                  (Konstrukcja RAL MAT — PLN)
    wykon_drewno: 0                    (Wykończenie Drewnopodobne — PLN)
    nadwymiar: 15                      (Nadwymiar wysokości — PLN/m²)
    okucia: 700                        (Okucia blacharskie — PLN)

    // ── სახურავი ──
    filc_rate: 12                      (Folia/Filc — PLN/m²)
    blachodach: 4000                   (Blachodachówka — PLN)
    rynny: 1200                        (System rynnowy fallback — PLN/mb)

    // ── კარკასი ──
    kratownica: 0                      (Kratownica — PLN/szt.)
    slup: 0                            (Słup — PLN/mb)

    // ── ჭიშკრები ──
    bramaUchylna: 1100                 (Brama uchylna — PLN/m²)
    bramaDwu: 1100                     (Brama dwuskrzydłowa — PLN/m²)
    brama_segm: 6000                   (Brama Segmentowa — PLN)

    // ── კარები ──
    drzwiBlaszane: 0                   (Drzwi blaszane — PLN/szt.)
    drzwiEco: 0                        (Drzwi Eco Basic — PLN/szt.)
    drzwiGerda: 0                      (Drzwi Gerda — PLN/szt.)
    drzwiMtbram: 0                     (Drzwi MT-Bram — PLN/szt.)

    // ── ფანჯრები / დანამატები ──
    okno: 600                          (Okno PCV 80x60 — PLN/szt.)
    napedCame: 950                     (Napęd CAME — PLN/szt.)
    kotwienie: 250                     (Kotwienie do podłoża — PLN)
    dostawa: 100                       (Dostawa regionalna — PLN)

    _updatedAt: timestamp              (ბოლო შენახვის დრო)

    typDachuOptions: [                 ← სახურავის ტიპები
      {
        id: "td_dwu",
        label: "Dwuspadowy",
        value: "dwu",
        price: 550,
        rynnyPerMb: 90
      },
      ...
    ]

    transportPrices: {                 ← ტრანსპორტი ვოევოდზე
      "Śląskie": { blachane: 350, x4: 1400 },
      "Małopolska": { blachane: 270, x4: 1080 },
      ...
    }

    dynamicItems: {                    ← ადმინიდან დამატებული პოზიციები
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
| 01 | Wymiary Konstrukcji | `w_szer` (cm), `w_gleb` (cm), `w_wys_cm` (cm) |
| 02 | Typ Konstrukcji | `sel_plyta_scienna`, `sel_plyta_dachowa`, `sel_plyta_dzialowa`, `inp_dzialowa_h`, `inp_dzialowa_mb`, `cb_p3`–`cb_p6`, `cb_nad`, `cb_okuc` |
| 03 | Typ Dachu | `typ_dachu` (select), `cb_filc`, `cb_blach`, `cb_ryn` |
| 04 | Ściana / Bramy / Dodatki | `brama_uch_szer`, `brama_uch_wys`, `qty_b_uch_new`, `brama_dwu_szer`, `brama_dwu_wys`, `qty_b_dwu_new`, `qty_okno`, `cena_okno_inne`, `qty_okno_inne`, `qty_came`, `qty_kratownica`, `qty_slup`, dynamic-doors-container, `cb_seg`, `cb_kot`, `tr_type`, `tr_woj`, `cb_reg` |
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
| `dynamic-doors-container` | დინამიური კარების კონტეინერი |
| `btn-add-door` | "+ Dodaj drzwi" ღილაკი |
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
| `.panel-select` | სტილი პლიტების select-ებისთვის (სექცია 02) |
| `.door-row` | დინამიური კარის row |
| `.door-type-select` | კარის ტიპის select |
| `.door-qty-input` | კარის რაოდენობის input |

---

### admin.html + admin.js — ადმინის პანელი

შესვლა: `rokhvadzebeka@gmail.com` / Firebase Auth password

**კარდები ადმინ გრიდში:**

| კარდი ID | სათაური | რას მართავს |
|----------|---------|-------------|
| `card-plyty` | Płyty Konstrukcyjne | 13 პლიტის ფასი (ścienna×5, dachowa×3, działowa×5) + კონსტრუქცია + დინამიური |
| `card-dach` | Dach i Pokrycie | `kratownica`, `slup`, `filc_rate`, `blachodach`, `rynny` + დინამიური |
| `card-typdachu` | Typ Dachu | `typDachuOptions` ცხრილი (label, price, rynnyPerMb) |
| `card-akcesoria` | Bramy i Akcesoria | `bramaUchylna`, `bramaDwu`, `brama_segm`, `okno`, `napedCame`, `drzwiBlaszane`, `drzwiEco`, `drzwiGerda`, `drzwiMtbram` + დინამიური |
| `card-logistyka` | Logistyka i Montaż | `nadwymiar`, `kotwienie`, `dostawa` + transport ცხრილი + დინამიური |

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
8b. DYNAMIC DOORS   → createDoorRow(), initDoorSystem()
9. INIT              → DOMContentLoaded → auth check → sync → inject → initDoorSystem → runCalc()
```

**გამოთვლის ლოგიკა (`runCalc`):**

```
// ზომები: ყველა cm-ში შეყვანა, მეტრებად კონვერტაცია შიდად
sz = w_szer / 100   (სიგანე მ)
gl = w_gleb / 100   (სიღრმე მ)
hCm = w_wys_cm      (სიმაღლე სმ)
m2 = sz × gl

// ySum (ბაზა — ფასდაკლება ამ ჯამზე ვრცელდება):
  + Płyta ścienna:   ((sz×2 + gl×2) × h_m) × PLN/m²
  + Płyta dachowa:   ((sz+0.70) × (gl+0.70)) × PLN/m²
  + Płyta działowa:  (inp_dzialowa_h/100 × inp_dzialowa_mb) × PLN/m²
  + Typ Dachu:       activeOpt.price
  + Kratownica:      qty × PLN/szt.
  + Słup:            mb × PLN/mb
  + y-check კლასის checkbox-ები (კონსტრუქცია, nadwymiar, okucia, filc...)
  + Dynamic items (y-კატეგორია)

// wSum (დანამატები — ფასდაკლება არ ეხება):
  + Brama uchylna:   (szer×wys m²) × PLN/m² × ilość
  + Brama dwu:       (szer×wys m²) × PLN/m² × ilość
  + Okno PCV (80x60): qty × PLN/szt.
  + Okno PCV inne:   qty × ხელით ფასი
  + Napęd CAME:      qty × PLN/szt.
  + Drzwi (dynamic): qty × PLN/szt. (PRICES[key])
  + Rynny:           mb × PLN/mb
  + Transport:       transportPrices[woj][type]
  + w-check კლასის checkbox-ები (brama_segm, kotwienie, dostawa...)

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
4. `script.js` → `fillPriceDisplays()`-ში დაამატე mapping (საჭიროების შემთხვევაში)
5. `script.js` → `runCalc()`-ში გამოიყენე `PRICES.xxx`

### ახალი Typ Dachu ოპციის Rynny mb-ის ლოგიკა

`script.js` → `runCalc()` → System rynnowy ბლოკი:
```js
if      (typDachu === 'dwu')                          rynMeters = gl * 2;
else if (typDachu === 'tyl')                          rynMeters = sz;
else if (typDachu === 'lewo' || typDachu === 'prawo') rynMeters = gl;
// ახალი value-სთვის ჩაამატე else if აქ
```

### ახალი კარის ტიპის დამატება (Drzwi)

1. `index.html` → `#dynamic-doors-container`-ის `createDoorRow()` ფუნქციაში ახალი `<option value="drzwiXxx">` ჩაამატე
2. `admin.html` → `card-akcesoria`-ში ახალი admin ველი (`id="ap_drzwiXxx"`)
3. `admin.js` → `FIELD_MAP`-ში `ap_drzwiXxx: 'drzwiXxx'`
4. `script.js` → `PRICES`-ში `drzwiXxx: 0`

### ახალი województwo-ს დამატება

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
- **PWA:** Service Worker (`sw.js`) + manifest.json — offline ქეში
- **Cache busting:** `style.css?v=12`, `script.js?v=10`, `admin.js?v=2.7`