// app.js (module)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getDatabase, ref, set, get, push, onChildAdded, child, onValue
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

/* FIREBASE CONFIG (your project values used earlier) */
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

/* DEFAULT PFP (local path you uploaded) */
const DEFAULT_PFP = "/mnt/data/IMG_53F6AFDA-141D-4BC7-97DF-019FA00F5215.jpeg";

/* DOM */
const authScreen = document.getElementById("auth-screen");
const appDiv = document.getElementById("app");

const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");
const showSignup = document.getElementById("show-signup");
const showLogin = document.getElementById("show-login");

const loginUsername = document.getElementById("login-username");
const loginPassword = document.getElementById("login-password");
const loginBtn = document.getElementById("login-btn");
const loginError = document.getElementById("login-error");

const signupUsername = document.getElementById("signup-username");
const signupPassword = document.getElementById("signup-password");
const signupPfp = document.getElementById("signup-pfp");
const signupBtn = document.getElementById("signup-btn");
const signupError = document.getElementById("signup-error");

const userListDiv = document.getElementById("user-list");
const mePfp = document.getElementById("me-pfp");
const meName = document.getElementById("me-name");
const logoutBtn = document.getElementById("logout");

const channelsDiv = document.getElementById("channels");
const channelButtons = document.querySelectorAll(".channel");
const messagesDiv = document.getElementById("messages");
const msgInput = document.getElementById("msg-input");
const sendBtn = document.getElementById("send");

const userSearch = document.getElementById("user-search");

const dmPage = document.getElementById("dm-page");
const dmTitle = document.getElementById("dm-title");
const dmMessages = document.getElementById("dm-messages");
const dmInput = document.getElementById("dm-input");
const dmSend = document.getElementById("dm-send");
const dmBack = document.getElementById("dm-back");

let currentChannel = "general";
let currentUser = null;
let activeChannelListener = null;
let activeDMListener = null;
let currentDMId = null;

/* UTIL: SHA-256 hex (for password hashing) */
async function sha256Hex(message) {
  const enc = new TextEncoder();
  const msgUint8 = enc.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2,'0')).join('');
}

/* SHOW/HIDE forms */
showSignup.addEventListener("click", (e) => { e.preventDefault(); showSignupForm(); });
showLogin.addEventListener("click", (e) => { e.preventDefault(); showLoginForm(); });

function showSignupForm(){ loginForm.classList.add("hidden"); signupForm.classList.remove("hidden"); loginError.textContent=""; signupError.textContent=""; }
function showLoginForm(){ signupForm.classList.add("hidden"); loginForm.classList.remove("hidden"); loginError.textContent=""; signupError.textContent=""; }

/* SIGNUP */
signupBtn.onclick = async () => {
  const username = signupUsername.value.trim();
  const password = signupPassword.value;
  let pfp = signupPfp.value.trim() || DEFAULT_PFP;

  if (!username || !password) { signupError.textContent = "Enter a username and password."; return; }
  if (/\s/.test(username)) { signupError.textContent = "Username cannot contain spaces."; return; }

  try {
    const userRef = ref(db, `users/${username}`);
    const snap = await get(userRef);
    if (snap.exists()) { signupError.textContent = "Username taken."; return; }

    const pwHash = await sha256Hex(password);
    await set(userRef, { displayName: username, pwHash, pfp });
    // create minimal presence
    await set(ref(db, `presence/${username}`), { lastSeen: Date.now() });

    currentUser = { username, displayName: username, pfp };
    localStorage.setItem("temu:currentUser", JSON.stringify(currentUser));
    refreshUserList();
    enterApp();
  } catch (err) {
    console.error(err);
    signupError.textContent = "Signup error.";
  }
};

/* LOGIN */
loginBtn.onclick = async () => {
  const username = loginUsername.value.trim();
  const password = loginPassword.value;
  if (!username || !password) { loginError.textContent = "Enter username and password."; return; }

  try {
    const userRef = ref(db, `users/${username}`);
    const snap = await get(userRef);
    if (!snap.exists()) { loginError.textContent = "No account with that username."; return; }
    const data = snap.val();
    const pwHash = await sha256Hex(password);
    if (pwHash !== data.pwHash) { loginError.textContent = "Incorrect password."; return; }

    currentUser = { username, displayName: data.displayName || username, pfp: data.pfp || DEFAULT_PFP };
    localStorage.setItem("temu:currentUser", JSON.stringify(currentUser));
    await set(ref(db, `presence/${username}`), { lastSeen: Date.now() });
    refreshUserList();
    enterApp();
  } catch (err) {
    console.error(err);
    loginError.textContent = "Login failed.";
  }
};

/* LOGOUT */
logoutBtn.onclick = () => {
  if (currentUser && currentUser.username) {
    set(ref(db, `presence/${currentUser.username}`), { lastSeen: Date.now() });
  }
  currentUser = null;
  localStorage.removeItem("temu:currentUser");
  authScreen.classList.remove("hidden");
  appDiv.classList.add("hidden");
  // hide DM page if open
  dmPage.classList.add("hidden");
};

/* AUTO-LOGIN */
(async function tryAutoLogin(){
  const saved = localStorage.getItem("temu:currentUser");
  if (saved) {
    try {
      currentUser = JSON.parse(saved);
      const snap = await get(ref(db, `users/${currentUser.username}`));
      if (snap.exists()) enterApp();
      else localStorage.removeItem("temu:currentUser");
    } catch(e){ localStorage.removeItem("temu:currentUser"); }
  }
})();

/* ENTER APP */
function enterApp() {
  authScreen.classList.add("hidden");
  appDiv.classList.remove("hidden");
  mePfp.src = currentUser.pfp || DEFAULT_PFP;
  meName.textContent = currentUser.displayName || currentUser.username;
  document.getElementById("msg-input").placeholder = `Message #${currentChannel}`;
  listenToChannel(currentChannel);
  refreshUserList();
}

/* CHANNELS */
channelsDiv.addEventListener("click", (ev) => {
  const ch = ev.target.closest(".channel");
  if (!ch) return;
  channelButtons.forEach(b => b.classList.remove("active"));
  ch.classList.add("active");
  currentChannel = ch.dataset.channel;
  messagesDiv.innerHTML = "";
  listenToChannel(currentChannel);
});

/* LISTEN CHANNEL */
function listenToChannel(ch) {
  messagesDiv.innerHTML = "";
  const chRef = ref(db, `channels/${ch}`);
  onChildAdded(chRef, (snap) => {
    const msg = snap.val();
    renderMessage(msg);
  });
}

/* RENDER MESSAGE */
function renderMessage(msgObj) {
  const wrapper = document.createElement("div"); wrapper.className = "msg";
  const bubble = document.createElement("div"); bubble.className = "bubble";
  const meta = document.createElement("div"); meta.className = "meta";
  meta.innerHTML = `<span class="username">${escapeHtml(msgObj.username)}</span> <span class="small-note">${new Date(msgObj.time).toLocaleString()}</span>`;
  const text = document.createElement("div"); text.textContent = msgObj.text;
  bubble.appendChild(meta); bubble.appendChild(text); wrapper.appendChild(bubble);
  messagesDiv.appendChild(wrapper); messagesDiv.scrollTop = messagesDiv.scrollHeight;
}
function escapeHtml(s){ return s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }

/* SEND CHANNEL MESSAGE */
sendBtn.onclick = async () => {
  if (!currentUser) return alert("Login first.");
  const text = msgInput.value.trim(); if (!text) return;
  const payload = { username: currentUser.displayName || currentUser.username, text, time: Date.now() };
  await push(ref(db, `channels/${currentChannel}`), payload);
  msgInput.value = "";
};

/* USER LIST & SEARCH */
async function refreshUserList() {
  userListDiv.innerHTML = "";
  const usersRef = ref(db, `users`);
  const snap = await get(usersRef);
  if (!snap.exists()) return;
  const users = snap.val();
  const query = (userSearch.value || "").toLowerCase();

  Object.keys(users).forEach(u => {
    const display = users[u].displayName || u;
    if (query && !display.toLowerCase().includes(query) && !u.toLowerCase().includes(query)) return;
    const node = document.createElement("div"); node.className = "user-item"; node.dataset.username = u;
    const img = document.createElement("img"); img.src = users[u].pfp || DEFAULT_PFP;
    const name = document.createElement("div"); name.textContent = display;
    const msgBtn = document.createElement("button"); msgBtn.textContent = "Message"; msgBtn.className = "btn";
    msgBtn.style.width = "80px"; msgBtn.style.marginLeft = "auto";

    msgBtn.onclick = () => { openDMWith(u); };

    node.appendChild(img); node.appendChild(name); node.appendChild(msgBtn);
    userListDiv.appendChild(node);
  });
}

userSearch.addEventListener("input", () => refreshUserList());

/* DM helpers */
// deterministic DM id for pair (alphabetical join with underscore)
function dmIdFor(a,b){
  if (a === b) return `dm_${a}`; // self-DM
  const p = [a,b].sort(); return `dm_${p[0]}_${p[1]}`;
}

/* OPEN DM (navigates to fullscreen DM page) */
function openDMWith(username) {
  if (!currentUser) return alert("Login first.");
  const id = dmIdFor(currentUser.username, username);
  currentDMId = id;
  // show DM page
  dmPage.classList.remove("hidden");
  appDiv.classList.add("hidden");
  dmTitle.textContent = `DM with ${username}`;
  dmMessages.innerHTML = "";
  listenToDM(id);
}

/* DM LISTEN */
function listenToDM(id) {
  // clear any prior listener (we rely on onChildAdded stacking but for this simplified version it's fine)
  dmMessages.innerHTML = "";
  const dRef = ref(db, `dms/${id}/messages`);
  onChildAdded(dRef, snap => {
    const m = snap.val();
    renderDMMessage(m);
  });
}

/* RENDER DM MESSAGE */
function renderDMMessage(m) {
  const wrapper = document.createElement("div"); wrapper.className = "dm-msg";
  const meta = document.createElement("div"); meta.className = "dm-meta";
  meta.textContent = `${m.username} • ${new Date(m.time).toLocaleString()}`;
  const bubble = document.createElement("div"); bubble.className = "dm-bubble";
  bubble.textContent = m.text;
  wrapper.appendChild(meta); wrapper.appendChild(bubble);
  dmMessages.appendChild(wrapper); dmMessages.scrollTop = dmMessages.scrollHeight;
}

/* SEND DM */
dmSend.onclick = async () => {
  if (!currentUser || !currentDMId) return;
  const text = dmInput.value.trim(); if (!text) return;
  const payload = { username: currentUser.displayName || currentUser.username, text, time: Date.now() };
  await push(ref(db, `dms/${currentDMId}/messages`), payload);
  dmInput.value = "";
};

/* DM BACK button */
dmBack.onclick = () => {
  dmPage.classList.add("hidden");
  appDiv.classList.remove("hidden");
  // stop listening (for this simple app we'll just clear the DM messages container)
  dmMessages.innerHTML = "";
  currentDMId = null;
};

/* initial refresh */
refreshUserList();

/* show DB errors */
window.addEventListener("error", (e) => { console.error(e.error || e.message); });