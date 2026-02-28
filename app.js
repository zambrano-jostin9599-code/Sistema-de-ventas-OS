const STORAGE_KEY  = 'ventas_data';
const USERS_KEY    = 'ventas_users';
const SESSION_KEY  = 'ventas_session';
const EMAILJS_KEY  = 'ventas_emailjs';
const TOKENS_KEY   = 'ventas_reset_tokens';

// ── EmailJS ───────────────────────────────────────────────────────────────
function getEmailConfig() {
  const raw = localStorage.getItem(EMAILJS_KEY);
  return raw ? JSON.parse(raw) : {
    publicKey:  '_UF7RQgG_ppZqjZwW',
    serviceId:  'service_a5hng0v',
    templateId: 'template_6rcwav5'
  };
}

function saveEmailConfig(cfg) {
  localStorage.setItem(EMAILJS_KEY, JSON.stringify(cfg));
}

function emailConfigured() {
  const c = getEmailConfig();
  return c.publicKey && c.serviceId && c.templateId;
}

(function initEmailJS() {
  const c = getEmailConfig();
  if (c.publicKey) emailjs.init(c.publicKey);
})();

// ── Tokens de recuperacion ────────────────────────────────────────────────
function getTokens() {
  return JSON.parse(localStorage.getItem(TOKENS_KEY) || '[]');
}

function saveTokens(tokens) {
  localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
}

function createResetToken(email) {
  const token   = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  const expiry  = Date.now() + 60 * 60 * 1000; // 1 hora
  const tokens  = getTokens().filter(t => t.email !== email);
  tokens.push({ token, email, expiry });
  saveTokens(tokens);
  return token;
}

function validateResetToken(token) {
  const tokens = getTokens();
  const found  = tokens.find(t => t.token === token);
  if (!found) return null;
  if (Date.now() > found.expiry) {
    saveTokens(tokens.filter(t => t.token !== token));
    return null;
  }
  return found.email;
}

function consumeResetToken(token) {
  saveTokens(getTokens().filter(t => t.token !== token));
}

function buildResetLink(token) {
  const base = window.location.href.split('#')[0];
  return `${base}#reset=${token}`;
}

function getUsers() {
  const saved = localStorage.getItem(USERS_KEY);
  return saved ? JSON.parse(saved) : [{ user: 'admin', email: '', pass: '1234' }];
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function isLoggedIn() {
  return sessionStorage.getItem(SESSION_KEY) === '1';
}

function showApp() {
  document.getElementById('loginOverlay').style.display = 'none';
  document.getElementById('appContent').style.display = 'flex';
}

function showLogin() {
  document.getElementById('loginOverlay').style.display = 'flex';
  document.getElementById('appContent').style.display = 'none';
}

if (isLoggedIn()) {
  showApp();
} else {
  showLogin();
}

// ── Modo activo: 'login' | 'register' | 'recover' ────────────────────────
let authMode = 'login';

function setAuthMode(mode) {
  authMode = mode;
  document.getElementById('loginForm').style.display    = mode === 'login'    ? 'block' : 'none';
  document.getElementById('registerForm').style.display = mode === 'register' ? 'block' : 'none';
  document.getElementById('recoverForm').style.display  = mode === 'recover'  ? 'block' : 'none';
  document.getElementById('newPassForm').style.display  = mode === 'newpass'  ? 'block' : 'none';

  const subtitles = {
    login:    'Ingresa tus credenciales para continuar',
    register: 'Crea tu cuenta para continuar',
    recover:  'Recuperar contraseña',
    newpass:  'Crea tu nueva contraseña',
  };
  document.getElementById('loginSubtitle').textContent = subtitles[mode] || '';

  document.getElementById('switchText').textContent =
    mode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?';
  document.getElementById('switchBtn').textContent =
    mode === 'login' ? 'Regístrate' : 'Inicia sesión';

  const hideSwitchModes = ['recover', 'newpass'];
  document.querySelector('.login-switch').style.display = hideSwitchModes.includes(mode) ? 'none' : 'flex';

  ['loginError','registerError','recoverError','recoverSuccess','newPassError'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
}

document.getElementById('switchBtn').addEventListener('click', () => {
  setAuthMode(authMode === 'login' ? 'register' : 'login');
});

document.getElementById('forgotBtn').addEventListener('click', () => {
  setAuthMode('recover');
});

// ── Login ─────────────────────────────────────────────────────────────────
document.getElementById('loginForm').addEventListener('submit', e => {
  e.preventDefault();
  const u = document.getElementById('loginUser').value.trim();
  const p = document.getElementById('loginPass').value;
  const errEl = document.getElementById('loginError');
  const found = getUsers().find(x => x.user === u && x.pass === p);
  if (found) {
    sessionStorage.setItem(SESSION_KEY, '1');
    errEl.style.display = 'none';
    showApp();
  } else {
    errEl.style.display = 'block';
    document.getElementById('loginPass').value = '';
  }
});

// ── Registro ──────────────────────────────────────────────────────────────
document.getElementById('registerForm').addEventListener('submit', e => {
  e.preventDefault();
  const u    = document.getElementById('regUser').value.trim();
  const mail = document.getElementById('regEmail').value.trim().toLowerCase();
  const p    = document.getElementById('regPass').value;
  const p2   = document.getElementById('regPass2').value;
  const errEl = document.getElementById('registerError');
  const users = getUsers();

  if (u.length < 3) {
    errEl.textContent = 'El usuario debe tener al menos 3 caracteres.';
    errEl.style.display = 'block'; return;
  }
  if (p.length < 4) {
    errEl.textContent = 'La contraseña debe tener al menos 4 caracteres.';
    errEl.style.display = 'block'; return;
  }
  if (p !== p2) {
    errEl.textContent = 'Las contraseñas no coinciden.';
    errEl.style.display = 'block'; return;
  }
  if (users.find(x => x.user === u)) {
    errEl.textContent = 'Ese nombre de usuario ya está en uso.';
    errEl.style.display = 'block'; return;
  }
  if (users.find(x => x.email === mail)) {
    errEl.textContent = 'Ese correo ya está registrado.';
    errEl.style.display = 'block'; return;
  }

  users.push({ user: u, email: mail, pass: p });
  saveUsers(users);
  document.getElementById('registerForm').reset();
  setAuthMode('login');
  document.getElementById('loginUser').value = u;
  showToast('Cuenta creada. Ya puedes iniciar sesión.');
});

// ── Recuperar contraseña ──────────────────────────────────────────────────
document.getElementById('recoverForm').addEventListener('submit', async e => {
  e.preventDefault();
  const mail  = document.getElementById('recoverEmail').value.trim().toLowerCase();
  const errEl = document.getElementById('recoverError');
  const okEl  = document.getElementById('recoverSuccess');
  const btn   = document.getElementById('btnRecoverSend');
  errEl.style.display = 'none';
  okEl.style.display  = 'none';

  const account = getUsers().find(x => x.email === mail);
  if (!account) {
    errEl.textContent = 'No encontramos una cuenta con ese correo.';
    errEl.style.display = 'block'; return;
  }

  const token     = createResetToken(mail);
  const resetLink = buildResetLink(token);

  if (!emailConfigured()) {
    const subject = encodeURIComponent('Recuperacion de contrasena - Control de Ventas');
    const body    = encodeURIComponent(`Hola ${account.user},\n\nHaz clic en el siguiente enlace para crear una nueva contrasena (valido por 1 hora):\n\n${resetLink}\n\nSi no solicitaste esto, ignora este mensaje.`);
    window.location.href = `mailto:${account.email}?subject=${subject}&body=${body}`;
    okEl.textContent = 'Se abrio tu cliente de correo con el link listo para enviar.';
    okEl.style.display = 'block';
    document.getElementById('recoverForm').reset();
    return;
  }

  btn.textContent = 'Enviando...';
  btn.disabled = true;
  try {
    const cfg = getEmailConfig();
    await emailjs.send(cfg.serviceId, cfg.templateId, {
      to_email:   account.email,
      to_name:    account.user,
      reset_link: resetLink,
    });
    okEl.textContent = 'Correo enviado. Revisa tu bandeja de entrada (expira en 1 hora).';
    okEl.style.display = 'block';
    document.getElementById('recoverForm').reset();
  } catch {
    errEl.textContent = 'No se pudo enviar el correo. Verifica tu configuracion de EmailJS.';
    errEl.style.display = 'block';
  } finally {
    btn.textContent = 'Enviar link de recuperacion';
    btn.disabled = false;
  }
});

// ── Nueva contraseña desde link ───────────────────────────────────────────
let resetTokenFromURL = null;

(function checkResetToken() {
  const hash = window.location.hash;
  if (!hash.startsWith('#reset=')) return;
  const token = hash.slice(7);
  const email = validateResetToken(token);
  if (email) {
    resetTokenFromURL = token;
    setAuthMode('newpass');
  } else {
    setAuthMode('login');
  }
})();

document.getElementById('newPassForm').addEventListener('submit', e => {
  e.preventDefault();
  const p1    = document.getElementById('newPass1').value;
  const p2    = document.getElementById('newPass2').value;
  const errEl = document.getElementById('newPassError');

  if (p1.length < 4) {
    errEl.textContent = 'La contraseña debe tener al menos 4 caracteres.';
    errEl.style.display = 'block'; return;
  }
  if (p1 !== p2) {
    errEl.textContent = 'Las contraseñas no coinciden.';
    errEl.style.display = 'block'; return;
  }

  const email = validateResetToken(resetTokenFromURL);
  if (!email) {
    errEl.textContent = 'El link ha expirado. Solicita uno nuevo.';
    errEl.style.display = 'block'; return;
  }

  const users = getUsers();
  const idx   = users.findIndex(u => u.email === email);
  if (idx !== -1) {
    users[idx].pass = p1;
    saveUsers(users);
  }
  consumeResetToken(resetTokenFromURL);
  resetTokenFromURL = null;
  history.replaceState(null, '', window.location.pathname);
  document.getElementById('newPassForm').reset();
  setAuthMode('login');
  showToast('Contraseña actualizada. Ya puedes iniciar sesión.');
});

function togglePassField(inputId) {
  const input = document.getElementById(inputId);
  input.type = input.type === 'password' ? 'text' : 'password';
}

document.getElementById('togglePass').addEventListener('click',      () => togglePassField('loginPass'));
document.getElementById('toggleRegPass').addEventListener('click',   () => togglePassField('regPass'));
document.getElementById('toggleRegPass2').addEventListener('click',  () => togglePassField('regPass2'));
document.getElementById('toggleNewPass1').addEventListener('click',  () => togglePassField('newPass1'));
document.getElementById('toggleNewPass2').addEventListener('click',  () => togglePassField('newPass2'));

// ── Modal configuracion EmailJS ───────────────────────────────────────────
function openConfigModal() {
  const cfg = getEmailConfig();
  document.getElementById('cfgPublicKey').value  = cfg.publicKey  || '';
  document.getElementById('cfgServiceId').value  = cfg.serviceId  || '';
  document.getElementById('cfgTemplateId').value = cfg.templateId || '';
  document.getElementById('cfgStatus').style.display = 'none';
  document.getElementById('modalConfig').style.display = 'flex';
}

document.getElementById('btnConfig').addEventListener('click', openConfigModal);

document.getElementById('btnCloseConfig').addEventListener('click', () => {
  document.getElementById('modalConfig').style.display = 'none';
});

document.getElementById('modalConfig').addEventListener('click', e => {
  if (e.target === document.getElementById('modalConfig'))
    document.getElementById('modalConfig').style.display = 'none';
});

document.getElementById('configForm').addEventListener('submit', e => {
  e.preventDefault();
  const cfg = {
    publicKey:  document.getElementById('cfgPublicKey').value.trim(),
    serviceId:  document.getElementById('cfgServiceId').value.trim(),
    templateId: document.getElementById('cfgTemplateId').value.trim(),
  };
  const statusEl = document.getElementById('cfgStatus');

  if (!cfg.publicKey || !cfg.serviceId || !cfg.templateId) {
    statusEl.textContent = 'Completa los tres campos.';
    statusEl.className = 'config-status config-error';
    statusEl.style.display = 'block';
    return;
  }

  saveEmailConfig(cfg);
  emailjs.init(cfg.publicKey);
  statusEl.textContent = 'Configuracion guardada correctamente. El envio de correos ya esta activo.';
  statusEl.className = 'config-status config-ok';
  statusEl.style.display = 'block';
  setTimeout(() => {
    document.getElementById('modalConfig').style.display = 'none';
  }, 2000);
});

let ventas = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
let editingId = null;
let deleteId = null;
let sortCol = 'fecha';
let sortAsc = false;

const form = document.getElementById('ventaForm');
const tablaBody = document.getElementById('tablaBody');
const emptyState = document.getElementById('emptyState');
const tableFooter = document.getElementById('tableFooter');
const busqueda = document.getElementById('busqueda');
const filtroEstado = document.getElementById('filtroEstado');
const btnGuardar = document.getElementById('btnGuardar');
const btnCancelar = document.getElementById('btnCancelar');
const modalConfirm = document.getElementById('modalConfirm');
const btnConfirmDelete = document.getElementById('btnConfirmDelete');
const btnCancelDelete = document.getElementById('btnCancelDelete');
const btnExportar = document.getElementById('btnExportar');

document.getElementById('fecha').valueAsDate = new Date();

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ventas));
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function formatMoney(n) {
  return '$' + Number(n).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(d) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

function badgeClass(estado) {
  if (estado === 'Pagado') return 'badge-success';
  if (estado === 'Pendiente') return 'badge-warning';
  return 'badge-danger';
}

function updateStats(lista) {
  const pagadas = lista.filter(v => v.estado === 'Pagado');
  const total = pagadas.reduce((s, v) => s + v.total, 0);
  const n = lista.length;
  const promedio = n > 0 ? lista.reduce((s, v) => s + v.total, 0) / n : 0;

  document.getElementById('totalVentas').textContent = formatMoney(total);
  document.getElementById('totalTransacciones').textContent = n;
  document.getElementById('promedioVenta').textContent = formatMoney(promedio);
}

function getFiltered() {
  const q = busqueda.value.toLowerCase().trim();
  const est = filtroEstado.value;
  return ventas.filter(v => {
    const matchQ = !q || [v.cliente, v.producto, v.categoria, v.notas].some(f => f && f.toLowerCase().includes(q));
    const matchE = !est || v.estado === est;
    return matchQ && matchE;
  });
}

function getSorted(lista) {
  return [...lista].sort((a, b) => {
    let va = a[sortCol], vb = b[sortCol];
    if (sortCol === 'total' || sortCol === 'cantidad' || sortCol === 'precio') {
      va = Number(va); vb = Number(vb);
    } else {
      va = String(va || '').toLowerCase();
      vb = String(vb || '').toLowerCase();
    }
    if (va < vb) return sortAsc ? -1 : 1;
    if (va > vb) return sortAsc ? 1 : -1;
    return 0;
  });
}

function renderTable() {
  const filtered = getSorted(getFiltered());
  tablaBody.innerHTML = '';

  if (filtered.length === 0) {
    emptyState.classList.add('visible');
    tableFooter.style.display = 'none';
  } else {
    emptyState.classList.remove('visible');
    tableFooter.style.display = 'flex';
  }

  filtered.forEach(v => {
    const tr = document.createElement('tr');
    if (editingId === v.id) tr.classList.add('editing');
    tr.innerHTML = `
      <td>${formatDate(v.fecha)}</td>
      <td>${escHtml(v.cliente)}</td>
      <td>${escHtml(v.producto)}</td>
      <td>${escHtml(v.categoria)}</td>
      <td>${v.cantidad}</td>
      <td>${formatMoney(v.precio)}</td>
      <td><strong>${formatMoney(v.total)}</strong></td>
      <td><span class="badge ${badgeClass(v.estado)}">${v.estado}</span></td>
      <td>${escHtml(v.notas || '')}</td>
      <td class="td-actions">
        <button class="btn btn-outline btn-icon" onclick="editarVenta('${v.id}')">Editar</button>
        <button class="btn btn-icon" style="background:var(--danger-light);color:#991b1b;border:none;" onclick="confirmarEliminar('${v.id}')">Eliminar</button>
      </td>
    `;
    tablaBody.appendChild(tr);
  });

  const totalFiltrado = filtered.reduce((s, v) => s + (v.estado !== 'Cancelado' ? v.total : 0), 0);
  document.getElementById('countInfo').textContent = `${filtered.length} registro${filtered.length !== 1 ? 's' : ''}`;
  document.getElementById('totalFiltrado').textContent = formatMoney(totalFiltrado);

  updateStats(ventas);
  renderChart();
}

function escHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

form.addEventListener('submit', e => {
  e.preventDefault();
  const cantidad = parseFloat(document.getElementById('cantidad').value);
  const precio = parseFloat(document.getElementById('precio').value);
  const venta = {
    id: editingId || genId(),
    fecha: document.getElementById('fecha').value,
    cliente: document.getElementById('cliente').value.trim(),
    producto: document.getElementById('producto').value.trim(),
    categoria: document.getElementById('categoria').value,
    cantidad,
    precio,
    total: cantidad * precio,
    estado: document.getElementById('estado').value,
    notas: document.getElementById('notas').value.trim(),
  };

  if (editingId) {
    const idx = ventas.findIndex(v => v.id === editingId);
    if (idx !== -1) ventas[idx] = venta;
    editingId = null;
    btnGuardar.textContent = 'Registrar Venta';
    btnCancelar.style.display = 'none';
    showToast('Venta actualizada correctamente.');
  } else {
    ventas.unshift(venta);
    showToast('Venta registrada correctamente.');
  }

  saveData();
  form.reset();
  document.getElementById('fecha').valueAsDate = new Date();
  document.getElementById('cantidad').value = 1;
  renderTable();
});

function editarVenta(id) {
  const v = ventas.find(v => v.id === id);
  if (!v) return;
  editingId = id;
  document.getElementById('fecha').value = v.fecha;
  document.getElementById('cliente').value = v.cliente;
  document.getElementById('producto').value = v.producto;
  document.getElementById('categoria').value = v.categoria;
  document.getElementById('cantidad').value = v.cantidad;
  document.getElementById('precio').value = v.precio;
  document.getElementById('estado').value = v.estado;
  document.getElementById('notas').value = v.notas || '';
  btnGuardar.textContent = 'Guardar Cambios';
  btnCancelar.style.display = 'inline-flex';
  document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth' });
  renderTable();
}

btnCancelar.addEventListener('click', () => {
  editingId = null;
  form.reset();
  document.getElementById('fecha').valueAsDate = new Date();
  document.getElementById('cantidad').value = 1;
  btnGuardar.textContent = 'Registrar Venta';
  btnCancelar.style.display = 'none';
  renderTable();
});

function confirmarEliminar(id) {
  deleteId = id;
  modalConfirm.style.display = 'flex';
}

btnConfirmDelete.addEventListener('click', () => {
  if (deleteId) {
    ventas = ventas.filter(v => v.id !== deleteId);
    saveData();
    renderTable();
    showToast('Venta eliminada.');
  }
  deleteId = null;
  modalConfirm.style.display = 'none';
});

btnCancelDelete.addEventListener('click', () => {
  deleteId = null;
  modalConfirm.style.display = 'none';
});

modalConfirm.addEventListener('click', e => {
  if (e.target === modalConfirm) {
    deleteId = null;
    modalConfirm.style.display = 'none';
  }
});

busqueda.addEventListener('input', renderTable);
filtroEstado.addEventListener('change', renderTable);

document.querySelectorAll('th[data-col]').forEach(th => {
  th.addEventListener('click', () => {
    const col = th.dataset.col;
    if (sortCol === col) {
      sortAsc = !sortAsc;
    } else {
      sortCol = col;
      sortAsc = true;
    }
    renderTable();
  });
});

btnExportar.addEventListener('click', () => {
  const filtered = getSorted(getFiltered());
  if (filtered.length === 0) { showToast('No hay datos para exportar.'); return; }

  const headers = ['Fecha', 'Cliente', 'Producto', 'Categoría', 'Cantidad', 'Precio Unit.', 'Total', 'Estado', 'Notas'];
  const rows = filtered.map(v => [
    formatDate(v.fecha), v.cliente, v.producto, v.categoria,
    v.cantidad, v.precio, v.total, v.estado, v.notas || ''
  ].map(c => `"${String(c).replace(/"/g, '""')}"`).join(','));

  const csv = [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ventas_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Archivo CSV exportado.');
});

let toastTimer;
function showToast(msg) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}

const emptyChart = document.getElementById('emptyChart');
let chartInstance = null;

const CHART_COLORS = [
  '#6c63ff','#f59e0b','#22c55e','#ef4444','#3b82f6',
  '#ec4899','#14b8a6','#f97316','#8b5cf6','#06b6d4',
  '#84cc16','#e11d48','#0ea5e9'
];

function renderChart() {
  const ctx = document.getElementById('chartCategorias');
  const activas = ventas.filter(v => v.estado !== 'Cancelado');

  const totalesPorCat = {};
  activas.forEach(v => {
    totalesPorCat[v.categoria] = (totalesPorCat[v.categoria] || 0) + v.total;
  });

  const labels = Object.keys(totalesPorCat);
  const data = Object.values(totalesPorCat);

  if (labels.length === 0) {
    ctx.style.display = 'none';
    emptyChart.classList.add('visible');
    if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
    return;
  }

  ctx.style.display = 'block';
  emptyChart.classList.remove('visible');

  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Total vendido ($)',
        data,
        backgroundColor: labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length] + 'cc'),
        borderColor: labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
        borderWidth: 2,
        borderRadius: 8,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ' ' + formatMoney(ctx.parsed.y)
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { size: 12 }, color: '#6b7280' }
        },
        y: {
          grid: { color: '#f3f4f6' },
          ticks: {
            font: { size: 12 },
            color: '#6b7280',
            callback: v => '$' + v.toLocaleString('es-ES')
          }
        }
      }
    }
  });
}

document.getElementById('btnLogout').addEventListener('click', () => {
  sessionStorage.removeItem(SESSION_KEY);
  showLogin();
  document.getElementById('loginForm').reset();
  document.getElementById('loginError').style.display = 'none';
});

renderTable();
renderChart();
