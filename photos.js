// Photo storage, Spark-plan (free) friendly: images are resized/compressed
// client-side and stored as a base64 data URL directly inside the Firestore
// document. Firestore's free tier just needs each document to stay under
// 1MB, so we compress toward a byte budget that leaves headroom for the
// rest of the fields. No Firebase Storage (and no billing upgrade) needed.

import { db } from './firebase-config.js';
import {
  collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const MAX_INPUT_BYTES = 20 * 1024 * 1024; // reject absurdly large source files
const TARGET_DATA_URL_BYTES = 700 * 1024; // leaves headroom under Firestore's 1MB doc cap
const MAX_DIMENSION = 1600; // longest edge, px

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

// Resizes to at most MAX_DIMENSION on the long edge, then steps JPEG quality
// down until the resulting data URL fits the target byte budget.
export async function compressImageToDataURL(file) {
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error('That image is too large (max 20MB). Try a smaller file.');
  }
  const img = await loadImage(file);
  let { width, height } = img;
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const scale = MAX_DIMENSION / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, width, height);
  URL.revokeObjectURL(img.src);

  let quality = 0.85;
  let dataUrl = canvas.toDataURL('image/jpeg', quality);
  while (dataUrl.length > TARGET_DATA_URL_BYTES && quality > 0.35) {
    quality -= 0.1;
    dataUrl = canvas.toDataURL('image/jpeg', quality);
  }
  // If still too big even at low quality, shrink dimensions further and retry once.
  if (dataUrl.length > TARGET_DATA_URL_BYTES) {
    const scale = 0.7;
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    quality = 0.6;
    dataUrl = canvas.toDataURL('image/jpeg', quality);
    while (dataUrl.length > TARGET_DATA_URL_BYTES && quality > 0.3) {
      quality -= 0.1;
      dataUrl = canvas.toDataURL('image/jpeg', quality);
    }
  }
  if (dataUrl.length > TARGET_DATA_URL_BYTES) {
    throw new Error('Could not compress this image enough to save it. Try a smaller or simpler photo.');
  }
  return dataUrl;
}

export async function createPhoto(data) {
  const docRef = await addDoc(collection(db, 'photos'), data);
  return docRef.id;
}

export async function fetchAllPhotos() {
  const q = query(collection(db, 'photos'), orderBy('created_date', 'desc'));
  const snap = await getDocs(q);
  const out = [];
  snap.forEach((d) => out.push({ id: d.id, ...d.data() }));
  return out;
}

export async function bumpViews(photoId, newViewCount) {
  await updateDoc(doc(db, 'photos', photoId), { views: newViewCount });
}

export async function deletePhoto(photoId) {
  await deleteDoc(doc(db, 'photos', photoId));
}
