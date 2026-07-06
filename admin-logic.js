import { auth, db } from "./app.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const SOCIETY_MAP = {
    "brink2wink@gmail.com": "Aangan",
    "rkom@gmail.com": "Indra"
};

// --- Modal Functions ---
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
                showModal("Logged in successfully!");
            } catch (e) { showModal("Login failed: " + e.message); }
        });
    }

    const searchBtn = document.getElementById('adminSearchBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', async () => {
            const qVal = document.getElementById('adminSearch').value.trim().toUpperCase();
            const q = query(collection(db, "vehicles"), where("vehicleNumber", "==", qVal));
            const snapshot = await getDocs(q);
            const container = document.getElementById('admin-results');
            container.innerHTML = "";

            snapshot.forEach((docSnap) => {
                const data = docSnap.data();
                container.innerHTML += `
                    <div style="margin:10px 0; border:1px solid #8d6e63; padding:10px;">
                        <p>Flat: <input id="f-${docSnap.id}" value="${data.flatNumber}"></p>
                        <p>Society: <b>${data.societyName || "Unknown"}</b></p>
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

window.updateData = async (id) => {
    const newFlat = document.getElementById(`f-${id}`).value;
    await updateDoc(doc(db, "vehicles", id), { flatNumber: newFlat });
    showModal("Updated successfully!");
};

window.deleteData = async (id) => {
    if (confirm("Delete this record?")) {
        await deleteDoc(doc(db, "vehicles", id));
        showModal("Deleted successfully!");
        document.getElementById('admin-results').innerHTML = "";
    }
};
