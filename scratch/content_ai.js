// Este script se inyecta automáticamente en las páginas de Uber, Cabify o Bolt.

function createFloatingMenu() {
  if (document.getElementById('comforta-extract-btn')) return;

  const btn = document.createElement('button');
  btn.id = 'comforta-extract-btn';
  btn.innerText = '⚡ Sincronizar Datos (IA)';
  
  Object.assign(btn.style, {
    position: 'fixed', top: '20px', right: '20px', zIndex: '999999',
    padding: '12px 24px', backgroundColor: '#000000', color: '#ffffff',
    border: '2px solid #ffffff', borderRadius: '50px', fontWeight: 'bold',
    cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
    fontFamily: 'sans-serif', userSelect: 'none'
  });
  
  btn.onclick = async (e) => {
    let admin = localStorage.getItem('comforta_admin_name');
    if (!admin) {
      admin = prompt("Ingresa el nombre de la cuenta (Oscar o Eglee):", "Oscar");
      if (!admin) return;
      localStorage.setItem('comforta_admin_name', admin);
    }

    btn.innerText = '🧠 Claude pensando... (Espera 10s)';
    btn.style.backgroundColor = '#9C27B0';
    btn.disabled = true;

    const url = window.location.href;
    let plataforma = 'desconocida';
    if (url.includes('uber')) plataforma = 'uber';
    if (url.includes('cabify')) plataforma = 'cabify';
    if (url.includes('bolt')) plataforma = 'bolt';

    const pageText = document.body.innerText;
    const inputValues = Array.from(document.querySelectorAll('input')).map(i => i.value).join(' ');
    // Removemos HTML y scripts pero mantenemos el contenido para Claude
    const rawText = pageText + '\n\nINPUTS:\n' + inputValues;

    const payload = {
      plataforma: plataforma,
      url: window.location.href,
      admin: admin,
      rawText: rawText,
      timestamp: new Date().toISOString()
    };

    try {
      // Ajusta el timeout o espera porque Claude tomará unos segundos
      const response = await fetch('http://localhost:3000/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if(response.ok) {
        btn.innerText = '¡Sincronizado con IA!';
        btn.style.backgroundColor = '#4CAF50';
      } else {
        const err = await response.text();
        alert('Error al enviar datos: ' + err);
        btn.innerText = 'Error - Reintentar';
        btn.style.backgroundColor = '#f44336';
      }
    } catch(e) {
      alert('Error de red: ' + e.message);
      btn.innerText = 'Error - Reintentar';
      btn.style.backgroundColor = '#f44336';
    }
    
    setTimeout(() => {
      btn.innerText = '⚡ Sincronizar Datos (IA)';
      btn.style.backgroundColor = '#000000';
      btn.disabled = false;
    }, 4000);
  };

  document.body.appendChild(btn);
}

if (document.body) {
  createFloatingMenu();
} else {
  document.addEventListener('DOMContentLoaded', createFloatingMenu);
}
setInterval(createFloatingMenu, 2000);
