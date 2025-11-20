// ==== FIREBASE CONFIG ====
const firebaseConfig = {
    apiKey: "AIzaSyDjECoKLpELfWuhgcfPKeCfsKWoSAQQYcw",
    authDomain: "temu-dc.firebaseapp.com",
    databaseURL: "https://temu-dc-default-rtdb.firebaseio.com",
    projectId: "temu-dc",
    storageBucket: "temu-dc.appspot.com",
    messagingSenderId: "796652238576",
    appId: "1:796652238576:web:144b5d70b219f4d2f88371",
    measurementId: "G-MJ4T8M6MME"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Database reference
let db = firebase.database();

// Current chat channel
let currentChannel = "general";

// Switch channels
function switchChannel(channel) {
    currentChannel = channel;
    document.getElementById("chat").innerHTML = "";
    loadMessages();
}

// Load messages for the channel
function loadMessages() {
    db.ref(currentChannel).off(); // prevent duplicates

    db.ref(currentChannel).on("child_added", snapshot => {
        let data = snapshot.val();

        let div = document.createElement("div");
        div.textContent = `${data.name}: ${data.text}`;

        document.getElementById("chat").appendChild(div);
        document.getElementById("chat").scrollTop = 999999;
    });
}

// Send a message
function sendMessage() {
    let name = document.getElementById("name").value.trim();
    let message = document.getElementById("message").value.trim();

    if (!name || !message) return;

    db.ref(currentChannel).push({
        name: name,
        text: message
    });

    document.getElementById("message").value = "";
}

// Load default channel on startup
loadMessages();