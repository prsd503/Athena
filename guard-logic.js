import { auth, db } from "./app.js"; 
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth-compat.js";
import { doc, getDoc, updateDoc, collection, getDocs, where } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore-compat.js";

let assignedSociety = "";

// --- Modal UI Helpers ---
window.closeModal = () => { 
    const modal = document.getElementById('customModal');
    if (modal) modal.style.display = 'none'; 
};

document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.getElementById('menuToggle');
    const navLinks = document.getElementById('navLinks');

    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }
});

window.showModal = (msg) => {
    const msgEl = document.getElementById('modalMessage');
    const modal = document.getElementById('customModal');
    if (msgEl && modal) {
        msgEl.innerText = msg;
        modal.style.display = 'flex'; // Must be 'flex' to keep it centered
    }
};

async function initializeGuardPortal(email) {
    try {
        // Query the guards collection to verify membership and fetch their society
        const snap = await getDocs(collection(db, "guards").where("email", "==", email));
        
        if (snap.empty) {
            // Sign out immediately if not found in guards list
            await signOut(auth);
            window.showModal("Not Registered as Security Guard");
            return;
        }
        
        const guardData = snap.docs[0].data();
        assignedSociety = guardData.society; 
        
        // Populate select list with other guards from the same society
        const guards = await getDocs(collection(db, "guards").where("society", "==", assignedSociety));
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
    window.showModal("Login successful!");
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
        const snap = await getDocs(
            collection(db, "vehicles")
                .where("vehicleNumber", "==", vNum)
                .where("societyName", "==", assignedSociety)
        );
        const resultDiv = document.getElementById('result');
        
        if (!resultDiv) return;
        
        if (!snap.empty) {
            const d = snap.docs[0].data();
            resultDiv.innerHTML = `<div style="font-family: sans-serif;">Flat: <b>${d.flatNumber}</b><br><a href="tel:${d.mobileNumber}">📞 Call: ${d.mobileNumber}</a></div>`;

        } else {
            window.showModal("No vehicle found for this society.");
            resultDiv.innerHTML = "";
        }
    } catch (e) {
        window.showModal("Search error: " + e.message);
    }
});

// Forgot Password Implementation
document.getElementById('forgotPasswordBtn')?.addEventListener('click', async () => {
    const emailInput = document.getElementById('email');
    const email = emailInput ? emailInput.value.trim() : "";

    if (!email) {
        window.showModal("Please enter your email address first.");
        return;
    }

    try {
        await sendPasswordResetEmail(auth, email);
        window.showModal("Password reset link sent to your email!");
    } catch (error) {
        console.error("Error sending password reset email:", error);
        
        if (error.code === 'auth/invalid-email') {
            window.showModal("Invalid email");
        } else if (error.code === 'auth/user-not-found') {
            window.showModal("Email not registered");
        } else if (error.code === 'auth/too-many-requests') {
            window.showModal("Too many requests. Please try again later.");
        } else {
            window.showModal("Error: " + error.message);
        }
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
