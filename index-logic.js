import { getFirestore, doc, onSnapshot, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Note: Ensure your app.js exports 'db' and you import it here
import { db } from "./app.js"; 

// 1. Real-time Guard Info Listener
function setupGuardListener(societyName) {
    const docRef = doc(db, "societies", societyName);
    
    // onSnapshot listens for changes in real-time
    onSnapshot(docRef, (docSnap) => {
        const guardInfoDiv = document.getElementById('guard-info');
        if (docSnap.exists() && docSnap.data().activeGuardName) {
            const data = docSnap.data();
            guardInfoDiv.innerHTML = `
                <div style="padding:15px; border:2px solid #8d6e63; border-radius:15px; background:#fdf6e3; margin-top:10px;">
                    <p style="margin:5px 0;">On Duty: <b>${data.activeGuardName}</b></p>
                    <a href="tel:${data.activeGuardPhone}" style="background:#27ae60; color:white; padding:10px 20px; text-decoration:none; border-radius:10px; display:inline-block;">
                        📞 Call Security
                    </a>
                </div>`;
            <div id="notice-board" style="margin-top:20px; padding:15px; border:1px solid #ccc; border-radius:10px;">
    <h3>📢 Notice Board</h3>
    <div id="notice-content">Loading notices...</div>
    <p style="font-size: 10px; color: #888; margin-top: 10px;">
        ⚠️ Disclaimer: Do not upload personal data. Notices are publicly visible.
    </p>
 </div>;
        } else {
            guardInfoDiv.innerHTML = "<p>No guard currently on duty.</p>";
        }
    });
}

// 2. Search Vehicle (Resident View)
document.getElementById('searchBtn')?.addEventListener('click', async () => {
    const vNum = document.getElementById('vSearch').value.trim().toUpperCase();
    if (!vNum) return;

    // Assuming vehicle document ID is the vehicle number
    const snap = await getDoc(doc(db, "vehicles", vNum));
    
    if (snap.exists()) {
        const d = snap.data();
        document.getElementById('result').innerHTML = `
            <p><strong>Owner:</strong> ${d.name}</p>
            <p><strong>Flat/Unit:</strong> ${d.flatNumber}</p>
            <p><em>Contact security if you need assistance.</em></p>
        `;
    } else {
        alert("Vehicle not found.");
    }
});

window.setupGuardListener = setupGuardListener;
