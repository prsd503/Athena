import { auth, db } from "./app.js"; 
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, getDocs, collection, setDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let assignedSociety = "";

// Helper to fetch notices
async function loadNoticeData() {
    if (!assignedSociety) return;
    try {
        const snap = await getDoc(doc(db, "notices", assignedSociety));
        if (snap.exists()) {
            const data = snap.data();
            document.getElementById('todayMsg').value = data.todayMessage || "";
            document.getElementById('tomorrowMsg').value = data.tomorrowMessage || "";
        }
    } catch (e) {
        console.error("Error loading notices:", e);
    }
}

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. Auth ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const adminDoc = await getDoc(doc(db, "admins", user.email));
            if (adminDoc.exists()) {
                assignedSociety = adminDoc.data().society;
                document.getElementById('login-section').style.display = 'none';
                document.getElementById('search-section').style.display = 'block';
                document.getElementById('data-section').style.display = 'block';
                
                // Load notice data for the assigned society
                loadNoticeData();
            }
        }
    });

    // --- 2. Login/Logout ---
    document.getElementById('loginBtn')?.addEventListener('click', async () => {
        const email = document.getElementById('email').value.trim();
        const pass = document.getElementById('pass').value.trim();
        if (!email || !pass) return alert("Enter Email and Password.");
        try { await signInWithEmailAndPassword(auth, email, pass); }
        catch (e) { alert("Login error: " + e.message); }
    });

    document.getElementById('logoutBtn')?.addEventListener('click', async () => { 
        await signOut(auth); 
        location.reload(); 
    });

    // --- 3. Notice Board Management ---
    document.getElementById('postNoticeBtn')?.addEventListener('click', async () => {
        const today = document.getElementById('todayMsg').value;
        const tomorrow = document.getElementById('tomorrowMsg').value;
        
        if (!assignedSociety) return alert("Society not loaded.");

        try {
            await setDoc(doc(db, "notices", assignedSociety), {
                todayMessage: today,
                tomorrowMessage: tomorrow,
                updatedAt: serverTimestamp()
            }, { merge: true });
            alert("Notices updated successfully!");
        } catch (e) {
            alert("Error posting notice: " + e.message);
        }
    });

    document.getElementById('deleteNoticeBtn')?.addEventListener('click', async () => {
        if (!assignedSociety) return;
        try {
            await deleteDoc(doc(db, "notices", assignedSociety));
            document.getElementById('todayMsg').value = "";
            document.getElementById('tomorrowMsg').value = "";
            alert("Notice deleted.");
        } catch (e) {
            alert("Error deleting: " + e.message);
        }
    });
});
