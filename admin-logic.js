import { auth, db } from "./app.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Set your fixed society name here
const FIXED_SOCIETY_NAME = "My Society Name"; 

document.addEventListener('DOMContentLoaded', () => {

    // Login Listener
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
                alert("Logged in!");
            } catch (e) { alert(e.message); }
        });
    }

    // Search to Edit/Delete Listener
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
                        <p>Society: <b>${data.societyName || FIXED_SOCIETY_NAME}</b></p>
                        <button onclick="window.updateData('${docSnap.id}')">Update</button>
                        <button onclick="window.deleteData('${docSnap.id}')" style="background:red; color:white;">Delete</button>
                    </div>`;
            });
        });
    }

    // Save Data Listener (Now uses fixed society name)
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            const vNum = document.getElementById('vNum').value.trim().toUpperCase();
            const fNum = document.getElementById('fNum').value;
            
            try {
                await addDoc(collection(db, "vehicles"), { 
                    vehicleNumber: vNum, 
                    flatNumber: fNum, 
                    societyName: FIXED_SOCIETY_NAME 
                });
                alert("Vehicle added to " + FIXED_SOCIETY_NAME);
            } catch (e) { alert(e.message); }
        });
    }
});

// Global functions for the dynamically created buttons
window.updateData = async (id) => {
    const newFlat = document.getElementById(`f-${id}`).value;
    await updateDoc(doc(db, "vehicles", id), { flatNumber: newFlat });
    alert("Updated!");
};

window.deleteData = async (id) => {
    if (confirm("Delete this record?")) {
        await deleteDoc(doc(db, "vehicles", id));
        alert("Deleted!");
        document.getElementById('admin-results').innerHTML = "";
    }
};
