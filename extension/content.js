// Este script se inyecta automáticamente en las páginas de Uber, Cabify o Bolt.

function parseEuro(val) {
  if (!val || val === '-') return 0;
  return parseFloat(val.replace('€', '').replace(/\./g, '').replace(',', '.'));
}

function createFloatingMenu() {
  if (document.getElementById('comforta-extract-btn')) return;

  const container = document.createElement('div');
  container.id = 'comforta-extract-btn';
  Object.assign(container.style, {
    position: 'fixed', top: '20px', right: '20px', zIndex: '999999',
    backgroundColor: '#000000', color: '#ffffff',
    border: '2px solid #ffffff', borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
    fontFamily: 'sans-serif', userSelect: 'none',
    display: 'flex', flexDirection: 'column', padding: '10px', gap: '8px',
    cursor: 'move'
  });

  const title = document.createElement('div');
  title.innerText = 'Comforta Sync';
  title.style.fontWeight = 'bold';
  title.style.fontSize = '12px';
  title.style.textAlign = 'center';

  const select = document.createElement('select');
  select.innerHTML = `<option value="Oscar">Admin: Oscar</option><option value="Eglee">Admin: Eglee</option>`;
  const savedAdmin = localStorage.getItem('comforta_admin_name');
  if (savedAdmin) select.value = savedAdmin;
  select.onchange = (e) => localStorage.setItem('comforta_admin_name', e.target.value);
  Object.assign(select.style, {
    padding: '4px', borderRadius: '4px', border: 'none', 
    backgroundColor: '#333', color: 'white', fontSize: '12px', cursor: 'pointer'
  });

  const syncBtn = document.createElement('button');
  syncBtn.innerText = '⚡ Sincronizar Datos';
  Object.assign(syncBtn.style, {
    padding: '8px 12px', backgroundColor: '#4CAF50', color: '#ffffff',
    border: 'none', borderRadius: '6px', fontWeight: 'bold',
    cursor: 'pointer', fontSize: '12px'
  });

  let dragStarted = false;
  container.onmousedown = function(event) {
    if (event.target === select || event.target === syncBtn) return;
    let startX = event.clientX;
    let startY = event.clientY;
    dragStarted = false;
    let shiftX = event.clientX - container.getBoundingClientRect().left;
    let shiftY = event.clientY - container.getBoundingClientRect().top;

    function onMouseMove(event) {
      let dx = event.clientX - startX;
      let dy = event.clientY - startY;
      if (!dragStarted && Math.sqrt(dx*dx + dy*dy) > 5) {
        dragStarted = true;
      }
      if (dragStarted) {
        container.style.right = 'auto';
        container.style.left = event.pageX - shiftX + 'px';
        container.style.top = event.pageY - shiftY + 'px';
      }
    }

    document.addEventListener('mousemove', onMouseMove);
    document.onmouseup = function() {
      document.removeEventListener('mousemove', onMouseMove);
      document.onmouseup = null;
    };
  };

  container.ondragstart = function() { return false; };

  syncBtn.onclick = async (e) => {
    if (dragStarted) return;
    
    const admin = select.value;
    localStorage.setItem('comforta_admin_name', admin);

    syncBtn.innerText = 'Sincronizando...';
    syncBtn.style.backgroundColor = '#666';

    const url = window.location.href;
    let plataforma = 'desconocida';
    if (url.includes('uber')) plataforma = 'uber';
    if (url.includes('cabify')) plataforma = 'cabify';
    if (url.includes('bolt')) plataforma = 'bolt';

    const pageText = document.body.innerText;
    const pageHtml = document.body.innerHTML; 
    const lines = pageText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    let drivers = [];
    let rawDateRange = "";

    // Extract Date Text from Screen
    const allText = lines.join(' ');
    if (plataforma === 'cabify') {
       const match = allText.match(/\d{2}\/\d{2}\/\d{4}.*?a.*?\d{2}\/\d{2}\/\d{4}/i);
       if (match) rawDateRange = match[0];
       else {
         const sMatch = allText.match(/\(S\d+\)/);
         if (sMatch) rawDateRange = sMatch[0];
       }
    } else if (plataforma === 'bolt') {
       const match = allText.match(/\d{1,2}\s+[a-z]{3}\s+-\s+\d{1,2}\s+[a-z]{3}/i);
       if (match) rawDateRange = match[0];
    } else if (plataforma === 'uber') {
       // Uber format 1: "Aug 31st, 2026 04:00 AM - Sep 7th, 2026 04:00 AM"
       const mUber1 = allText.match(/[a-z]{3}\s+\d{1,2}(?:st|nd|rd|th)?,\s+\d{4}.*?-\s*[a-z]{3}\s+\d{1,2}(?:st|nd|rd|th)?,\s+\d{4}/i);
       if (mUber1) rawDateRange = mUber1[0];
       else {
         const match = allText.match(/\d{1,2}\s+[a-z]{3}\s*-\s*\d{1,2}\s+[a-z]{3}/i);
         if (match) rawDateRange = match[0];
         else {
           const m2 = allText.match(/\b(?:ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)[a-z]* \d{1,2} - \b(?:ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)[a-z]* \d{1,2}/i);
           if (m2) rawDateRange = m2[0];
         }
       }
    }

    if (!rawDateRange) {
      // Fallback
      rawDateRange = prompt("No pude detectar la fecha en la pantalla. Ingresa la fecha (ej: 01/08/2026 - 31/08/2026):", "01/08/2026 - 31/08/2026");
      if (!rawDateRange) {
         syncBtn.innerText = '⚡ Sincronizar Datos';
         syncBtn.style.backgroundColor = '#4CAF50';
         return;
      }
    }
    
    if (plataforma === 'uber') {
      const startIndex = lines.findIndex(l => l === 'Block Cash Trips' || l === 'Bloquear viajes en efectivo');
      if (startIndex !== -1) {
        let currentIndex = startIndex + 1;
        while (currentIndex < lines.length) {
          const name = lines[currentIndex];
          if (name.includes('rows') || name === '❮❮' || name === 'First' || name.includes('filas')) break;
          const totalEarnings = lines[currentIndex + 1];
          const cashEarnings = lines[currentIndex + 3];
          
          if (totalEarnings && totalEarnings.startsWith('€')) {
            let photoUrl = '';
            const allElements = Array.from(document.querySelectorAll('*'));
            const nameEl = allElements.find(el => el.textContent === name && el.children.length === 0);
            if (nameEl) {
              const row = nameEl.closest('tr') || nameEl.parentElement.parentElement.parentElement.parentElement;
              if (row) {
                const img = row.querySelector('img');
                if (img) photoUrl = img.src;
              }
            }

            const bonosText = lines[currentIndex + 2];
            let bonosVal = 0;
            if (bonosText && bonosText.includes('€')) {
              bonosVal = parseFloat(bonosText.replace('€', '').replace(/,/g, '').trim());
            }

            drivers.push({
              nombre: name,
              photoUrl: photoUrl,
              totalBruto: parseFloat(totalEarnings.replace('€', '').replace(/,/g, '').trim()),
              totalEfectivo: parseFloat(cashEarnings.replace('€', '').replace(/,/g, '').trim()),
              cobradoABordo: null,
              bonos: bonosVal 
            });
            currentIndex += 10;
          } else {
            currentIndex++;
          }
        }
      }
    }

    if (plataforma === 'cabify') {
      const isIndividual = url.includes('/drivers/') || lines.some(l => l === 'Ficha del conductor' || l === 'Cobrado a bordo');

      if (isIndividual) {
        const fichaIndex = lines.findIndex(l => l === 'Ficha del conductor');
        let nameLine = '';
        if (fichaIndex !== -1) {
          nameLine = lines[fichaIndex + 2];
          if (lines[fichaIndex + 1].length > 3) nameLine = lines[fichaIndex + 1];
        } else {
          const h1 = document.querySelector('h1');
          if (h1 && h1.textContent.length > 3) nameLine = h1.textContent.trim();
          if (!nameLine || nameLine.toLowerCase().includes('report')) {
            const h2 = document.querySelector('h2');
            if (h2 && h2.textContent.length > 3) nameLine = h2.textContent.trim();
          }
        }
        if (!nameLine) {
          nameLine = prompt("No detecté el nombre del conductor. Por favor, escríbelo:", "");
        }
        
        const gtIndex = lines.findIndex(l => l === 'Ganancias totales');
        const ceIndex = lines.findIndex(l => l === 'Cobro en efectivo');
        const cbIndex = lines.findIndex(l => l === 'Cobrado a bordo');
        const pIndex = lines.findIndex(l => l === 'Promociones');

        if (gtIndex !== -1 && nameLine) {
          const ce = ceIndex !== -1 ? parseEuro(lines[ceIndex + 1]) : 0;
          const cb = cbIndex !== -1 ? parseEuro(lines[cbIndex + 1]) : 0;
          const p = pIndex !== -1 ? parseEuro(lines[pIndex + 1]) : 0;
          let photoUrl = ''; 

          drivers.push({
            nombre: nameLine,
            photoUrl: photoUrl,
            totalBruto: parseEuro(lines[gtIndex + 1]),
            totalEfectivo: ce, 
            cobradoABordo: cb, 
            bonos: p
          });
        }
      } else {
        const startIndex = lines.findIndex(l => l.toLowerCase() === 'totales');
        if (startIndex !== -1) {
          let currentIndex = startIndex + 1;
          while (currentIndex < lines.length) {
            const initials = lines[currentIndex];
            if (initials === 'Sincronizando...' || initials.includes('Total') || initials.includes('1 - ')) break;
            if (initials.length > 3) {
               currentIndex++;
               continue;
            }

            const name = lines[currentIndex + 1];
            const efectivo = lines[currentIndex + 3];
            const promociones = lines[currentIndex + 4];
            const totalEarnings = lines[currentIndex + 6];

            if (totalEarnings && totalEarnings.includes('€')) {
              let photoUrl = '';
              const allElements = Array.from(document.querySelectorAll('*'));
              const nameEl = allElements.find(el => el.textContent === name && el.children.length === 0);
              if (nameEl) {
                const row = nameEl.closest('[role="row"]') || nameEl.closest('.msl-table-rowContainer') || nameEl.parentElement.parentElement.parentElement;
                if (row) {
                  const img = row.querySelector('img');
                  if (img) photoUrl = img.src;
                }
              }

              drivers.push({
                nombre: name,
                photoUrl: photoUrl,
                totalBruto: parseEuro(totalEarnings),
                totalEfectivo: parseEuro(efectivo),
                cobradoABordo: null, 
                bonos: parseEuro(promociones)
              });
              currentIndex += 7;
            } else {
              currentIndex++;
            }
          }
        }
      }
    }

    if (plataforma === 'bolt') {
      const thElements = Array.from(document.querySelectorAll('th, [role="columnheader"], .table-header-cell'));
      if (thElements.length > 0) {
        const nameCol = thElements.findIndex(th => th.textContent.includes('Conductor/a') || th.textContent.includes('Nombre'));
        const netCol = thElements.findIndex(th => th.textContent.includes('Ingresos netos') && !th.textContent.includes('hora'));
        const cashCol = thElements.findIndex(th => th.textContent.includes('Efectivo recaudado'));

        if (nameCol !== -1 && netCol !== -1 && cashCol !== -1) {
          const rows = document.querySelectorAll('tbody tr, [role="row"], .table-row');
          rows.forEach(row => {
            const cells = row.querySelectorAll('td, [role="cell"], .table-cell');
            if (cells.length > Math.max(nameCol, netCol, cashCol)) {
              const name = cells[nameCol].textContent.trim();
              const netText = cells[netCol].textContent.replace('€', '').replace(/\s/g, '').replace(',', '.');
              const cashText = cells[cashCol].textContent.replace('€', '').replace(/\s/g, '').replace(',', '.');
              
              const net = parseFloat(netText === '—' ? '0' : netText);
              const cash = parseFloat(cashText === '—' ? '0' : cashText);

              if (name && name !== 'Conductor/a' && !isNaN(net)) {
                let photoUrl = '';
                const img = row.querySelector('img');
                if (img) photoUrl = img.src;

                drivers.push({
                  nombre: name,
                  photoUrl: photoUrl,
                  totalBruto: net, 
                  totalEfectivo: cash,
                  cobradoABordo: null,
                  bonos: 0 
                });
              }
            }
          });
        }
      }
    }

    if (drivers.length === 0) {
      alert("No se encontraron conductores en la pantalla actual.");
      syncBtn.innerText = '⚡ Sincronizar Datos';
      syncBtn.style.backgroundColor = '#4CAF50';
      return;
    }

    const payload = {
      plataforma: plataforma,
      url: window.location.href,
      admin: admin,
      rawDateRange: rawDateRange,
      data: drivers,
      rawText: pageText,
      timestamp: new Date().toISOString()
    };

    try {
      const response = await fetch('http://localhost:3000/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if(response.ok) {
        syncBtn.innerText = '¡Sincronizado!';
        syncBtn.style.backgroundColor = '#2196F3';
        setTimeout(() => {
          syncBtn.innerText = '⚡ Sincronizar Datos';
          syncBtn.style.backgroundColor = '#4CAF50';
        }, 3000);
      } else {
        alert('Error al enviar datos.');
        syncBtn.innerText = 'Reintentar';
        syncBtn.style.backgroundColor = '#f44336';
      }
    } catch(e) {
      alert('Error de red: ' + e.message);
      syncBtn.innerText = 'Reintentar';
      syncBtn.style.backgroundColor = '#f44336';
    }
  };

  container.appendChild(title);
  container.appendChild(select);
  container.appendChild(syncBtn);
  document.body.appendChild(container);
}

if (document.body) {
  createFloatingMenu();
} else {
  document.addEventListener('DOMContentLoaded', createFloatingMenu);
}
setInterval(createFloatingMenu, 2000);
