
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, push, onChildAdded }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// Your Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyDjECokL0pLFwuhgcfPkECfsKWoSAqQYcw",
  authDomain: "temu-dc.firebaseapp.com",
  databaseURL: "https://temu-dc-default-rtdb.firebaseio.com",
  projectId: "temu-dc",
  storageBucket: "temu-dc.firebasestorage.app",
  messagingSenderId: "796652238576",
  appId: "1:796652238576:web:14db5d70b219f4d2f88371",
  measurementId: "G-MJ4TM8M6ME"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth();
const provider = new GoogleAuthProvider();

// HTML elements
const loginScreen = document.getElementById("login-screen");
const appDiv = document.getElementById("app");
const googleLogin = document.getElementById("googleLogin");
const logoutBtn = document.getElementById("logout");
const msgInput = document.getElementById("msgInput");
const sendBtn = document.getElementById("sendBtn");
const messagesDiv = document.getElementById("messages");

// Active channel
let channel = "general";

// Google Login
googleLogin.onclick = () => {
  signInWithPopup(auth, provider);
};

// Logout
logoutBtn.onclick = () => {
  signOut(auth);
};

// Auth state listener
auth.onAuthStateChanged(user => {
  if (user) {
    loginScreen.classList.add("hidden");
    appDiv.classList.remove("hidden");

    document.getElementById("user-pfp").src = user.photoURL;
    document.getElementById("user-name").textContent = user.displayName;

    loadMessages();
  } else {
    loginScreen.classList.remove("hidden");
    appDiv.classList.add("hidden");
  }
});

// Load messages
function loadMessages() {
  messagesDiv.innerHTML = "";

  const msgRef = ref(db, "channels/" + channel);
  onChildAdded(msgRef, data => {
    const msg = data.val();
    addMessage(msg.username, msg.text);
  });
}

// Display message
function addMessage(username, text) {
  const div = document.createElement("div");
  div.classList.add("message");
  div.innerHTML = `<span class="username">${username}:</span> ${text}`;
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Send message
sendBtn.onclick = () => {
  const user = auth.currentUser;
  if (!user) return;

  if (msgInput.value.trim() === "") return;

  push(ref(db, "channels/" + channel), {
    username: user.displayName,
    text: msgInput.value,
    time: Date.now()
  });

  msgInput.value = "";
};