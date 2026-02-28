const DB_CFG_KEY = 'ventas_firebase';

window._db = null;

function getFirebaseConfig() {
  const raw = localStorage.getItem(DB_CFG_KEY);
  return raw ? JSON.parse(raw) : null;
}

function saveFirebaseConfig(cfg) {
  localStorage.setItem(DB_CFG_KEY, JSON.stringify(cfg));
}

function isFirebaseReady() {
  return window._db !== null;
}

function initFirebase() {
  const cfg = getFirebaseConfig();
  if (!cfg || !cfg.apiKey || !cfg.projectId) return false;
  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(cfg);
    }
    window._db = firebase.firestore();
    return true;
  } catch (e) {
    console.error('Firebase init error:', e);
    return false;
  }
}

initFirebase();

// ── Ventas ────────────────────────────────────────────────────────────────
async function dbGetVentas() {
  if (!window._db) {
    return JSON.parse(localStorage.getItem('ventas_data') || '[]');
  }
  try {
    const snap = await window._db.collection('ventas').get();
    const data = snap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    data.sort((a, b) => (b.fecha > a.fecha ? 1 : -1));
    localStorage.setItem('ventas_data', JSON.stringify(data));
    return data;
  } catch (e) {
    console.error('dbGetVentas error:', e);
    return JSON.parse(localStorage.getItem('ventas_data') || '[]');
  }
}

async function dbSaveVenta(venta) {
  if (!window._db) return;
  try {
    await window._db.collection('ventas').doc(venta.id).set(venta);
  } catch (e) {
    console.error('dbSaveVenta error:', e);
  }
}

async function dbDeleteVenta(id) {
  if (!window._db) return;
  try {
    await window._db.collection('ventas').doc(id).delete();
  } catch (e) {
    console.error('dbDeleteVenta error:', e);
  }
}

// ── Usuarios ──────────────────────────────────────────────────────────────
async function dbGetUsers() {
  const defaultUsers = [{ user: 'admin', email: '', pass: '1234' }];
  if (!window._db) {
    const raw = localStorage.getItem('ventas_users');
    return raw ? JSON.parse(raw) : defaultUsers;
  }
  try {
    const snap = await window._db.collection('usuarios').get();
    if (snap.empty) {
      const local = localStorage.getItem('ventas_users');
      const users = local ? JSON.parse(local) : defaultUsers;
      for (const u of users) {
        await window._db.collection('usuarios').doc(u.user).set(u);
      }
      return users;
    }
    const data = snap.docs.map(doc => doc.data());
    localStorage.setItem('ventas_users', JSON.stringify(data));
    return data;
  } catch (e) {
    console.error('dbGetUsers error:', e);
    const raw = localStorage.getItem('ventas_users');
    return raw ? JSON.parse(raw) : defaultUsers;
  }
}

async function dbSaveUser(user) {
  const raw = localStorage.getItem('ventas_users');
  const users = raw ? JSON.parse(raw) : [];
  const idx = users.findIndex(u => u.user === user.user);
  if (idx >= 0) users[idx] = user; else users.push(user);
  localStorage.setItem('ventas_users', JSON.stringify(users));
  if (!window._db) return;
  try {
    await window._db.collection('usuarios').doc(user.user).set(user);
  } catch (e) {
    console.error('dbSaveUser error:', e);
  }
}

async function dbUpdateUserPass(email, newPass) {
  const raw = localStorage.getItem('ventas_users');
  const users = raw ? JSON.parse(raw) : [];
  const idx = users.findIndex(u => u.email === email);
  if (idx >= 0) {
    users[idx].pass = newPass;
    localStorage.setItem('ventas_users', JSON.stringify(users));
    if (window._db) {
      try {
        await window._db.collection('usuarios').doc(users[idx].user).update({ pass: newPass });
      } catch (e) {
        console.error('dbUpdateUserPass error:', e);
      }
    }
  }
}
