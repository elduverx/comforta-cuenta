// Este script se inyecta automáticamente en las páginas de Uber, Cabify o Bolt.

function createFloatingButton() {
  // Evitar duplicados
  if (document.getElementById('comforta-extract-btn')) return;

  const btn = document.createElement('button');
  btn.id = 'comforta-extract-btn';
  btn.innerText = '⚡ Sincronizar con Comforta';
  
  Object.assign(btn.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    zIndex: '999999',
    padding: '12px 24px',
    backgroundColor: '#000000',
    color: '#ffffff',
    border: '2px solid #ffffff',
    borderRadius: '50px',
    fontWeight: 'bold',
    cursor: 'move', // Cursor indica que es movible
    boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
    fontFamily: 'sans-serif',
    userSelect: 'none' // Evitar seleccionar el texto al arrastrar
  });
  
  // Lógica para hacerlo arrastrable
  let isDragging = false;
  let dragStarted = false;

  btn.onmousedown = function(event) {
    let startX = event.clientX;
    let startY = event.clientY;
    dragStarted = false;
    
    let shiftX = event.clientX - btn.getBoundingClientRect().left;
    let shiftY = event.clientY - btn.getBoundingClientRect().top;

    function onMouseMove(event) {
      // Solo consideramos que es un "arrastre" si el mouse se mueve más de 5 píxeles (evita clics fallidos por temblor del mouse)
      let dx = event.clientX - startX;
      let dy = event.clientY - startY;
      
      if (!dragStarted && Math.sqrt(dx*dx + dy*dy) > 5) {
        dragStarted = true;
      }
      
      if (dragStarted) {
        btn.style.right = 'auto'; // Deshabilitamos la posición right anclada
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

  btn.ondragstart = function() {
    return false;
  };
  
  btn.onclick = async (e) => {
    // Si el usuario estaba arrastrando, cancelamos el clic de sincronización
    if (dragStarted) {
      e.preventDefault();
      return;
    }

    btn.innerText = 'Sincronizando...';
    btn.style.backgroundColor = '#4CAF50';
    
    const url = window.location.href;
    let plataforma = 'desconocida';
    if (url.includes('uber')) plataforma = 'uber';
    if (url.includes('cabify')) plataforma = 'cabify';
    if (url.includes('bolt')) plataforma = 'bolt';

    const pageText = document.body.innerText;
    const pageHtml = document.body.innerHTML; // Necesario para buscar las <img> de las fotos y el nombre del admin
    const lines = pageText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    let drivers = [];
    let adminName = lines[0] || 'Desconocido';
    
    // Buscar el rango de fechas globalmente
    let dateRangeIndex = lines.findIndex(l => l.includes(' - ') && (l.includes('202') || l.includes(' AM') || l.includes(' PM')));
    let dateRange = dateRangeIndex !== -1 ? lines[dateRangeIndex] : 'Semana Actual';
    
    if (plataforma === 'uber') {
      // Buscar el encabezado de la última columna
      const startIndex = lines.findIndex(l => l === 'Block Cash Trips' || l === 'Bloquear viajes en efectivo');
      
      if (startIndex !== -1) {
        let currentIndex = startIndex + 1;
        while (currentIndex < lines.length) {
          const name = lines[currentIndex];
          if (name.includes('rows') || name === '❮❮' || name === 'First' || name.includes('filas')) break;
          
          const totalEarnings = lines[currentIndex + 1];
          const cashEarnings = lines[currentIndex + 3];
          
          if (totalEarnings && totalEarnings.startsWith('€')) {
            // Buscar la foto en el DOM real usando el nombre
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
      const cabifyDateIndex = lines.findIndex(l => l.match(/\d{2}\/\d{2}\/\d{4}.*a.*\d{2}\/\d{2}\/\d{4}/i) || l.match(/\(S\d+\)/));
      if (cabifyDateIndex !== -1) {
        dateRange = lines[cabifyDateIndex];
      }

      const isIndividual = lines.some(l => l === 'Ficha del conductor');

      if (isIndividual) {
        const fichaIndex = lines.findIndex(l => l === 'Ficha del conductor');
        let nameLine = lines[fichaIndex + 2];
        if (lines[fichaIndex + 1].length > 3) nameLine = lines[fichaIndex + 1];
        
        const gtIndex = lines.findIndex(l => l === 'Ganancias totales');
        const ceIndex = lines.findIndex(l => l === 'Cobro en efectivo');
        const cbIndex = lines.findIndex(l => l === 'Cobrado a bordo');
        const pIndex = lines.findIndex(l => l === 'Promociones');

        const parseEuro = (val) => {
          if (!val || val === '-') return 0;
          return parseFloat(val.replace('€', '').replace(/\./g, '').replace(',', '.'));
        };

        if (gtIndex !== -1 && nameLine) {
          const ce = parseEuro(lines[ceIndex + 1]);
          const cb = parseEuro(lines[cbIndex + 1]);
          
          let photoUrl = '';
          const img = document.querySelector('.msl-avatar_image, .inlineAvatar_thumbnail img');
          if (img) photoUrl = img.src;

          drivers.push({
            nombre: nameLine,
            photoUrl: photoUrl,
            totalBruto: parseEuro(lines[gtIndex + 1]),
            totalEfectivo: ce + cb, // Suma exigida por el usuario
            bonos: parseEuro(lines[pIndex + 1])
          });
        }
      } else {
        const startIndex = lines.findIndex(l => l.toLowerCase() === 'totales');
      if (startIndex !== -1) {
        let currentIndex = startIndex + 1;
        while (currentIndex < lines.length) {
          const initials = lines[currentIndex];
          
          if (initials === 'Sincronizando...' || initials.includes('Total') || initials.includes('1 - ')) break;
          // Skip empty or long random lines
          if (initials.length > 3) {
             currentIndex++;
             continue;
          }

          const name = lines[currentIndex + 1];
          const efectivo = lines[currentIndex + 3];
          const promociones = lines[currentIndex + 4];
          const totalEarnings = lines[currentIndex + 6];

          if (totalEarnings && totalEarnings.includes('€')) {
            // Extraer foto desde el DOM buscando el nombre del conductor
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
              totalBruto: parseFloat(totalEarnings.replace('€', '').replace(/\./g, '').replace(',', '.')),
              totalEfectivo: parseFloat(efectivo.replace('€', '').replace(/\./g, '').replace(',', '.')),
              bonos: parseFloat(promociones.replace('€', '').replace(/\./g, '').replace(',', '.'))
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
      const dateRegex = /\d{1,2}\s+[a-z]{3}\s+-\s+\d{1,2}\s+[a-z]{3}/i;
      // Tratar de buscarlo uniendo líneas en caso de que esté separado
      const fullText = lines.join(' ');
      const dateMatch = fullText.match(dateRegex);
      
      if (dateMatch) {
        dateRange = dateMatch[0];
      } else {
        const fallbackDate = prompt("No detecté la fecha de Bolt. Por favor escríbela (ej: '24 ago - 30 ago') o déjalo vacío para usar la semana actual:", "24 ago - 30 ago");
        if (fallbackDate) {
          dateRange = fallbackDate;
        }
      }

      // Intentar extraer con selectores DOM (tabla)
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

              // En Bolt, el Ingreso Neto se usa como base para la partición 65/35
              if (name && name !== 'Conductor/a' && !isNaN(net)) {
                let photoUrl = '';
                const img = row.querySelector('img');
                if (img) photoUrl = img.src;

                drivers.push({
                  nombre: name,
                  photoUrl: photoUrl,
                  totalBruto: net, // Usamos Neto como Bruto para que el admin calcule su 65% sobre esto
                  totalEfectivo: cash,
                  bonos: 0 // Sin bonos porque todo ya está consolidado en el neto según instrucciones
                });
              }
            }
          });
        }
      }
    }

    const payload = {
      plataforma: plataforma,
      url: url,
      admin: adminName,
      dateRange: dateRange,
      data: drivers,
      rawText: pageText,
      rawHtml: pageHtml, // Enviamos el HTML completo
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
        btn.innerText = '⚡ Sincronizar con Comforta';
        btn.style.backgroundColor = '#000000';
      } else {
        alert('Error al enviar datos.');
        btn.innerText = 'Error';
        btn.style.backgroundColor = '#f44336';
      }
    } catch(e) {
      alert('Error de red: ' + e.message);
      btn.innerText = 'Error';
      btn.style.backgroundColor = '#f44336';
    }
  };

  document.body.appendChild(btn);
}

// Inyectar el botón inmediatamente si el body ya existe, o esperar a que cargue
if (document.body) {
  createFloatingButton();
} else {
  document.addEventListener('DOMContentLoaded', createFloatingButton);
}
// También reintentar por si acaso es una Single Page Application (SPA)
setInterval(createFloatingButton, 2000);
