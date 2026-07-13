import { auth, db } from "./app.js"; 
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let assignedSociety = "";

// Unified Notice Loader for Admin Preview
async function loadNoticeData() {
    if (!assignedSociety) return;
    const docRef = doc(db, "notices", assignedSociety);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
        const data = snap.data();
        document.getElementById('todayMsg').value = data.todayMessage || "";
        document.getElementById('tomorrowMsg').value = data.tomorrowMessage || "";
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
        
        const countWords = (str) => str.trim().split(/\s+/).filter(w => w.length > 0).length;

        if (countWords(today) > 60 || countWords(tomorrow) > 60) {
            return alert("Notice exceeds the 60-word limit!");
        }

        if (!assignedSociety) return alert("Society not loaded.");

        try {
            await setDoc(doc(db, "notices", assignedSociety), {
                todayMessage: today,
                tomorrowMessage: tomorrow,
                date: new Date().toLocaleDateString('en-CA'), // Consistent format
                updatedAt: serverTimestamp()
            }, { merge: true });
            alert("Notices updated successfully!");
        } catch (e) {
            alert("Error: " + e.message);
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
            alert("Error: " + e.message);
        }
    });
});
