import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// === CLOUDINARY CONFIG ===
const cloudName = "dy078qdw0";
const unsignedPreset = "unsigned_preset";

// === FIREBASE CONFIG ===
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

// === DISCORD WEBHOOK (EXPOSED) ===
const discordWebhook = "https://discord.com/api/webhooks/1375755451349864469/UI5o8syY75PCZh5lU7RNduWuTuqB9X0nIXX1j9yI5sqPu-E7Q95A3YbZvRVIBd5tDat0";

// === REDIRECT IF NOT SIGNED IN ===
onAuthStateChanged(auth, (user) => {
  if (!user) window.location.href = "login.html";
  else loadApprovedSongs();
});

// === HANDLE UPLOAD ===
const uploadForm = document.getElementById("uploadForm");
const songList = document.getElementById("songList");

uploadForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const artist = document.getElementById("artist").value.trim();
  const title = document.getElementById("title").value.trim();
  const file = document.getElementById("fileInput").files[0];

  if (!file || !/\.mp3$|\.wav$/i.test(file.name)) {
    alert("Only MP3 or WAV files allowed.");
    return;
  }

  try {
    // === UPLOAD TO CLOUDINARY ===
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", unsignedPreset);

    const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
      method: "POST",
      body: formData
    });

    const cloudData = await cloudRes.json();
    const fileURL = cloudData.secure_url;

    // === ADD TO FIRESTORE 'pending' ===
    await addDoc(collection(db, "pending"), {
      artist,
      title,
      fileURL,
      uploadedAt: Date.now()
    });

    // === SEND TO DISCORD ===
    await fetch(discordWebhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: `🎧 **New Track Uploaded!**\n**${title}** by *${artist}*`,
        embeds: [
          {
            title: title,
            description: `Uploaded by ${artist}`,
            url: fileURL,
            fields: [
              {
                name: "Moderation",
                value: `Manually review this track in Firestore:\n👉 [Go to Pending](https://console.firebase.google.com/project/spotcloud-b84f0/firestore/data/~2Fpending)`
              }
            ]
          }
        ]
      })
    });

    alert("Upload submitted for moderation!");
    uploadForm.reset();
  } catch (err) {
    console.error(err);
    alert("Something went wrong while uploading.");
  }
});

// === LOAD APPROVED TRACKS ===
async function loadApprovedSongs() {
  const q = query(collection(db, "approved"), orderBy("uploadedAt", "desc"));
  const snap = await getDocs(q);
  songList.innerHTML = "";

  snap.forEach(doc => {
    const { artist, title, fileURL } = doc.data();
    const div = document.createElement("div");
    div.className = "song";
    div.innerHTML = `
      <strong>${title}</strong><br>
      <em>${artist}</em><br>
      <audio controls src="${fileURL}"></audio>
    `;
    songList.appendChild(div);
  });
}
