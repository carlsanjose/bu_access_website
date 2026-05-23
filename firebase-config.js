/**
 * firebase-config.js
 * ─────────────────────────────────────────────────────────────
 * Single shared Firebase module for BU ACCeSS.
 * Every page (public + admin) loads this via:
 *
 *   <script type="module" src="../firebase-config.js"></script>
 *   or
 *   <script type="module" src="firebase-config.js"></script>
 *
 * Exports:
 *   db        — Firestore instance
 *   auth      — Firebase Auth instance
 *   COLS      — Firestore collection name constants
 *   getAll    — fetch all docs from a collection
 *   getDoc    — fetch a single doc by ID
 *   setDoc    — create or overwrite a doc by ID
 *   addDoc    — create a doc with auto-generated ID
 *   updateDoc — partially update a doc by ID
 *   deleteDoc — delete a doc by ID
 *   onSnapshot— real-time listener helper
 *   timestamp — Firestore server timestamp
 *   loginWithEmail   — sign in with email + password
 *   logoutUser       — sign out current user
 *   onAuthChange     — subscribe to auth state changes
 *   getCurrentUser   — return current user or null
 * ─────────────────────────────────────────────────────────────
 */

// ── Firebase SDK (loaded from CDN — no build step needed) ──
import { initializeApp }                          from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore,
         collection, doc,
         getDocs, getDoc as fsGetDoc,
         setDoc as fsSetDoc,
         addDoc as fsAddDoc,
         updateDoc as fsUpdateDoc,
         deleteDoc as fsDeleteDoc,
         onSnapshot as fsOnSnapshot,
         serverTimestamp, query, orderBy, where }  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth,
         signInWithEmailAndPassword,
         signOut,
         onAuthStateChanged }                      from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ── Your Firebase project config ──────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyBvR22RrwAuhwlrNgfRZyaWXEOD-uu3qfs",
  authDomain:        "bu-access-wesbite.firebaseapp.com",
  projectId:         "bu-access-wesbite",
  storageBucket:     "bu-access-wesbite.firebasestorage.app",
  messagingSenderId: "1072015753651",
  appId:             "1:1072015753651:web:023be3458965a4f7040bc6"
};

// ── Initialize ─────────────────────────────────────────────────
const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);
const auth = getAuth(app);

// ── Collection name constants ──────────────────────────────────
// Change these if you rename collections in Firestore.
const COLS = {
  EVENTS:    "events",
  NEWS:      "news",
  DIRECTORY: "directory",
  TERMS:     "terms",
  SETTINGS:  "settings",
  ACTIVITY:  "activity",
};

// ── Firestore helpers ──────────────────────────────────────────

/**
 * Fetch all documents from a collection.
 * Returns an array of objects, each with an `id` field.
 * @param {string} colName
 * @param {{ orderByField?: string, orderDir?: 'asc'|'desc' }} [opts]
 */
async function getAll(colName, opts = {}) {
  try {
    const ref = collection(db, colName);
    const q   = opts.orderByField
      ? query(ref, orderBy(opts.orderByField, opts.orderDir || 'asc'))
      : ref;
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error(`[ACCeSS] getAll(${colName}) failed:`, err);
    return [];
  }
}

/**
 * Fetch a single document by ID.
 * Returns the object with an `id` field, or null if not found.
 * @param {string} colName
 * @param {string} docId
 */
async function getOne(colName, docId) {
  try {
    const snap = await fsGetDoc(doc(db, colName, docId));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (err) {
    console.error(`[ACCeSS] getOne(${colName}/${docId}) failed:`, err);
    return null;
  }
}

/**
 * Create or fully overwrite a document with a specific ID.
 * @param {string} colName
 * @param {string} docId
 * @param {object} data
 */
async function setDocument(colName, docId, data) {
  try {
    await fsSetDoc(doc(db, colName, docId), data);
    return true;
  } catch (err) {
    console.error(`[ACCeSS] setDocument(${colName}/${docId}) failed:`, err);
    return false;
  }
}

/**
 * Add a new document with an auto-generated Firestore ID.
 * Returns the new document ID, or null on failure.
 * @param {string} colName
 * @param {object} data
 */
async function addDocument(colName, data) {
  try {
    const ref = await fsAddDoc(collection(db, colName), data);
    return ref.id;
  } catch (err) {
    console.error(`[ACCeSS] addDocument(${colName}) failed:`, err);
    return null;
  }
}

/**
 * Partially update fields on an existing document.
 * @param {string} colName
 * @param {string} docId
 * @param {object} data — only the fields to update
 */
async function updateDocument(colName, docId, data) {
  try {
    await fsUpdateDoc(doc(db, colName, docId), data);
    return true;
  } catch (err) {
    console.error(`[ACCeSS] updateDocument(${colName}/${docId}) failed:`, err);
    return false;
  }
}

/**
 * Delete a document by ID.
 * @param {string} colName
 * @param {string} docId
 */
async function deleteDocument(colName, docId) {
  try {
    await fsDeleteDoc(doc(db, colName, docId));
    return true;
  } catch (err) {
    console.error(`[ACCeSS] deleteDocument(${colName}/${docId}) failed:`, err);
    return false;
  }
}

/**
 * Subscribe to real-time updates on a collection.
 * Returns an unsubscribe function — call it to stop listening.
 * @param {string} colName
 * @param {function} callback — receives array of docs on every change
 * @param {{ orderByField?: string, orderDir?: 'asc'|'desc' }} [opts]
 */
function listenToCollection(colName, callback, opts = {}) {
  try {
    const ref = collection(db, colName);
    const q   = opts.orderByField
      ? query(ref, orderBy(opts.orderByField, opts.orderDir || 'asc'))
      : ref;
    return fsOnSnapshot(q, snap => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => {
      console.error(`[ACCeSS] listenToCollection(${colName}) error:`, err);
    });
  } catch (err) {
    console.error(`[ACCeSS] listenToCollection(${colName}) setup failed:`, err);
    return () => {};
  }
}

/**
 * Server timestamp — use this for createdAt / updatedAt fields.
 * Firestore fills in the real server time when the doc is written.
 */
function timestamp() {
  return serverTimestamp();
}

// ── Auth helpers ───────────────────────────────────────────────

/**
 * Sign in with email and password.
 * Returns { user } on success, { error } on failure.
 * @param {string} email
 * @param {string} password
 */
async function loginWithEmail(email, password) {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return { user: cred.user };
  } catch (err) {
    return { error: err.code };
  }
}

/**
 * Sign out the current user.
 */
async function logoutUser() {
  try {
    await signOut(auth);
    return true;
  } catch (err) {
    console.error("[ACCeSS] logoutUser failed:", err);
    return false;
  }
}

/**
 * Subscribe to auth state changes.
 * Callback receives the user object (or null if signed out).
 * Returns an unsubscribe function.
 * @param {function} callback
 */
function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Return the currently signed-in user, or null.
 */
function getCurrentUser() {
  return auth.currentUser;
}

/**
 * Auth guard for admin pages.
 * Call at the top of every admin page script.
 * Redirects to login if no user is signed in.
 * @param {string} [loginPath] — relative path to login page
 */
function requireAuth(loginPath = 'index.html') {
  return new Promise(resolve => {
    const unsub = onAuthStateChanged(auth, user => {
      unsub();
      if (!user) {
        window.location.href = loginPath;
      } else {
        resolve(user);
      }
    });
  });
}

// ── Activity log helper ────────────────────────────────────────

/**
 * Write an entry to the activity log in Firestore.
 * Used by admin pages to track changes.
 * @param {string} action  — human-readable description
 * @param {string} [color] — 'blue' | 'green' | 'yellow'
 */
async function logActivity(action, color = 'blue') {
  try {
    const user = getCurrentUser();
    await fsAddDoc(collection(db, COLS.ACTIVITY), {
      actor:     user?.email || 'Admin',
      action,
      color,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    // Non-critical — silently fail
  }
}

// ── Site settings helpers ──────────────────────────────────────

/**
 * Load site settings from Firestore.
 * Falls back to defaults if the settings doc doesn't exist yet.
 */
const SETTINGS_DEFAULTS = {
  logoUrl:      'logo.png',
  siteName:     'BU ACCeSS',
  siteTagline:  'Academic Consortium of Computer Science Students',
  colorPrimary: '#0A2463',
  colorAccent:  '#F5C518',
  colorText:    '#0D1B3E',
  foundedYear:  '2015',
  college:      'Bicol University — College of Science',
  about:        'The official College Based Organization of the CS students of the College of Science, Bicol University.',
  mission:      'The Academic Consortium of Computer Science Students shall promote the sustainable development of Computer Science in Bicol University.',
  vision:       'ACCeSS members will be empowered to build comprehensive networks and prepare for the future through meaningful experiences.',
  address:      '2nd Floor, College of Science Building 2, Bicol University, Legazpi City',
  email:        'bu_access@bicol-u.edu.ph',
  phone:        '',
  facebook:     'https://www.facebook.com/BUACCeSS2015',
  instagram:    'https://www.instagram.com/bu_access/',
  twitter:      'https://twitter.com/bu_access',
  tiktok:       'https://www.tiktok.com/@bu_access',
  discord:      'https://discord.gg/RXbrhwU5Df',
  twitch:       'https://www.twitch.tv/bu_access',
  heroBg:       '',
  heroHeadline: 'Academic Consortium of<br/><em>Computer Science</em> Students',
  heroSub:      'Empowering CS students through community, sustainable development, and meaningful experiences since 2015.',
  ctaLabel:     'Join the Org',
  ctaLink:      'register.html',
  showEvents:    true,
  showNews:      true,
  showDirectory: true,
  showCounter:   true,
  showCta:       true,
};

async function loadSettings() {
  const doc = await getOne(COLS.SETTINGS, 'main');
  return { ...SETTINGS_DEFAULTS, ...(doc || {}) };
}

async function saveSettings(data) {
  return setDocument(COLS.SETTINGS, 'main', {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// ── Exports ────────────────────────────────────────────────────
export {
  db, auth, COLS,

  // Firestore CRUD
  getAll, getOne,
  setDocument, addDocument, updateDocument, deleteDocument,
  listenToCollection, timestamp,

  // Auth
  loginWithEmail, logoutUser, onAuthChange, getCurrentUser, requireAuth,

  // Helpers
  logActivity, loadSettings, saveSettings, SETTINGS_DEFAULTS,
};
