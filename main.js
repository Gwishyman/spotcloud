import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-functions.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAiYRqZGkz4_uccAY7SFE7nLglhiIqxrzM",
  authDomain: "spotcloud-b84f0.firebaseapp.com",
  projectId: "spotcloud-b84f0",
  storageBucket: "spotcloud-b84f0.appspot.com",
  messagingSenderId: "331449666085",
  appId: "1:331449666085:web:4911fccd73799b9dec0dcc"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app);

const uploadForm = document.getElementById("uploadForm");
const songList = document.getElementById("songList");

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
  } else {
    loadApprovedSongs();
  }
});

uploadForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const artist = document.getElementById("artist").value;
  const title = document.getElementById("title").value;
  const file = document.getElementById("fileInput").files[0];
  if (!file || !/\.mp3$|\.wav$/i.test(file.name)) return alert("MP3 or WAV only");

  const filePath = `tracks/${Date.now()}_${file.name}`;
  const fileRef = ref(storage, filePath);
  await uploadBytes(fileRef, file);
  const fileURL = await getDownloadURL(fileRef);

  const docRef = await addDoc(collection(db, "tracks"), {
    artist,
    title,
    fileURL,
    filePath,
    uploadedAt: Date.now()
  });

  const encrypted = await encryptData({ artist, title, fileURL, id: docRef.id });
  const sendToDiscord = httpsCallable(functions, "sendToDiscord");
  await sendToDiscord({ encrypted });

  alert("Sent to moderation. Waiting for approval.");
  uploadForm.reset();
});

async function encryptData(data) {
  const json = JSON.stringify(data);
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw", new TextEncoder().encode("encryption-secret"),
    "AES-CTR", false, ["encrypt"]
  );
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-CTR", counter: new Uint8Array(16), length: 64 },
    keyMaterial, new TextEncoder().encode(json)
  );
  return [...new Uint8Array(encrypted)].map(b => b.toString(16).padStart(2, "0")).join("");
}

async function loadApprovedSongs() {
  const q = query(collection(db, "approved"), orderBy("uploadedAt", "desc"));
  const snap = await getDocs(q);
  songList.innerHTML = "";
  snap.forEach(doc => {
    const { artist, title, fileURL } = doc.data();
    const div = document.createElement("div");
    div.className = "song";
    div.innerHTML = `<strong>${title}</strong><br><em>${artist}</em><br><audio controls src="${fileURL}"></audio>`;
    songList.appendChild(div);
  });
  }
