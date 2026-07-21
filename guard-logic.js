import { auth, db } from "./app.js"; 
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, updateDoc, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let assignedSociety = "";

// --- Modal UI Helpers ---
window.closeModal = () => { 
    const modal = document.getElementById('customModal');
    if (modal) modal.style.display = 'none'; 
};

window.showModal = (msg) => {
    const msgEl = document.getElementById('modalMessage');
    const modal = document.getElementById('customModal');
    if (msgEl && modal) {
        msgEl.innerText = msg;
        modal.style.display = 'block';
    }
};

async function initializeGuardPortal(email) {
    try {
        // Query the guards collection to verify membership and fetch their society
        const q = query(collection(db, "guards"), where("email", "==", email));
        const snap = await getDocs(q);
        
        if (snap.empty) {
            // Sign out immediately if not found in guards list
            await signOut(auth);
            window.showModal("Not Registered as Security Guard");
            return;
        }
        
        const guardData = snap.docs[0].data();
        assignedSociety = guardData.society; 
        
        // Populate select list with other guards from the same society
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
        
        // Transition Views
        const loginSec = document.getElementById('login-section');
        const portalSec = document.getElementById('portalSection');
        const logoutBtn = document.getElementById('logoutBtn');
        
        if (loginSec) loginSec.style.display = 'none';
        if (portalSec) portalSec.style.display = 'block';
        
        // Centering the logout button dynamically
        if (logoutBtn) {
            logoutBtn.style.display = 'block';
            logoutBtn.style.margin = '20px auto'; // Centers the button horizontally with top/bottom margin
            logoutBtn.style.width = 'fit-content'; // Ensures it doesn't stretch to full width
        }
        
    } catch (e) { 
        console.error("Initialization error: ", e); 
        window.showModal("Error loading portal profile data.");
    }
}

document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            await initializeGuardPortal(user.email);
        }
    });
});

// Login Handlers
document.getElementById('loginBtn')?.addEventListener('click', async () => {
    const emailEl = document.getElementById('email');
    const passEl = document.getElementById('pass');
    
    if (!emailEl || !passEl) return;
    
    const email = emailEl.value.trim();
    const pass = passEl.value.trim();
    
    if (!email || !pass) return window.showModal("Please enter email and password.");
    
    try {
        await signInWithEmailAndPassword(auth, email, pass);
    } catch (e) {
        if (e.code === 'auth/invalid-email' || 
            e.code === 'auth/invalid-credential' || 
            e.code === 'auth/user-not-found' || 
            e.code === 'auth/wrong-password') {
            window.showModal("Invalid Credentials");
        } else {
            window.showModal("Login failed: " + e.message);
        }
    }
});

// Activate Duty Action
document.getElementById('activateBtn')?.addEventListener('click', async () => {
    const select = document.getElementById('guardSelect');
    if (!select || !assignedSociety) return;
    
    try {
        const selectedOption = select.options[select.selectedIndex];
        await updateDoc(doc(db, "societies", assignedSociety), { 
            activeGuardName: select.value, 
            activeGuardPhone: selectedOption ? selectedOption.dataset.phone : ""
        });
        window.showModal("Duty activated successfully for " + assignedSociety);
    } catch (e) {
        window.showModal("Failed to activate: " + e.message);
    }
});

// Search Action
document.getElementById('searchBtn')?.addEventListener('click', async () => {
    const vSearchEl = document.getElementById('vSearch');
    if (!vSearchEl) return;
    
    const vNum = vSearchEl.value.trim().toUpperCase();
    if (!vNum) return window.showModal("Enter a valid vehicle number.");

    try {
        const q = query(
            collection(db, "vehicles"), 
            where("vehicleNumber", "==", vNum), 
            where("societyName", "==", assignedSociety)
        );
        const snap = await getDocs(q);
        const resultDiv = document.getElementById('result');
        
        if (!resultDiv) return;
        
        if (!snap.empty) {
            const d = snap.docs[0].data();
            ResultDiv.innerHTML = `<div style="font-family: sans-serif;">Flat: <b>${d.flatNumber}</b><br><a href="tel:${d.mobileNumber}">📞 Call: ${d.mobileNumber}</a></div>`;

        } else {
            window.showModal("No vehicle found for this society.");
            resultDiv.innerHTML = "";
        }
    } catch (e) {
        window.showModal("Search error: " + e.message);
    }
});

document.getElementById('logoutBtn')?.addEventListener('click', async () => { 
    try {
        await signOut(auth);
        location.reload(); 
    } catch (e) {
        console.error("Logout failed: ", e);
    }
});
