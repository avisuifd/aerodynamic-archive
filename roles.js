// User profile documents, roles (owner / screener / user), and enforced-unique
// display names, backed by Firestore.

import { db, OWNER_EMAIL } from './firebase-config.js';
import {
  doc, getDoc, setDoc, updateDoc, runTransaction,
  collection, getDocs,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

// Call once per session after a successful sign-in. Creates the user's
// Firestore profile doc the first time they're seen, and grants 'owner' to
// whichever account matches OWNER_EMAIL on its very first sign-in.
export async function ensureUserDoc(user) {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    const role = (user.email && user.email.toLowerCase() === OWNER_EMAIL.toLowerCase())
      ? 'owner' : 'user';
    const data = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || '',
      role,
      createdAt: Date.now(),
    };
    await setDoc(ref, data);
    return data;
  }
  const data = snap.data();
  if (data.email !== (user.email || '')) {
    await updateDoc(ref, { email: user.email || '' });
    data.email = user.email || '';
  }
  return data;
}

export async function getUserDoc(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
}

// Reserves a display name so only one account can hold it at a time.
// Throws if the name is already taken by someone else.
export async function reserveDisplayName(user, newName) {
  const trimmed = newName.trim();
  const key = trimmed.toLowerCase();
  if (!key) throw new Error('Display name can\'t be empty.');
  if (key.length > 60) throw new Error('Display name is too long.');

  const nameRef = doc(db, 'usernames', key);
  const userRef = doc(db, 'users', user.uid);

  await runTransaction(db, async (tx) => {
    const nameSnap = await tx.get(nameRef);
    if (nameSnap.exists() && nameSnap.data().uid !== user.uid) {
      throw new Error('That display name is already taken.');
    }
    const userSnap = await tx.get(userRef);
    const prevName = userSnap.exists() ? (userSnap.data().displayName || '') : '';
    const prevKey = prevName.trim().toLowerCase();

    if (prevKey && prevKey !== key) {
      const prevRef = doc(db, 'usernames', prevKey);
      const prevSnap = await tx.get(prevRef);
      if (prevSnap.exists() && prevSnap.data().uid === user.uid) {
        tx.delete(prevRef);
      }
    }
    tx.set(nameRef, { uid: user.uid, name: trimmed });
    tx.set(userRef, { displayName: trimmed }, { merge: true });
  });
}

// Client-side search over the users collection. Fine at small-to-medium
// scale; for a large user base this should move to a Cloud Function or a
// dedicated search index instead of pulling the whole collection.
export async function searchUsers(term) {
  const snap = await getDocs(collection(db, 'users'));
  const t = term.trim().toLowerCase();
  const out = [];
  snap.forEach((d) => {
    const u = d.data();
    if (!t || (u.displayName || '').toLowerCase().includes(t) || (u.email || '').toLowerCase().includes(t)) {
      out.push(u);
    }
  });
  out.sort((a, b) => (a.displayName || a.email || '').localeCompare(b.displayName || b.email || ''));
  return out;
}

// Only callable in the client if Firestore rules allow it — see the rules
// block in the writeup for how this is restricted to the owner account.
export async function setUserRole(uid, role) {
  await updateDoc(doc(db, 'users', uid), { role });
}