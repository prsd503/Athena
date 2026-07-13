import { auth, db } from "./app.js"; 
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, getDocs, collection, setDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let assignedSociety = "";

// Helper to fetch notices
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

async function loadNotice(societyId) {
    const noticeDiv = document.getElementById('notice-content');
    if (!noticeDiv) return;

    const docRef = doc(db, "notices", societyId);
    const snap = await getDoc(docRef);
    const todayStr = new Date().toLocaleDateString('en-CA'); // Gets YYYY-MM-DD

    if (snap.exists()) {
        let data = snap.data();
        let displayMsg = data.todayMessage;
        let storedDate = data.date || todayStr;

        // Auto-Switch Logic: If the stored date is older than today
        if (storedDate < todayStr) {
            displayMsg = data.tomorrowMessage || "No new notices.";
            // Update Firestore with the new "Today" message
            await setDoc(docRef, { 
                todayMessage: displayMsg, 
                tomorrowMessage: "", 
                date: todayStr 
            }, { merge: true });
        }

        // Display only today's message
        noticeDiv.innerHTML = `
            <div style="margin-top: 10px; font-size: 1.1rem; color: #333;">
                <b>${todayStr}:</b> ${displayMsg}
            </div>`;
    } else {
        noticeDiv.innerHTML = "No notices for today.";
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
    // --- Notice Board Management ---
document.getElementById('postNoticeBtn')?.addEventListener('click', async () => {
    const today = document.getElementById('todayMsg').value;
    const tomorrow = document.getElementById('tomorrowMsg').value;
    
    // Helper function to count words
    const countWords = (str) => str.trim().split(/\s+/).filter(w => w.length > 0).length;

    // Validate limits
    if (countWords(today) > 60 || countWords(tomorrow) > 60) {
        alert("Notice exceeds the 60-word limit for one or both fields!");
        return; // Stops the function from saving to Firestore
    }

    if (!assignedSociety) return alert("Society not loaded.");

    try {
        await setDoc(doc(db, "notices", assignedSociety), {
            todayMessage: today,
            tomorrowMessage: tomorrow,
            date: new Date().toISOString().split('T')[0], // Saves date for auto-switch logic
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
