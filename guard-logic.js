import { auth, db } from "./app.js"; 
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, updateDoc, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let assignedSociety = "";

// --- Modal UI Helpers ---
window.closeModal = () => { document.getElementById('customModal').style.display = 'none'; };
window.showModal = (msg) => {
    document.getElementById('modalMessage').innerText = msg;
    document.getElementById('customModal').style.display = 'block';
};

async function initializeGuardPortal(email) {
    try {
        const q = query(collection(db, "guards"), where("email", "==", email));
        const snap = await getDocs(q);
        
        if (snap.empty) return;
        
        const guardData = snap.docs[0].data();
        assignedSociety = guardData.society; 
        
        const qGuards = query(collection(db, "guards"), where("society", "==", assignedSociety));
        const guards = await getDocs(qGuards);
        const select = document.getElementById('guardSelect');
        
        if (select) {
            select.innerHTML = "";
            guards.forEach(d => {
                const data = d.data();
                select.innerHTML += `<option value="${data.name}" data-phone="${data.phone}">${data.name}</option>`;
            });
        }
        
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('portalSection').style.display = 'block';
        document.getElementById('logoutBtn').style.display = 'block';
    } catch (e) { console.error(e); }
}

document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, async (user) => {
        if (user) await initializeGuardPortal(user.email);
    });
});

// Login with Modal
document.getElementById('loginBtn')?.addEventListener('click', async () => {
    const email = document.getElementById('email').value.trim();
    const pass = document.getElementById('pass').value.trim();
    if (!email || !pass) return window.showModal("Please enter email and password.");
    
    try {
        await signInWithEmailAndPassword(auth, email, pass);
    } catch (e) {
        window.showModal("Login failed: " + e.message);
    }
});

// Activate Duty with Modal
document.getElementById('activateBtn')?.addEventListener('click', async () => {
    const select = document.getElementById('guardSelect');
    if (!select || !assignedSociety) return;
    
    try {
        await updateDoc(doc(db, "societies", assignedSociety), { 
            activeGuardName: select.value, 
            activeGuardPhone: select.options[select.selectedIndex].dataset.phone 
        });
        window.showModal("Duty activated successfully for " + assignedSociety);
    } catch (e) {
        window.showModal("Failed to activate: " + e.message);
    }
});

// Search with Modal
document.getElementById('searchBtn')?.addEventListener('click', async () => {
    const vNum = document.getElementById('vSearch').value.trim().toUpperCase();
    if (!vNum) return window.showModal("Enter a valid vehicle number.");

    try {
        const q = query(collection(db, "vehicles"), where("vehicleNumber", "==", vNum), where("societyName", "==", assignedSociety));
        const snap = await getDocs(q);
        const resultDiv = document.getElementById('result');
        
        if (!snap.empty) {
            const d = snap.docs[0].data();
            resultDiv.innerHTML = `Flat: ${d.flatNumber}<br><a href="tel:${d.mobileNumber}">📞 Call: ${d.mobileNumber}</a>`;
        } else {
            window.showModal("No vehicle found for this society.");
            resultDiv.innerHTML = "";
        }
    } catch (e) {
        window.showModal("Search error: " + e.message);
    }
});

document.getElementById('logoutBtn')?.addEventListener('click', async () => { 
    await signOut(auth);
    location.reload(); 
});
