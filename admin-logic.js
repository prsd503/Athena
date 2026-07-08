import { auth, db } from "./app.js";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, collection, query, where, getDocs, deleteDoc, updateDoc, writeBatch } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let assignedSociety = "";

// --- Global UI Helpers ---
window.closeModal = () => { document.getElementById('customModal').style.display = 'none'; };
window.showModal = (msg) => {
    document.getElementById('modalMessage').innerText = msg;
    document.getElementById('customModal').style.display = 'block';
};

// --- Application Logic ---
document.addEventListener('DOMContentLoaded', () => {

    // 1. Persistent Login Listener
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                const adminDoc = await getDoc(doc(db, "admins", user.email));
                if (adminDoc.exists()) {
                    assignedSociety = adminDoc.data().society;
                    document.getElementById('login-section').style.display = 'none';
                    document.getElementById('search-section').style.display = 'block';
                    document.getElementById('data-section').style.display = 'block';
                }
            } catch (e) {
                console.error("Auth check error:", e);
            }
        }
    });

    // 2. Login Handler (FIXED)
    document.getElementById('loginBtn')?.addEventListener('click', async () => {
        const email = document.getElementById('email').value.trim();
        const pass = document.getElementById('pass').value.trim();
        if (!email || !pass) return window.showModal("Please enter Email and Password.");
        
        try {
            await signInWithEmailAndPassword(auth, email, pass);
            // No need to manually show UI here; onAuthStateChanged will handle it!
        } catch (e) {
            window.showModal("Login failed: " + e.message);
        }
    });

    // 3. Logout Handler (FIXED)
    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
        try {
            await signOut(auth);
            location.reload(); // Hard refresh to reset the state completely
        } catch (e) {
            window.showModal("Error: " + e.message);
        }
    });

    // ... (Keep your existing Search, Add, CSV Import/Export code here)
});
