// Este script se inyecta automáticamente en las páginas de Uber, Cabify o Bolt.

function parseEuro(val) {
  if (!val || val === '-') return 0;
  return parseFloat(val.replace('€', '').replace(/\./g, '').replace(',', '.'));
}

function showSyncModal(plataforma, drivers, rawText, rawHtml) {
  // Remover modal previo si existe
  const existing = document.getElementById('comforta-sync-modal');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'comforta-sync-modal';
  Object.assign(overlay.style, {
    position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: '1000000',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif'
  });

  const modal = document.createElement('div');
  Object.assign(modal.style, {
    backgroundColor: 'white', padding: '24px', borderRadius: '12px',
    width: '400px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', color: '#333'
  });

  const title = document.createElement('h2');
  title.innerText = `Sincronizar ${drivers.length} conductores (${plataforma.toUpperCase()})`;
  Object.assign(title.style, { margin: '0 0 16px 0', fontSize: '18px' });

  // Perfil Admin
  const adminLabel = document.createElement('label');
  adminLabel.innerText = 'Perfil (Cuenta):';
  Object.assign(adminLabel.style, { display: 'block', fontWeight: 'bold', marginBottom: '4px', fontSize: '14px' });
  
  const adminSelect = document.createElement('select');
  adminSelect.innerHTML = `<option value="Oscar">Oscar</option><option value="Eglee">Eglee</option>`;
  const savedAdmin = localStorage.getItem('comforta_admin_name');
  if (savedAdmin) adminSelect.value = savedAdmin;
  Object.assign(adminSelect.style, { width: '100%', padding: '8px', marginBottom: '16px', borderRadius: '6px', border: '1px solid #ccc' });

  // Fecha Inicio
  const startLabel = document.createElement('label');
  startLabel.innerText = 'Fecha de Inicio del Reporte:';
  Object.assign(startLabel.style, { display: 'block', fontWeight: 'bold', marginBottom: '4px', fontSize: '14px' });
  const startDate = document.createElement('input');
  startDate.type = 'date';
  Object.assign(startDate.style, { width: '100%', padding: '8px', marginBottom: '16px', borderRadius: '6px', border: '1px solid #ccc' });

  // Fecha Fin
  const endLabel = document.createElement('label');
  endLabel.innerText = 'Fecha de Fin del Reporte:';
  Object.assign(endLabel.style, { display: 'block', fontWeight: 'bold', marginBottom: '4px', fontSize: '14px' });
  const endDate = document.createElement('input');
  endDate.type = 'date';
  Object.assign(endDate.style, { width: '100%', padding: '8px', marginBottom: '24px', borderRadius: '6px', border: '1px solid #ccc' });

  // Sugerir fechas basadas en hoy por defecto (el usuario las puede cambiar)
  const today = new Date();
  const dStr = today.toISOString().split('T')[0];
  startDate.value = dStr;
  endDate.value = dStr;

  // Botones
  const btnContainer = document.createElement('div');
  Object.assign(btnContainer.style, { display: 'flex', justifyContent: 'flex-end', gap: '12px' });

  const cancelBtn = document.createElement('button');
  cancelBtn.innerText = 'Cancelar';
  Object.assign(cancelBtn.style, { padding: '8px 16px', border: 'none', background: '#eee', borderRadius: '6px', cursor: 'pointer' });
  cancelBtn.onclick = () => overlay.remove();

  const syncBtn = document.createElement('button');
  syncBtn.innerText = 'Confirmar y Enviar';
  Object.assign(syncBtn.style, { padding: '8px 16px', border: 'none', background: '#000', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' });
  
  syncBtn.onclick = async () => {
    const sDate = startDate.value;
    const eDate = endDate.value;
    const admin = adminSelect.value;
    if (!sDate || !eDate) {
      alert("Debes seleccionar fecha de inicio y fin.");
      return;
    }
    
    if (sDate > eDate) {
      alert("La fecha de inicio no puede ser mayor que la fecha de fin.");
      return;
    }

    localStorage.setItem('comforta_admin_name', admin);
    syncBtn.innerText = 'Enviando...';
    syncBtn.disabled = true;

    const payload = {
      plataforma: plataforma,
      url: window.location.href,
      admin: admin,
      startDate: sDate,
      endDate: eDate,
      data: drivers,
      rawText: rawText,
      rawHtml: rawHtml,
      timestamp: new Date().toISOString()
    };

    try {
      const response = await fetch('http://localhost:3000/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if(response.ok) {
        alert(`¡Éxito! Se sincronizaron ${drivers.length} conductores de ${plataforma}.`);
        overlay.remove();
      } else {
        alert('Error al enviar datos.');
        syncBtn.innerText = 'Reintentar';
        syncBtn.disabled = false;
      }
    } catch(e) {
      alert('Error de red: ' + e.message);
      syncBtn.innerText = 'Reintentar';
      syncBtn.disabled = false;
    }
  };

  btnContainer.appendChild(cancelBtn);
  btnContainer.appendChild(syncBtn);

  modal.appendChild(title);
  modal.appendChild(adminLabel);
  modal.appendChild(adminSelect);
  modal.appendChild(startLabel);
  modal.appendChild(startDate);
  modal.appendChild(endLabel);
  modal.appendChild(endDate);
  modal.appendChild(btnContainer);

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

function createFloatingButton() {
  if (document.getElementById('comforta-extract-btn')) return;

  const btn = document.createElement('button');
  btn.id = 'comforta-extract-btn';
  btn.innerText = '⚡ Sincronizar con Comforta';
  
  Object.assign(btn.style, {
    position: 'fixed', top: '20px', right: '20px', zIndex: '999999',
    padding: '12px 24px', backgroundColor: '#000000', color: '#ffffff',
    border: '2px solid #ffffff', borderRadius: '50px', fontWeight: 'bold',
    cursor: 'move', boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
    fontFamily: 'sans-serif', userSelect: 'none'
  });
  
  let isDragging = false;
  let dragStarted = false;

  btn.onmousedown = function(event) {
    let startX = event.clientX;
    let startY = event.clientY;
    dragStarted = false;
    let shiftX = event.clientX - btn.getBoundingClientRect().left;
    let shiftY = event.clientY - btn.getBoundingClientRect().top;

    function onMouseMove(event) {
      let dx = event.clientX - startX;
      let dy = event.clientY - startY;
      if (!dragStarted && Math.sqrt(dx*dx + dy*dy) > 5) {
        dragStarted = true;
      }
      if (dragStarted) {
        btn.style.right = 'auto';
        btn.style.left = event.pageX - shiftX + 'px';
        btn.style.top = event.pageY - shiftY + 'px';
      }
    }

    document.addEventListener('mousemove', onMouseMove);
    document.onmouseup = function() {
      document.removeEventListener('mousemove', onMouseMove);
      document.onmouseup = null;
    };
  };

  btn.ondragstart = function() { return false; };
  
  btn.onclick = async (e) => {
    if (dragStarted) {
      e.preventDefault();
      return;
    }

    const url = window.location.href;
    let plataforma = 'desconocida';
    if (url.includes('uber')) plataforma = 'uber';
    if (url.includes('cabify')) plataforma = 'cabify';
    if (url.includes('bolt')) plataforma = 'bolt';

    const pageText = document.body.innerText;
    const pageHtml = document.body.innerHTML; 
    const lines = pageText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    let drivers = [];
    
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
      return;
    }

    showSyncModal(plataforma, drivers, pageText, pageHtml);
  };

  document.body.appendChild(btn);
}

if (document.body) {
  createFloatingButton();
} else {
  document.addEventListener('DOMContentLoaded', createFloatingButton);
}
setInterval(createFloatingButton, 2000);
