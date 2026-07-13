// index-logic.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, onSnapshot, getDoc, getDocs, collection, query, where, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBEYKHQpy_VjmgjYiWQOPjXth1bghYsf9M",
    authDomain: "finder-owl.firebaseapp.com",
    projectId: "finder-owl",
    storageBucket: "finder-owl.firebasestorage.app",
    messagingSenderId: "1011347100861",
    appId: "1:1011347100861:web:24246f9a4eb24d812cd3d4"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 1. Real-time Guard Info Listener
export function setupGuardListener(societyName) {
    const docRef = doc(db, "societies", societyName);
    onSnapshot(docRef, (docSnap) => {
        const guardInfoDiv = document.getElementById('guard-info');
        if (!guardInfoDiv) return;

        if (docSnap.exists() && docSnap.data().activeGuardName) {
            const data = docSnap.data();
            guardInfoDiv.innerHTML = `
                <div style="padding:15px; border:2px solid #8d6e63; border-radius:15px; background:#fdf6e3; margin-top:10px;">
                    <p style="margin:5px 0;">On Duty: <b>${data.activeGuardName}</b></p>
                    <a href="tel:${data.activeGuardPhone}" style="background:#27ae60; color:white; padding:10px 20px; text-decoration:none; border-radius:10px; display:inline-block; font-family: 'Caveat', cursive;">
                        📞 Call Security
                    </a>
                </div>`;
        } else {
            guardInfoDiv.innerHTML = "<p>No guard currently on duty.</p>";
        }
    });
}

// 2. Notice Board Fetcher
export async function loadNotice(societyName) {
    const noticeDiv = document.getElementById('notice-content');
    if (!noticeDiv) return;
    
    const docRef = doc(db, "notices", societyName);
    try {
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            const data = snap.data();
            // Note: Verify if createdAt is a Firestore Timestamp or Date
            const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
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
        noticeDiv.innerHTML = "Could not load notices.";
    }
}

// 3. Search Vehicle (Resident View)
export async function searchVehicle(societyName, vNum) {
    const resultDiv = document.getElementById('result');
    if (!vNum || !resultDiv) return;

    // Query matches vehicle number AND societyName
    const q = query(
        collection(db, "vehicles"), 
        where("vehicleNumber", "==", vNum),
        where("societyName", "==", societyName)
    );
    const snap = await getDocs(q);
    
    if (!snap.empty) {
        const d = snap.docs[0].data();
        resultDiv.innerHTML = `
            <div style="padding:15px; border:2px solid #8d6e63; border-radius:15px; background:#e8f8f5;">
                <p><strong>Owner/Flat:</strong> ${d.flatNumber}</p>
                <a href="tel:${d.mobileNumber}" style="background:#27ae60; color:white; padding:10px; text-decoration:none; border-radius:10px;">
                    📞 Contact: ${d.mobileNumber}
                </a>
            </div>`;
    } else {
        resultDiv.innerHTML = "<p>❌ Vehicle not found in this society.</p>";
    }
}
