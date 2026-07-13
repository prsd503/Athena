import { auth, db } from "./app.js"; 
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, updateDoc, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let assignedSociety = "";

// Helper to handle post-login UI and data fetching
async function initializeGuardPortal(email) {
    try {
        const q = query(collection(db, "guards"), where("email", "==", email));
        const snap = await getDocs(q);
        
        if (snap.empty) {
            console.error("Guard profile not found.");
            return;
        }
        
        const guardData = snap.docs[0].data();
        assignedSociety = guardData.society; 
        
        // Populate dropdown
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
    } catch (e) {
        console.error("Initialization error:", e);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // This handles persistence on refresh
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            await initializeGuardPortal(user.email);
        }
    });
});

// 1. Handle Login
document.getElementById('loginBtn')?.addEventListener('click', async () => {
    const email = document.getElementById('email').value.trim();
    const pass = document.getElementById('pass').value.trim();
    
    if (!email || !pass) return alert("Please enter email and password.");
    
    try {
        await signInWithEmailAndPassword(auth, email, pass);
        // initializeGuardPortal is triggered automatically by onAuthStateChanged
    } catch (e) {
        alert("Login failed: " + e.message);
    }
});

document.getElementById('logoutBtn')?.addEventListener('click', async () => { 
    await signOut(auth);
    location.reload(); 
});

// 2. Activate Duty
document.getElementById('activateBtn')?.addEventListener('click', async () => {
    const select = document.getElementById('guardSelect');
    if (!select || !assignedSociety) return;
    
    try {
        await updateDoc(doc(db, "societies", assignedSociety), { 
            activeGuardName: select.value, 
            activeGuardPhone: select.options[select.selectedIndex].dataset.phone 
        });
        alert("Duty activated successfully!");
    } catch (e) {
        alert("Failed to activate: " + e.message);
    }
});

// 3. Search Vehicle
document.getElementById('searchBtn')?.addEventListener('click', async () => {
    const vNum = document.getElementById('vSearch').value.trim().toUpperCase();
    if (!vNum) return alert("Enter vehicle number");

    try {
        const q = query(collection(db, "vehicles"), 
            where("vehicleNumber", "==", vNum), 
            where("societyName", "==", assignedSociety)
        );
        const snap = await getDocs(q);
        const resultDiv = document.getElementById('result');
        
        if (!snap.empty) {
            const d = snap.docs[0].data();
            resultDiv.innerHTML = `Flat: ${d.flatNumber}<br><a href="tel:${d.mobileNumber}">📞 Call: ${d.mobileNumber}</a>`;
        } else {
            resultDiv.innerHTML = "Not found in your society.";
        }
    } catch (e) {
        alert("Search failed.");
    }
});
