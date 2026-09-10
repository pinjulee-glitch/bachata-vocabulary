// Storage backend for the move library (structure + video links) and each
// friend's practice progress (learned / focus) — backed by Firebase
// Firestore so everyone sees the same shared data in real time.
//
// This is the ONLY file app.js depends on for persistence, so this is the
// one place a future storage change (e.g. adding auth-based write rules)
// needs to happen.

const firebaseConfig = {
  apiKey: "AIzaSyCgzSwI57jiB7_yk3bTaCSpr3Pi4zE_tU0",
  authDomain: "pjbachata.firebaseapp.com",
  projectId: "pjbachata",
  storageBucket: "pjbachata.firebasestorage.app",
  messagingSenderId: "1022236063092",
  appId: "1:1022236063092:web:efbcc1893332d82b6a6821",
  measurementId: "G-2JZH945DRW"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const Backend = {
  mode: 'firebase',

  watchStructure(cb){
    const ref = db.collection('library').doc('structure');
    ref.onSnapshot((snap) => {
      if(snap.exists && Array.isArray(snap.data().categories)){
        cb(snap.data().categories);
      } else {
        ref.set({ categories: SEED_CATEGORIES }).catch((e) => console.error('seed failed', e));
        cb(deepClone(SEED_CATEGORIES));
      }
    }, (err) => {
      console.error('structure watch failed', err);
      cb(deepClone(SEED_CATEGORIES));
    });
  },

  setStructure(categories){
    db.collection('library').doc('structure').set({ categories }).catch((e) => console.error('setStructure failed', e));
  },

  watchProgress(profileId, cb){
    const ref = db.collection('progress').doc(profileId);
    ref.onSnapshot((snap) => {
      const data = snap.exists ? snap.data() : {};
      cb({ learned: data.learned || {}, focus: data.focus || {} });
    }, () => {
      cb({ learned: {}, focus: {} });
    });
  },

  updateProgress(profileId, patch){
    const ref = db.collection('progress').doc(profileId);
    const updateObj = {};
    if(patch.learned) Object.entries(patch.learned).forEach(([k, v]) => { updateObj['learned.' + k] = v; });
    if(patch.focus) Object.entries(patch.focus).forEach(([k, v]) => { updateObj['focus.' + k] = v; });
    ref.update(updateObj).catch(() => {
      const fallback = {};
      if(patch.learned) fallback.learned = patch.learned;
      if(patch.focus) fallback.focus = patch.focus;
      ref.set(fallback, { merge: true }).catch((e) => console.error('updateProgress failed', e));
    });
  }
};

function deepClone(x){
  return JSON.parse(JSON.stringify(x));
}
