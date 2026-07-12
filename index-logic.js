import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const db = getFirestore();

// Updated to accept the society name dynamically
async function loadGuardInfo(societyName) {
    try {
        const socSnap = await getDoc(doc(db, "societies", societyName));
        if (socSnap.exists()) {
            const data = socSnap.data();
            // Only update if the activeGuardPhone field exists
            if (data.activeGuardPhone) {
                document.getElementById('guard-info').innerHTML = `
                    <div style="padding:15px; border:2px solid #8d6e63; border-radius:15px; background:#fdf6e3; margin-top:10px;">
                        <p style="margin:5px 0;">On Duty: <b>${data.activeGuardName || "Security"}</b></p>
                        <a href="tel:${data.activeGuardPhone}" style="background:#27ae60; color:white; padding:10px 20px; text-decoration:none; border-radius:10px; display:inline-block; font-family: 'Caveat', cursive;">
                            📞 Call Security
                        </a>
                    </div>`;
            }
        }
    } catch (error) {
        console.error("Error loading guard info:", error);
    }
}

// Search Vehicle (Resident View)
document.getElementById('searchBtn').addEventListener('click', async () => {
    const vNum = document.getElementById('vSearch').value.trim().toUpperCase();
    const snap = await getDoc(doc(db, "vehicles", vNum));
    
    if (snap.exists()) {
        const d = snap.data();
        document.getElementById('result').innerHTML = `
            <p><strong>Owner:</strong> ${d.name}</p>
            <p><strong>Flat/Unit:</strong> ${d.flat}</p>
            <p><em>Note: Contact security if you need assistance.</em></p>
        `;
    } else {
        alert("Vehicle not found.");
    }
});

// Export loadGuardInfo so it can be called from index.html after society verification
window.loadGuardInfo = loadGuardInfo;
