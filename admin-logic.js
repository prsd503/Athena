import { auth, db } from "./app.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
                document.getElementById('search-section').style.display = 'block'; // Ensure search is also shown
                alert("Logged in successfully!");
            } catch (e) { 
                console.error(e); 
                alert("Login failed: " + e.message); 
            }
        });
    }

    // Save Data Listener
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            const vNum = document.getElementById('vNum').value.trim().toUpperCase();
            const fNum = document.getElementById('fNum').value;
            const sName = document.getElementById('sName').value;

            try {
                await addDoc(collection(db, "vehicles"), {
                    vehicleNumber: vNum,
                    flatNumber: fNum,
                    societyName: sName,
                    addedBy: auth.currentUser.uid
                });
                alert("Vehicle added!");
            } catch (e) { alert("Error: " + e.message); }
        });
    }
});
