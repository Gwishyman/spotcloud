import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

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

// Redirect to login if not signed in
onAuthStateChanged(auth, (user) => {
  if (!user) window.location.href = "login.html";
  else loadApprovedSongs();
});

const uploadForm = document.getElementById("uploadForm");
const songList = document.getElementById("songList");

uploadForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const artist = document.getElementById("artist").value.trim();
  const title = document.getElementById("title").value.trim();
  const file = document.getElementById("fileInput").files[0];

  if (!file || !/\.mp3$|\.wav$/i.test(file.name)) {
    alert("Only MP3 or WAV files are allowed.");
    return;
  }

  const filePath = `tracks/${Date.now()}_${file.name}`;
  const fileRef = ref(storage, filePath);
  await uploadBytes(fileRef, file);
  const fileURL = await getDownloadURL(fileRef);

  await addDoc(collection(db, "pending"), {
    artist,
    title,
    fileURL,
    uploadedAt: Date.now()
  });

  sendToDiscord(artist, title, fileURL);
  alert("Upload submitted for moderation!");
  uploadForm.reset();
});

// Base64 webhook decoding
function decodeWebhook(b64) {
  return atob(b64);
}

const base64Webhook = "aHR0cHM6Ly9kaXNjb3JkLmNvbS9hcGkvd2ViaG9va3MvMTM3NTc1NTQ1MTM0OTg2NDQ2OS9VSTVvOHN5WTc1UENaaDVsdTdSTmR1V3VUdVE5WDBuSVhYMWo5eUk1c3FQdS1FN1E5NUEzWWJadlJWSUI1dERhdDA=";

async function sendToDiscord(artist, title, fileURL) {
  const webhook = decodeWebhook(base64Webhook);
  const payload = {
    content: `🎧 **New Track Uploaded!**\n**${title}** by *${artist}*`,
    embeds: [
      {
        title: title,
        description: `Uploaded by ${artist}`,
        url: fileURL
      }
    ]
  };

  try {
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.error("Failed to send to Discord:", err);
  }
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
