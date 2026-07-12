import { db } from "./app.js"; 
import { doc, onSnapshot, getDoc, getDocs, collection, query, where, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 1. Real-time Guard Info Listener
function setupGuardListener(societyName) {
    const docRef = doc(db, "societies", societyName);
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
        } else {
            guardInfoDiv.innerHTML = "<p>No guard currently on duty.</p>";
        }
    });
}

// 2. Notice Board Fetcher
async function loadNotice(societyName) {
    const noticeDiv = document.getElementById('notice-content');
    const docRef = doc(db, "notices", societyName);
    
    try {
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            const data = snap.data();
            const createdAt = data.createdAt?.toDate();
            const now = new Date();
            
            // Auto-delete if older than 24 hours
            if (createdAt && (now - createdAt) > (24 * 60 * 60 * 1000)) {
                await deleteDoc(docRef);
                noticeDiv.innerHTML = "No notices for today.";
            } else {
                noticeDiv.innerHTML = `
                    <p style="font-size: 16px; color: #333;">${data.message}</p>
                    ${data.pdfUrl ? `<a href="${data.pdfUrl}" target="_blank" style="color: #2980b9;">📄 View Attachment</a>` : ""}`;
            }
        } else {
            noticeDiv.innerHTML = "No notices for today.";
        }
    } catch (e) {
        console.error("Error loading notice:", e);
    }
}

// 3. Search Vehicle (Resident View)
document.getElementById('searchBtn')?.addEventListener('click', async () => {
    const vNum = document.getElementById('vSearch').value.trim().toUpperCase();
    const resultDiv = document.getElementById('result');
    if (!vNum) return alert("Enter vehicle number.");

    // Using query because vehicleNumber is the field, not necessarily the Doc ID
    const q = query(collection(db, "vehicles"), where("vehicleNumber", "==", vNum));
    const snap = await getDocs(q);
    
    if (!snap.empty) {
        const d = snap.docs[0].data();
        resultDiv.innerHTML = `
            <div style="padding:10px; background:#e8f8f5; border-radius:8px;">
                <p><strong>Owner:</strong> ${d.flatNumber}</p>
                <a href="tel:${d.mobileNumber}">📞 Contact: ${d.mobileNumber}</a>
            </div>`;
    } else {
        resultDiv.innerHTML = "<p>Vehicle not found.</p>";
    }
});

// Export functions for use in your HTML
window.setupGuardListener = setupGuardListener;
window.loadNotice = loadNotice;
