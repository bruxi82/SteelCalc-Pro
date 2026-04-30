/**
 * SteelCalc Pro - Business Logic Engine
 * Universal version for steel construction quoting.
 */

(function initSecurity() {
    // Demo expiration date for portfolio purposes
    const expiryDate = new Date("2026-12-31");
    const today = new Date();
    
    if (today > expiryDate) {
        document.getElementById('main-app-content').style.display = 'none';
        document.getElementById('critical-error').style.display = 'block';
        window.runCalc = () => false;
    }
})();

document.addEventListener('DOMContentLoaded', () => {
    const triggers = document.querySelectorAll('.calc-trigger');
    triggers.forEach(el => el.addEventListener('input', (e) => {
        runCalc(e.target.classList.contains('price-input'));
    }));
    // საწყისი გაანგარიშება
    runCalc(false);
});

function runCalc(isManual) {
    // 1. პარამეტრების მიღება
    const sz = parseFloat(document.getElementById('w_szer').value) || 0;
    const gl = parseFloat(document.getElementById('w_gleb').value) || 0;
    const h_cm = parseFloat(document.getElementById('w_wys_cm').value) || 0;
    const m2 = sz * gl;

    // 2. საბაზისო ფასების ლოგიკა (საშუალო საბაზრო ფასები - Placeholder-ები)
    if (!isManual) {
        document.getElementById('price_p1').value = (m2 * 750).toFixed(0); 
        document.getElementById('price_p2').value = (m2 * 680).toFixed(0);
        document.getElementById('price_p3').value = (m2 * 300).toFixed(0);
        document.getElementById('price_p4').value = (m2 * 360).toFixed(0);
        document.getElementById('price_p5').value = (m2 * 380).toFixed(0);
        document.getElementById('price_p6').value = (m2 * 420).toFixed(0);
        document.getElementById('price_filc').value = (m2 * 12).toFixed(0);
        document.getElementById('price_nad').value = (m2 * 15).toFixed(0);
    }

    // სიმაღლის ავტომატური გადამოწმება
    document.getElementById('cb_nad').checked = (h_cm > 235);
    
    let ySum = 0, wSum = 0, pdfItems = [];

    // 3. ძირითადი კონსტრუქციის ელემენტები
    document.querySelectorAll('.y-check').forEach(c => {
        const row = c.closest('.row');
        const inp = row.querySelector('.price-input');
        if(c.checked) {
            ySum += parseFloat(inp.value) || 0;
            pdfItems.push(c.getAttribute('data-label'));
            inp.classList.add('active-price');
        } else { inp.classList.remove('active-price'); }
    });
    
    // 4. ტიხარი და სპეციალური ოფციები
    let sM = parseFloat(document.getElementById('sciana_m').value) || 0;
    let sV = sM * 350; // საშუალო ფასი მეტრზე
    document.getElementById('sciana_res').value = sV;
    if(sM > 0) { 
        ySum += sV; pdfItems.push("Ściana działowa: " + sM + " mb"); 
        document.getElementById('sciana_res').classList.add('active-price');
    } else { document.getElementById('sciana_res').classList.remove('active-price'); }

    if(document.getElementById('t8_check').checked) { 
        ySum += parseFloat(document.getElementById('t8_val').value) || 0; 
        document.getElementById('t8_val').classList.add('active-price');
        pdfItems.push("Przetłoczenia poziome T8");
    } else { document.getElementById('t8_val').classList.remove('active-price'); }

    // 5. დამატებითი კომპონენტები
    if(document.getElementById('filc_active').checked) { 
        wSum += parseFloat(document.getElementById('price_filc').value) || 0; 
        document.getElementById('price_filc').classList.add('active-price');
        pdfItems.push("Filc antykondensacyjny");
    } else { document.getElementById('price_filc').classList.remove('active-price'); }

    // ბრამები
    let bQ = parseInt(document.getElementById('qty_b_uch').value) || 0;
    let bV = bQ * 1100; document.getElementById('res_b_uch').value = bV;
    if(bQ > 0) { wSum += bV; document.getElementById('res_b_uch').classList.add('active-price'); pdfItems.push("Brama uchylna: " + bQ + " szt."); } 
    else { document.getElementById('res_b_uch').classList.remove('active-price'); }

    // ფანჯრები
    let oQ = parseInt(document.getElementById('qty_okno').value) || 0;
    let oV = oQ * 600; document.getElementById('res_okno').value = oV;
    if(oQ > 0) { wSum += oV; document.getElementById('res_okno').classList.add('active-price'); pdfItems.push("Okno PCV: " + oQ + " szt."); }
    else { document.getElementById('res_okno').classList.remove('active-price'); }

    // ავტომატიკა
    let cQ = parseInt(document.getElementById('qty_came').value) || 0;
    let cV = cQ * 950; document.getElementById('res_came').value = cV;
    if(cQ > 0) { wSum += cV; document.getElementById('res_came').classList.add('active-price'); pdfItems.push("Napęd automatyczny: " + cQ + " szt."); }
    else { document.getElementById('res_came').classList.remove('active-price'); }

    // სხვა ჩეკბოქსები (ტრანსპორტი, რინვები და ა.შ.)
    document.querySelectorAll('.w-check').forEach(c => {
        const row = c.closest('.row');
        const inp = row.querySelector('.price-input');
        if(c.checked) { wSum += parseFloat(inp.value) || 0; inp.classList.add('active-price'); pdfItems.push(c.getAttribute('data-label')); }
        else { inp.classList.remove('active-price'); }
    });

    if(document.getElementById('check_2sk').checked) { 
        wSum += parseFloat(document.getElementById('val_2sk').value) || 0; 
        document.getElementById('val_2sk').classList.add('active-price');
        pdfItems.push("Konstrukcja dachu 2SK");
    } else { document.getElementById('val_2sk').classList.remove('active-price'); }
    
    let dopVal = parseFloat(document.getElementById('val_doplata').value) || 0;
    wSum += dopVal;
    if(dopVal > 0) document.getElementById('val_doplata').classList.add('active-price'); else document.getElementById('val_doplata').classList.remove('active-price');

    // 6. ფასდაკლება და საბოლოო ჯამი
    let rabatPct = parseFloat(document.getElementById('rabat_pct').value) || 0;
    let znizka = ySum * (rabatPct / 100);
    let netto = (ySum - znizka) + wSum;
    // დამრგვალება 10-ეულებამდე პროფესიონალური იერისთვის
    let brutto = Math.round(netto / 10) * 10;

    // 7. ინტერფეისის განახლება
    document.getElementById('disp_discount').innerText = "-" + znizka.toFixed(0) + " PLN";
    document.getElementById('disp_florian').innerText = netto.toFixed(0) + " PLN";
    document.getElementById('disp_profil').innerText = brutto + " PLN";

    // 8. PDF-ის მომზადება
    document.getElementById('pdf_specs').innerHTML = 
        `<li>Wymiary konstrukcji: <strong>${sz} x ${gl} m</strong></li>
         <li>Wysokość całkowita: <strong>${(h_cm/100).toFixed(2)} m</strong></li>` + 
        pdfItems.map(i => `<li>${i} <span>✔</span></li>`).join('');
    document.getElementById('pdf_total').innerText = brutto.toLocaleString();
}