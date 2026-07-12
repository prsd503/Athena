import { auth, db } from "./app.js"; 
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, collection, addDoc, query, where, getDocs, deleteDoc, updateDoc, writeBatch, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let assignedSociety = "";
let editingDocId = null;

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
    document.getElementById('logoutBtn')?.addEventListener('click', async () => { await signOut(auth); location.reload(); });

    // --- 3. Vehicle & Guard Management ---
    // (As defined in the previous structural fix)
    // ... [Insert your existing vehicle search/save and guard search/add functions here] ...

    // --- 4. Notice Board Integration ---
// In your admin-logic.js
document.getElementById('postNoticeBtn').addEventListener('click', async () => {
    const today = document.getElementById('todayMsg').value;
    const tomorrow = document.getElementById('tomorrowMsg').value;
    const societyId = "Aangan"; // Ensure this matches your dynamic selection

    await setDoc(doc(db, "notices", societyId), {
        todayMessage: today,
        tomorrowMessage: tomorrow,
        updatedAt: serverTimestamp()
    }, { merge: true });

    alert("Notices updated successfully!");
});

        } catch (e) {
            alert("Error posting notice: " + e.message);
        }
    });

    document.getElementById('deleteNoticeBtn')?.addEventListener('click', async () => {
        try {
            await deleteDoc(doc(db, "notices", assignedSociety));
            alert("Notice deleted.");
        } catch (e) {
            alert("Error deleting: " + e.message);
        }
    });
});
