import { auth, db } from "./app.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, updateDoc, and } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const SOCIETY_MAP = {
    "brink2wink@gmail.com": "Aangan",
    "rkom@gmail.com": "Indra"
};

window.showModal = (msg) => {
    document.getElementById('modalMessage').innerText = msg;
    document.getElementById('customModal').style.display = 'block';
};

window.closeModal = () => {
    document.getElementById('customModal').style.display = 'none';
};

document.addEventListener('DOMContentLoaded', () => {

    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', async () => {
            const email = document.getElementById('email').value;
            const pass = document.getElementById('pass').value;
            try {
                await signInWithEmailAndPassword(auth, email, pass);
                document.getElementById('login-section').style.display = 'none';
                document.getElementById('data-section').style.display = 'block';
                document.getElementById('search-section').style.display = 'block';
                showModal("Logged in as: " + (SOCIETY_MAP[email] || "Default"));
            } catch (e) { showModal("Login failed: " + e.message); }
        });
    }

    const searchBtn = document.getElementById('adminSearchBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', async () => {
            const qVal = document.getElementById('adminSearch').value.trim().toUpperCase();
            const userEmail = auth.currentUser ? auth.currentUser.email : "";
            const assignedSociety = SOCIETY_MAP[userEmail] || "My Society Name";

            // Filter by BOTH vehicleNumber AND the logged-in user's society
            const q = query(
                collection(db, "vehicles"), 
                where("vehicleNumber", "==", qVal),
                where("societyName", "==", assignedSociety)
            );
            
            const snapshot = await getDocs(q);
            const container = document.getElementById('admin-results');
            container.innerHTML = "";

            snapshot.forEach((docSnap) => {
                const data = docSnap.data();
                container.innerHTML += `
                    <div style="margin:10px 0; border:1px solid #8d6e63; padding:10px;">
                        <p>Flat: <input id="f-${docSnap.id}" value="${data.flatNumber}"></p>
                        <p>Society: <b>${data.societyName}</b></p>
                        <button onclick="window.updateData('${docSnap.id}')">Update</button>
                        <button onclick="window.deleteData('${docSnap.id}')" style="background:red; color:white;">Delete</button>
                    </div>`;
            });
        });
    }

    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            const vNum = document.getElementById('vNum').value.trim().toUpperCase();
            const fNum = document.getElementById('fNum').value;
            const userEmail = auth.currentUser ? auth.currentUser.email : "";
            const assignedSociety = SOCIETY_MAP[userEmail] || "My Society Name";

            try {
                await addDoc(collection(db, "vehicles"), { 
                    vehicleNumber: vNum, 
                    flatNumber: fNum, 
                    societyName: assignedSociety 
                });
                showModal("Vehicle added to " + assignedSociety);
            } catch (e) { showModal("Error: " + e.message); }
        });
    }
});
