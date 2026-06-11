/* ═══════════════════════════════════════════════════════════
   DACAR — app.js
   ▶ Configuración Supabase: reemplaza SB_URL y SB_KEY
   ▶ Admin: usuario "admin" / contraseña "dacar2025"

   SQL para crear la tabla en Supabase:
   ─────────────────────────────────────
   CREATE TABLE carros (
     id          bigserial primary key,
     marca       text,
     modelo      text,
     anio        int,
     precio      bigint,
     categoria   text,
     km          text,
     color       text,
     combustible text,
     foto_url    text,
     descripcion text,
     created_at  timestamptz default now()
   );
═══════════════════════════════════════════════════════════ */

/* ── SUPABASE CONFIG ──────────────────────────────────────── */
const SB_URL = 'https://fgtmgvwuwcftfsosrrym.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZndG1ndnd1d2NmdGZzb3NycnltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExMzUyMDIsImV4cCI6MjA5NjcxMTIwMn0.BiEX4abw9nXNzqbk1o2xRlbzNFkWw1PBsYCB1N3dyNI';

// Solo conecta si las credenciales fueron reemplazadas
const SB_CONFIGURED = !SB_URL.includes('TU_PROYECTO') && !SB_KEY.includes('TU_ANON');
let sb = null;
if (SB_CONFIGURED) {
  try {
    sb = supabase.createClient(SB_URL, SB_KEY);
  } catch (e) {
    console.warn('Error iniciando Supabase:', e);
  }
} else {
  console.info('Supabase no configurado — usando datos de demostración.');
}

/* ── CREDENCIALES ADMIN ───────────────────────────────────── */
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'dacar2025';

/* ── ESTADO GLOBAL ────────────────────────────────────────── */
let cars      = [];
let activeCat = 'todos';
let isAdmin   = false;

/* ── HELPERS ─────────────────────────────────────────────── */
const CL  = {
  mecanicos: 'Mecánico',
  automaticos: 'Automático',
  hibridos: 'Híbrido',
  semihibridos: 'Semihíbrido'
};

const fmt = (n) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0
  }).format(n);

/* ── DATOS DE DEMOSTRACIÓN ────────────────────────────────── */
const DEMO_CARS = [
  {
    id: 1, marca: 'Toyota', modelo: 'Corolla', anio: 2023,
    precio: 85000000, categoria: 'automaticos', km: '0 km',
    color: 'Blanco', combustible: 'Gasolina', foto_url: '',
    descripcion: 'Sedán moderno con bajo consumo y garantía de fábrica.'
  },
  {
    id: 2, marca: 'Honda', modelo: 'Civic', anio: 2022,
    precio: 78000000, categoria: 'mecanicos', km: '22,000 km',
    color: 'Gris', combustible: 'Gasolina', foto_url: '',
    descripcion: 'Deportivo con excelente rendimiento. Carrocería en óptimas condiciones.'
  },
  {
    id: 3, marca: 'Toyota', modelo: 'Prius', anio: 2023,
    precio: 120000000, categoria: 'hibridos', km: '5,000 km',
    color: 'Plata', combustible: 'Híbrido', foto_url: '',
    descripcion: 'Híbrido de bajo consumo con tecnología regenerativa. Perfecto para la ciudad.'
  },
  {
    id: 4, marca: 'Hyundai', modelo: 'Tucson', anio: 2022,
    precio: 110000000, categoria: 'semihibridos', km: '18,000 km',
    color: 'Azul', combustible: 'Híbrido', foto_url: '',
    descripcion: 'SUV semihíbrido con confort premium y gran eficiencia energética.'
  },
  {
    id: 5, marca: 'Mazda', modelo: 'CX-5', anio: 2023,
    precio: 130000000, categoria: 'automaticos', km: '0 km',
    color: 'Rojo', combustible: 'Gasolina', foto_url: '',
    descripcion: 'SUV automático de lujo, interior cuero y tecnologías de seguridad avanzadas.'
  },
  {
    id: 6, marca: 'Nissan', modelo: 'Sentra', anio: 2021,
    precio: 62000000, categoria: 'mecanicos', km: '35,000 km',
    color: 'Negro', combustible: 'Gasolina', foto_url: '',
    descripcion: 'Sedán confiable con excelente relación precio-valor. Ideal para uso diario.'
  }
];

/* ════════════════════════════════════════════════════════════
   LOADER — PANTALLA DE CARGA
   ▶ Totalmente independiente, se cierra por tiempo fijo
════════════════════════════════════════════════════════════ */
(function initLoader() {
  const loader = document.getElementById('loader');
  const bar    = document.getElementById('loaderBar');
  const text   = document.getElementById('loaderText');
  if (!loader || !bar || !text) return;

  const TOTAL_MS = 2800; // duración total del loader en ms
  const messages = [
    { at: 0,   txt: 'Cargando experiencia...'   },
    { at: 30,  txt: 'Preparando inventario...'  },
    { at: 65,  txt: 'Casi listo...'             },
    { at: 88,  txt: '¡Bienvenido a Dacar Autos!' }
  ];

  text.style.transition = 'opacity .25s ease';

  function changeText(msg) {
    text.style.opacity = '0';
    setTimeout(() => { text.textContent = msg; text.style.opacity = '1'; }, 220);
  }

  const start = Date.now();
  let lastMsg = -1;

  const iv = setInterval(() => {
    const elapsed  = Date.now() - start;
    const progress = Math.min((elapsed / TOTAL_MS) * 100, 100);

    bar.style.width = progress + '%';

    // Cambiar texto según progreso
    for (let i = messages.length - 1; i >= 0; i--) {
      if (progress >= messages[i].at && lastMsg < i) {
        lastMsg = i;
        changeText(messages[i].txt);
        break;
      }
    }

    if (progress >= 100) {
      clearInterval(iv);
      // Pequeña pausa antes de cerrar para que se vea el 100%
      setTimeout(() => {
        loader.classList.add('hide');
        setTimeout(() => { if (loader.parentNode) loader.remove(); }, 700);
      }, 300);
    }
  }, 30);
})();

/* ════════════════════════════════════════════════════════════
   CANVAS — PARTÍCULAS HERO
════════════════════════════════════════════════════════════ */
(function initCanvas() {
  const cv = document.getElementById('hero-canvas');
  const cx = cv.getContext('2d');
  let W, H, pts = [];

  const resize = () => {
    W = cv.width  = window.innerWidth;
    H = cv.height = window.innerHeight;
  };
  resize();
  window.addEventListener('resize', resize);

  class Particle {
    constructor() { this.reset(); this.y = Math.random() * H; }
    reset() {
      this.x    = Math.random() * W;
      this.y    = H + 5;
      this.v    = 0.4 + Math.random() * 1;
      this.r    = 0.4 + Math.random() * 1.2;
      this.o    = 0.08 + Math.random() * 0.35;
      this.c    = Math.random() > 0.75 ? '#C8202F' : '#fff';
      this.dx   = (Math.random() - 0.5) * 0.4;
    }
    step() {
      this.y -= this.v;
      this.x += this.dx;
      if (this.y < -5) this.reset();
    }
    draw() {
      cx.beginPath();
      cx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      cx.fillStyle   = this.c;
      cx.globalAlpha = this.o;
      cx.fill();
    }
  }

  for (let i = 0; i < 100; i++) pts.push(new Particle());

  const loop = () => {
    cx.clearRect(0, 0, W, H);
    cx.globalAlpha = 1;
    pts.forEach(p => { p.step(); p.draw(); });
    cx.globalAlpha = 1;
    requestAnimationFrame(loop);
  };
  loop();
})();

/* ════════════════════════════════════════════════════════════
   NAVBAR — efecto scroll + dropdown clic
════════════════════════════════════════════════════════════ */
window.addEventListener('scroll', () => {
  document.getElementById('nav').classList.toggle('small', scrollY > 60);
});

// Dropdown de Carros — abrir/cerrar con clic
(function initDropdown() {
  const trigger = document.querySelector('.nl');
  const mega    = document.querySelector('.mega');
  if (!trigger || !mega) return;

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = mega.classList.contains('open');
    closeMega();
    if (!isOpen) {
      mega.classList.add('open');
      trigger.classList.add('open');
    }
  });

  // Cerrar al hacer clic en un mega-item
  mega.querySelectorAll('.mega-item').forEach(item => {
    item.addEventListener('click', () => closeMega());
  });

  // Cerrar al hacer clic fuera
  document.addEventListener('click', (e) => {
    if (!trigger.contains(e.target) && !mega.contains(e.target)) {
      closeMega();
    }
  });

  // Cerrar al presionar Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMega();
  });

  function closeMega() {
    mega.classList.remove('open');
    trigger.classList.remove('open');
  }
})();

/* ════════════════════════════════════════════════════════════
   FILTRO POR CATEGORÍA
════════════════════════════════════════════════════════════ */
document.querySelectorAll('.cat-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('on'));
    pill.classList.add('on');
    activeCat = pill.dataset.cat;
    renderCars();
  });
});

/* Desde el mega-menu */
function filterCat(cat) {
  document.querySelectorAll('.cat-pill').forEach(p =>
    p.classList.toggle('on', p.dataset.cat === cat)
  );
  activeCat = cat;
  renderCars();
  document.getElementById('carros').scrollIntoView({ behavior: 'smooth' });
}

/* ════════════════════════════════════════════════════════════
   RENDER — GRID DE CARROS
════════════════════════════════════════════════════════════ */
function renderCars() {
  const grid   = document.getElementById('carsGrid');
  const list   = activeCat === 'todos'
    ? cars
    : cars.filter(c => c.categoria === activeCat);

  updateCounts();

  if (!list.length) {
    grid.innerHTML = `
      <div class="cars-empty">
        <div class="cars-empty-icon">🚗</div>
        <p>No hay vehículos en esta categoría aún.<br>
           El administrador puede agregar vehículos desde el panel Admin.</p>
      </div>`;
    return;
  }

  grid.innerHTML = list.map((c, i) => `
    <div class="cc" style="animation-delay:${i * 0.07}s">
      <div class="cc-img">
        ${c.foto_url
          ? `<img src="${c.foto_url}" alt="${c.marca} ${c.modelo}"
               onerror="this.parentElement.innerHTML='🚘'">`
          : '🚘'}
        <span class="cc-badge">${CL[c.categoria] || c.categoria}</span>
      </div>
      <div class="cc-body">
        <div class="cc-make">${c.marca}</div>
        <div class="cc-name">${c.modelo}</div>
        <div class="cc-year">${c.anio}</div>
        <div class="cc-divider"></div>
        <div class="cc-specs">
          ${c.km          ? `<span class="cc-spec"><span class="cc-spec-icon">📍</span>${c.km}</span>`          : ''}
          ${c.color       ? `<span class="cc-spec"><span class="cc-spec-icon">🎨</span>${c.color}</span>`       : ''}
          ${c.combustible ? `<span class="cc-spec"><span class="cc-spec-icon">⛽</span>${c.combustible}</span>` : ''}
        </div>
        <div class="cc-price-row">
          <div class="cc-price">${fmt(c.precio)}</div>
          <button class="cc-cta" onclick="scrollContact('${c.marca} ${c.modelo}')">Consultar</button>
        </div>
        ${c.descripcion ? `<div class="cc-desc">${c.descripcion}</div>` : ''}
      </div>
    </div>
  `).join('');

  populateCarSelect();
}

/* Actualizar contadores en las pills */
function updateCounts() {
  document.getElementById('cnt-todos').textContent = cars.length;
  ['mecanicos', 'automaticos', 'hibridos', 'semihibridos'].forEach(cat => {
    const el = document.getElementById('cnt-' + cat);
    if (el) el.textContent = cars.filter(c => c.categoria === cat).length;
  });
}

/* Llenar el select de contacto */
function populateCarSelect() {
  const sel = document.getElementById('carInterestSel');
  if (!sel) return;
  sel.innerHTML = '<option value="">Seleccionar vehículo...</option>' +
    cars.map(c => `<option>${c.marca} ${c.modelo} ${c.anio}</option>`).join('');
}

/* Scroll al formulario de contacto */
function scrollContact(name) {
  document.getElementById('contacto').scrollIntoView({ behavior: 'smooth' });
  showToast('Interés registrado: ' + name, 'ok');
}

/* ════════════════════════════════════════════════════════════
   SLIDER DE FOTOS
════════════════════════════════════════════════════════════ */
function buildSlider() {
  const track = document.getElementById('sliderTrack');
  if (!track) return;
  const src = [...cars, ...cars].slice(0, 20);
  track.innerHTML = src.map(c => `
    <div class="si">
      ${c.foto_url
        ? `<img src="${c.foto_url}" alt="${c.marca}">`
        : '🚗'}
    </div>
  `).join('');
}

/* ════════════════════════════════════════════════════════════
   CARGA DESDE SUPABASE (o demo si no está configurado)
════════════════════════════════════════════════════════════ */
async function loadCars() {
  if (!SB_CONFIGURED || !sb) {
    cars = [...DEMO_CARS];
    renderCars();
    buildSlider();
    buildNosBg();
    return;
  }

  try {
    const { data, error } = await sb
      .from('carros')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    cars = data && data.length ? data : [...DEMO_CARS];
  } catch (err) {
    console.warn('Error Supabase, usando demo:', err);
    cars = [...DEMO_CARS];
  }

  renderCars();
  buildSlider();
  buildNosBg();
}

/* ════════════════════════════════════════════════════════════
   LOGIN
════════════════════════════════════════════════════════════ */
document.getElementById('openAdminBtn').addEventListener('click', () => {
  if (isAdmin) {
    openAdmin();
  } else {
    document.getElementById('loginOverlay').classList.add('open');
    setTimeout(() => document.getElementById('aUser').focus(), 100);
  }
});

function closeLogin() {
  document.getElementById('loginOverlay').classList.remove('open');
}

function doLogin() {
  const user = document.getElementById('aUser').value.trim();
  const pass = document.getElementById('aPass').value;

  if (user === ADMIN_USER && pass === ADMIN_PASS) {
    isAdmin = true;
    closeLogin();
    openAdmin();
    showToast('Bienvenido, Administrador ✓', 'ok');
  } else {
    showToast('Usuario o contraseña incorrectos', 'err');
    document.getElementById('aPass').value = '';
    document.getElementById('aPass').focus();
  }
}

/* Enter en el campo de contraseña */
document.getElementById('aPass').addEventListener('keydown', e => {
  if (e.key === 'Enter') doLogin();
});

/* ════════════════════════════════════════════════════════════
   PANEL ADMIN
════════════════════════════════════════════════════════════ */
function openAdmin() {
  document.getElementById('adminOverlay').classList.add('open');
  loadInvList();
}

function closeAdmin() {
  document.getElementById('adminOverlay').classList.remove('open');
}

/* Cambiar pestaña del admin */
function aTab(name, btn) {
  document.querySelectorAll('.a-tab').forEach(t => t.classList.remove('on'));
  btn.classList.add('on');
  document.getElementById('pAdd').classList.toggle('on', name === 'add');
  document.getElementById('pList').classList.toggle('on', name === 'list');
  if (name === 'list') loadInvList();
}

/* Cargar lista en el panel admin */
function loadInvList() {
  const list = document.getElementById('invList');
  if (!cars.length) {
    list.innerHTML = '<p style="color:var(--muted);text-align:center;padding:40px">No hay vehículos en el inventario.</p>';
    return;
  }
  list.innerHTML = cars.map(c => `
    <div class="inv-row">
      <div class="inv-info">
        <h4>${c.marca} ${c.modelo} ${c.anio}</h4>
        <span>${CL[c.categoria] || c.categoria} · ${fmt(c.precio)}</span>
      </div>
      <button class="btn-del" onclick="deleteCar(${c.id})">🗑 Eliminar</button>
    </div>
  `).join('');
}

/* AGREGAR carro */
async function addCar() {
  const marca     = document.getElementById('fMarca').value.trim();
  const modelo    = document.getElementById('fModelo').value.trim();
  const anio      = parseInt(document.getElementById('fAnio').value);
  const precio    = parseInt(document.getElementById('fPrecio').value);
  const categoria = document.getElementById('fCat').value;

  if (!marca || !modelo || !anio || !precio || !categoria) {
    showToast('Completa todos los campos requeridos (*)', 'err');
    return;
  }

  const car = {
    id:          Date.now(),
    marca,
    modelo,
    anio,
    precio,
    categoria,
    km:          document.getElementById('fKm').value,
    color:       document.getElementById('fColor').value,
    combustible: document.getElementById('fFuel').value,
    foto_url:    document.getElementById('fFoto').value,
    descripcion: document.getElementById('fDesc').value
  };

  /* Guardar en Supabase si está configurado */
  if (SB_CONFIGURED && sb) {
    const payload = {
      marca,
      modelo,
      anio,
      precio,
      categoria,
      km:          document.getElementById('fKm').value,
      color:       document.getElementById('fColor').value,
      combustible: document.getElementById('fFuel').value,
      foto_url:    document.getElementById('fFoto').value,
      descripcion: document.getElementById('fDesc').value
    };

    const { data, error } = await sb
      .from('carros')
      .insert([payload])
      .select();

    if (error) {
      showToast('Error al guardar: ' + error.message, 'err');
      return;
    }
    if (data && data[0]) car.id = data[0].id;
  }

  cars.unshift(car);
  renderCars();
  buildSlider();
  loadInvList();
  clearAdminForm();
  showToast('¡Vehículo agregado exitosamente! 🚗', 'ok');
}

/* ELIMINAR carro */
async function deleteCar(id) {
  if (!confirm('¿Deseas eliminar este vehículo del inventario?')) return;

  if (SB_CONFIGURED && sb) {
    const { error } = await sb.from('carros').delete().eq('id', id);
    if (error) {
      showToast('Error al eliminar: ' + error.message, 'err');
      return;
    }
  }

  cars = cars.filter(c => c.id !== id);
  renderCars();
  buildSlider();
  loadInvList();
  showToast('Vehículo eliminado del inventario.', 'ok');
}

/* Limpiar formulario del admin */
function clearAdminForm() {
  ['fMarca','fModelo','fAnio','fPrecio','fKm','fColor','fFoto','fDesc']
    .forEach(id => { document.getElementById(id).value = ''; });
  document.getElementById('fCat').value  = '';
  document.getElementById('fFuel').value = '';
}

/* ════════════════════════════════════════════════════════════
   ADMIN — EDITAR VEHÍCULO
════════════════════════════════════════════════════════════ */

/* Poblar el select de edición con los carros actuales */
function populateEditSel() {
  const sel = document.getElementById('editCarSel');
  if (!sel) return;
  sel.innerHTML = '<option value="">— Elige un vehículo —</option>' +
    cars.map(c =>
      `<option value="${c.id}">${c.marca} ${c.modelo} ${c.anio}</option>`
    ).join('');
}

/* Al seleccionar un carro en el select de edición */
function loadEditForm() {
  const id  = document.getElementById('editCarSel').value;
  const wrap = document.getElementById('editFormWrap');
  const empty = document.getElementById('editEmpty');

  if (!id) {
    wrap.style.display  = 'none';
    empty.style.display = 'block';
    return;
  }

  const car = cars.find(c => String(c.id) === String(id));
  if (!car) return;

  // Mostrar preview del carro seleccionado
  document.getElementById('editPreview').innerHTML = `
    <div class="edit-preview-img">
      ${car.foto_url
        ? `<img src="${car.foto_url}" alt="${car.marca}" onerror="this.parentElement.innerHTML='🚗'">`
        : '🚗'}
    </div>
    <div class="edit-preview-info">
      <h4>${car.marca} ${car.modelo}</h4>
      <span>${CL[car.categoria] || car.categoria} · ${car.anio}</span>
    </div>
  `;

  // Rellenar campos
  document.getElementById('eId').value       = car.id;
  document.getElementById('eMarca').value    = car.marca       || '';
  document.getElementById('eModelo').value   = car.modelo      || '';
  document.getElementById('eAnio').value     = car.anio        || '';
  document.getElementById('ePrecio').value   = car.precio      || '';
  document.getElementById('eCat').value      = car.categoria   || '';
  document.getElementById('eKm').value       = car.km          || '';
  document.getElementById('eColor').value    = car.color       || '';
  document.getElementById('eFuel').value     = car.combustible || '';
  document.getElementById('eFoto').value     = car.foto_url    || '';
  document.getElementById('eDesc').value     = car.descripcion || '';

  // Preview foto en tiempo real
  updateEditFotoPreview();

  wrap.style.display  = 'block';
  empty.style.display = 'none';
}

/* Preview de la foto al escribir la URL */
document.addEventListener('DOMContentLoaded', () => {
  const fi = document.getElementById('eFoto');
  if (fi) fi.addEventListener('input', updateEditFotoPreview);
});

function updateEditFotoPreview() {
  const url = (document.getElementById('eFoto') || {}).value || '';
  const box = document.getElementById('editFotoPreview');
  if (!box) return;
  box.innerHTML = url
    ? `<img src="${url}" alt="preview" onerror="this.parentElement.innerHTML=''">`
    : '';
}

/* Guardar cambios del vehículo editado */
async function saveCar() {
  const id     = document.getElementById('eId').value;
  const marca  = document.getElementById('eMarca').value.trim();
  const modelo = document.getElementById('eModelo').value.trim();
  const anio   = parseInt(document.getElementById('eAnio').value);
  const precio = parseInt(document.getElementById('ePrecio').value);
  const cat    = document.getElementById('eCat').value;

  if (!marca || !modelo || !anio || !precio || !cat) {
    showToast('Completa los campos requeridos (*)', 'err');
    return;
  }

  const updated = {
    marca, modelo, anio, precio,
    categoria:   cat,
    km:          document.getElementById('eKm').value,
    color:       document.getElementById('eColor').value,
    combustible: document.getElementById('eFuel').value,
    foto_url:    document.getElementById('eFoto').value,
    descripcion: document.getElementById('eDesc').value,
  };

  // Actualizar en Supabase si está configurado
  if (SB_CONFIGURED && sb) {
    const { error } = await sb.from('carros').update(updated).eq('id', id);
    if (error) { showToast('Error al guardar: ' + error.message, 'err'); return; }
  }

  // Actualizar en memoria local
  const idx = cars.findIndex(c => String(c.id) === String(id));
  if (idx !== -1) cars[idx] = { ...cars[idx], ...updated };

  renderCars();
  buildSlider();
  buildNosBg();
  loadInvList();
  populateEditSel();
  cancelEdit();
  showToast('¡Vehículo actualizado exitosamente! ✓', 'ok');
}

/* Cancelar edición */
function cancelEdit() {
  document.getElementById('editCarSel').value  = '';
  document.getElementById('editFormWrap').style.display = 'none';
  document.getElementById('editEmpty').style.display    = 'block';
}

/* Abrir pestaña editar con un carro preseleccionado (desde inventario) */
function editCar(id) {
  // Ir a la pestaña Editar
  const tabs = document.querySelectorAll('.a-tab');
  tabs.forEach(t => t.classList.remove('on'));
  tabs[2].classList.add('on');
  document.getElementById('pAdd').classList.remove('on');
  document.getElementById('pList').classList.remove('on');
  document.getElementById('pEdit').classList.add('on');

  populateEditSel();
  document.getElementById('editCarSel').value = id;
  loadEditForm();
}

/* ── Actualizar loadInvList para incluir botón Editar ── */
function loadInvList() {
  const list = document.getElementById('invList');
  if (!cars.length) {
    list.innerHTML = '<p style="color:var(--muted);text-align:center;padding:40px">No hay vehículos en el inventario.</p>';
    return;
  }
  list.innerHTML = cars.map(c => `
    <div class="inv-row">
      <div class="inv-info">
        <h4>${c.marca} ${c.modelo} ${c.anio}</h4>
        <span>${CL[c.categoria] || c.categoria} · ${fmt(c.precio)}</span>
      </div>
      <div class="inv-actions">
        <button class="btn-edit" onclick="editCar(${c.id})">✏️ Editar</button>
        <button class="btn-del"  onclick="deleteCar(${c.id})">🗑 Eliminar</button>
      </div>
    </div>
  `).join('');
}

/* ── Actualizar aTab para incluir pEdit y pCot ── */
function aTab(name, btn) {
  document.querySelectorAll('.a-tab').forEach(t => t.classList.remove('on'));
  btn.classList.add('on');
  document.getElementById('pAdd').classList.toggle('on',  name === 'add');
  document.getElementById('pList').classList.toggle('on', name === 'list');
  document.getElementById('pEdit').classList.toggle('on', name === 'edit');
  document.getElementById('pCot').classList.toggle('on',  name === 'cot');
  if (name === 'list') loadInvList();
  if (name === 'edit') { populateEditSel(); cancelEdit(); }
  if (name === 'cot')  loadCotizaciones();
}

/* ── Actualizar openAdmin para incluir edit y cotizaciones ── */
function openAdmin() {
  document.getElementById('adminOverlay').classList.add('open');
  loadInvList();
  populateEditSel();
}

/* ════════════════════════════════════════════════════════════
   NOSOTROS — FONDO COLLAGE DE FOTOS DE CARROS
════════════════════════════════════════════════════════════ */
function buildNosBg() {
  const bg = document.getElementById('nosBg');
  if (!bg) return;

  // Solo mostrar si hay carros con foto
  const withPhoto = cars.filter(c => c.foto_url && c.foto_url.trim());
  if (!withPhoto.length) { bg.style.opacity = '0'; return; }

  // Repetir fotos hasta llenar 12 celdas
  const tiles = [];
  for (let i = 0; i < 12; i++) tiles.push(withPhoto[i % withPhoto.length]);

  bg.innerHTML = tiles.map(c => `
    <div class="nos-bg-tile">
      <img src="${c.foto_url}" alt="${c.marca} ${c.modelo}"
           onerror="this.parentElement.style.display='none'">
    </div>
  `).join('');

  // Activar visibilidad con pequeño delay para transición
  setTimeout(() => {
    bg.classList.add('visible');
    // Animar tiles uno por uno
    bg.querySelectorAll('.nos-bg-tile').forEach((t, i) => {
      setTimeout(() => t.classList.add('active'), i * 120);
    });
  }, 200);
}

/* ════════════════════════════════════════════════════════════
   COTIZACIONES — guardar en Supabase
════════════════════════════════════════════════════════════ */
async function enviarCotizacion() {
  const nombre   = document.getElementById('cNombre').value.trim();
  const telefono = document.getElementById('cTelefono').value.trim();
  const email    = document.getElementById('cEmail').value.trim();
  const vehiculo = document.getElementById('carInterestSel').value.trim();
  const mensaje  = document.getElementById('cMensaje').value.trim();

  if (!nombre || !telefono) {
    showToast('Por favor completa Nombre y Teléfono', 'err');
    return;
  }

  const cotizacion = { nombre, telefono, email, vehiculo, mensaje };

  if (SB_CONFIGURED && sb) {
    const { error } = await sb.from('cotizaciones').insert([cotizacion]);
    if (error) {
      showToast('Error al enviar: ' + error.message, 'err');
      return;
    }
  }

  // Limpiar formulario
  ['cNombre','cTelefono','cEmail','cMensaje'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('carInterestSel').value = '';

  showToast('¡Mensaje enviado! Te contactaremos pronto 🚗', 'ok');
}

/* ════════════════════════════════════════════════════════════
   ADMIN — COTIZACIONES
════════════════════════════════════════════════════════════ */
async function loadCotizaciones() {
  const wrap = document.getElementById('cotizacionesList');
  if (!wrap) return;

  if (!SB_CONFIGURED || !sb) {
    wrap.innerHTML = '<p style="color:var(--muted);text-align:center;padding:40px">Supabase no configurado.</p>';
    return;
  }

  wrap.innerHTML = '<div class="spinner"></div>';

  try {
    const { data, error } = await sb
      .from('cotizaciones')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!data || !data.length) {
      wrap.innerHTML = `
        <div style="text-align:center;padding:60px 20px;color:var(--muted)">
          <div style="font-size:3rem;opacity:.2;margin-bottom:14px">📩</div>
          <p>No hay cotizaciones aún.</p>
        </div>`;
      return;
    }

    wrap.innerHTML = data.map(c => `
      <div class="cot-row">
        <div class="cot-info">
          <h4>${c.nombre}</h4>
          <div class="cot-meta">
            <span>📞 ${c.telefono}</span>
            ${c.email    ? `<span>✉️ ${c.email}</span>`    : ''}
            ${c.vehiculo ? `<span>🚗 ${c.vehiculo}</span>` : ''}
          </div>
          ${c.mensaje ? `<p class="cot-msg">"${c.mensaje}"</p>` : ''}
          <div class="cot-date">${new Date(c.created_at).toLocaleString('es-CO')}</div>
        </div>
        <button class="btn-del" onclick="deleteCotizacion(${c.id})">🗑</button>
      </div>
    `).join('');
  } catch (err) {
    wrap.innerHTML = '<p style="color:var(--muted);text-align:center;padding:40px">Error al cargar cotizaciones.</p>';
  }
}

async function deleteCotizacion(id) {
  if (!confirm('¿Eliminar esta cotización?')) return;
  const { error } = await sb.from('cotizaciones').delete().eq('id', id);
  if (error) { showToast('Error al eliminar', 'err'); return; }
  showToast('Cotización eliminada', 'ok');
  loadCotizaciones();
}
let toastTimer;
function showToast(msg, type = '') {
  const el = document.getElementById('toastEl');
  el.textContent = msg;
  el.className   = 'toast show ' + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'toast'; }, 3400);
}

/* ════════════════════════════════════════════════════════════
   CERRAR MODALES AL HACER CLIC FUERA
════════════════════════════════════════════════════════════ */
['loginOverlay', 'adminOverlay'].forEach(id => {
  document.getElementById(id).addEventListener('click', e => {
    if (e.target === e.currentTarget)
      e.target.classList.remove('open');
  });
});

/* ════════════════════════════════════════════════════════════
   INIT
════════════════════════════════════════════════════════════ */
loadCars();