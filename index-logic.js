// index-logic.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, onSnapshot, getDoc, getDocs, collection, query, where, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// 2. Updated Notice Board (Auto-switch logic)
export async function loadNotice(societyName) {
    const noticeDiv = document.getElementById('notice-content');
    if (!noticeDiv) return;
    
    const docRef = doc(db, "notices", societyName);
    const snap = await getDoc(docRef);
    const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD

    if (snap.exists()) {
        let data = snap.data();
        let displayMsg = data.todayMessage;
        let storedDate = data.date || todayStr;

        // Auto-switch logic: if stored date is in the past, promote tomorrow's message
        if (storedDate < todayStr) {
            displayMsg = data.tomorrowMessage || "No new notices.";
            await setDoc(docRef, { 
                todayMessage: displayMsg, 
                tomorrowMessage: "", 
                date: todayStr 
            }, { merge: true });
        }

        noticeDiv.innerHTML = `
            <div style="margin-top: 10px; font-size: 1.1rem; color: #333;">
                <p style="margin: 0; font-size: 0.8rem; color: #666;">Date: ${todayStr}</p>
                <b>Today's Notice:</b><br>${displayMsg}
            </div>`;
    } else {
        noticeDiv.innerHTML = "No notices for today.";
    }
}

// 3. Search Vehicle
export async function searchVehicle(societyName, vNum) {
    const resultDiv = document.getElementById('result');
    if (!vNum || !resultDiv) return;

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
        resultDiv.innerHTML = "<p>❌ Vehicle not found.</p>";
    }
}
