import { auth, db } from './app.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { collection, query, where, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

let currentSociety = "";

window.handleLogin = async () => {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    try {
        const userCred = await signInWithEmailAndPassword(auth, email, pass);
        const q = query(collection(db, "admins"), where("email", "==", email));
        const snap = await getDocs(q);
        if (!snap.empty) {
            currentSociety = snap.docs[0].data().society;
            document.getElementById('society-name').innerText = currentSociety;
            document.getElementById('login-view').style.display = 'none';
            document.getElementById('admin-view').style.display = 'block';
        }
    } catch (e) { alert("Login Error: " + e.message); }
};

window.addVehicle = async () => {
    await addDoc(collection(db, "vehicles"), {
        vehicleNum: document.getElementById('v-num').value,
        flat: document.getElementById('f-num').value,
        mobile: document.getElementById('m-num').value,
        society: currentSociety
    });
    alert("Vehicle added to " + currentSociety);
};

window.searchVehicles = async () => {
    // Logic for search and wa.me integration
    const search = document.getElementById('search').value;
    console.log("Searching for:", search);
    // Use window.open(`https://wa.me/${mobile}`, '_blank'); for messaging
};
