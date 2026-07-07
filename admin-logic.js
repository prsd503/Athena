import { auth, db } from "./app.js";
import { signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let userSociety = "";

onAuthStateChanged(auth, async (user) => {
    if (user) {
        document.getElementById('login-section').classList.add('hidden');
        document.getElementById('data-section').classList.remove('hidden');
        // Fetch society linked to admin email
        const q = query(collection(db, "admins"), where("email", "==", user.email));
        const snap = await getDocs(q);
        snap.forEach(doc => userSociety = doc.data().society);
    }
});

document.getElementById('saveBtn').addEventListener('click', async () => {
    await addDoc(collection(db, "vehicles"), {
        vNumber: document.getElementById('vNumber').value,
        mNumber: document.getElementById('mNumber').value,
        flatNum: document.getElementById('flatNum').value,
        society: userSociety
    });
    alert("Saved!");
});

document.getElementById('searchBtn').addEventListener('click', async () => {
    const val = document.getElementById('searchQuery').value;
    const q = query(collection(db, "vehicles"), where("vNumber", "==", val), where("society", "==", userSociety));
    const snap = await getDocs(q);
    const results = document.getElementById('results');
    results.innerHTML = "";
    snap.forEach(doc => {
        const data = doc.data();
        results.innerHTML += `<div>
            <p>${data.vNumber} | Flat: ${data.flatNum}</p>
            <a href="https://wa.me/${data.mNumber}" target="_blank">Message Owner</a>
            <button onclick="deleteVehicle('${doc.id}')">Delete</button>
        </div>`;
    });
});
