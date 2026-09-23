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

  // Returns the onSnapshot unsubscribe function so callers can stop
  // listening (e.g. on log out).
  watchProgress(profileId, cb){
    const ref = db.collection('progress').doc(profileId);
    return ref.onSnapshot((snap) => {
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
  },

  // Creates a brand-new profile doc with its name + 4-digit PIN. Only
  // called once, when a profile is first set up.
  createProfile(profileId, name, pin){
    return db.collection('progress').doc(profileId).set({
      name, pin, learned: {}, focus: {}, updatedAt: Date.now()
    }, { merge: true });
  },

  // Looks up a profile by id and checks its stored PIN. Profiles created
  // before the PIN system existed have no `pin` field — those are let
  // through so nobody gets locked out of progress they already made.
  checkProfilePin(profileId, pin){
    return db.collection('progress').doc(profileId).get().then((snap) => {
      if(!snap.exists) return { ok: false, reason: 'not_found' };
      const data = snap.data();
      if(!data.pin) return { ok: true, name: data.name };
      return { ok: data.pin === pin, name: data.name };
    });
  },

  // All profiles anyone has ever tracked progress under — used for the
  // "I already have an account" picker so a friend on a brand-new device
  // can find their name.
  listProfiles(){
    return db.collection('progress').get().then((snap) => {
      const out = [];
      snap.forEach((doc) => {
        const data = doc.data();
        if(data.name) out.push({ id: doc.id, name: data.name });
      });
      out.sort((a, b) => a.name.localeCompare(b.name));
      return out;
    });
  },

  // Admin-only: permanently removes a member's account (name, PIN, and
  // learned/focus progress).
  deleteProfile(profileId){
    return db.collection('progress').doc(profileId).delete();
  },

  // ---- Clip submissions ----
  // A clip a member uploaded that isn't in the shared library yet. It shows
  // only to whoever uploaded it until an admin approves, at which point it
  // gets copied into library/structure and becomes normal shared content.
  //
  // NOTE: this is UI-level moderation only. The database is open, so a
  // determined viewer could read others' pending clips or flip their own
  // status. Fine for a friend group; not a security boundary.
  watchSubmissions(cb){
    return db.collection('submissions').onSnapshot((snap) => {
      const out = [];
      snap.forEach(doc => out.push(Object.assign({ id: doc.id }, doc.data())));
      out.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      cb(out);
    }, (err) => {
      console.error('submissions watch failed', err);
      cb([]);
    });
  },

  addSubmission(data){
    return db.collection('submissions').add(
      Object.assign({ status: 'pending', createdAt: Date.now() }, data)
    );
  },

  setSubmissionStatus(id, status){
    return db.collection('submissions').doc(id).update({ status, decidedAt: Date.now() });
  },

  deleteSubmission(id){
    return db.collection('submissions').doc(id).delete();
  }
};

function deepClone(x){
  return JSON.parse(JSON.stringify(x));
}
