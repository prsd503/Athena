import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

const db = getFirestore();
const SOCIETY_ID = "Aangan"; // You can make this dynamic if you have multiple societies

// A. Load Active Guard on page load
async function loadGuardInfo() {
    const socSnap = await getDoc(doc(db, "societies", SOCIETY_ID));
    if (socSnap.exists()) {
        const guard = socSnap.data();
        document.getElementById('guard-info').innerHTML = `
            <p>Security on duty: <strong>${guard.activeGuardName}</strong></p>
            <a href="tel:${guard.activeGuardPhone}">
                <button style="background:#27ae60;">📞 Call ${guard.activeGuardName}</button>
            </a>
        `;
    }
}

// B. Search Vehicle (Resident View - No phone number shown!)
document.getElementById('searchBtn').addEventListener('click', async () => {
    const vNum = document.getElementById('vSearch').value.toUpperCase();
    const snap = await getDoc(doc(db, "vehicles", vNum));
    
    if (snap.exists()) {
        const d = snap.data();
        // Residents only see Name and Flat
        document.getElementById('result').innerHTML = `
            <p><strong>Owner:</strong> ${d.name}</p>
            <p><strong>Flat/Unit:</strong> ${d.flat}</p>
            <p><em>Note: Contact security if you need assistance.</em></p>
        `;
    } else {
        alert("Vehicle not found.");
    }
});

// Run this when page loads
loadGuardInfo();
