// 1. Import initialized services from your app.js
import { auth, db } from "./app.js"; 
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, updateDoc, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Global variable to store society
let assignedSociety = "";

// 1. Handle Login
document.addEventListener('DOMContentLoaded', () => {
    // --- 1. Auth ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const gaurdDoc = await getDoc(doc(db, "guards", user.email));
            if (adminDoc.exists()) {
                assignedSociety = gaurdDoc.data().society;
            }
        }
    });

document.getElementById('loginBtn')?.addEventListener('click', async () => {
    const email = document.getElementById('email').value.trim();
    const pass = document.getElementById('pass').value.trim();
    
    if (!email || !pass) return alert("Please enter email and password.");
    
    try {
        await signInWithEmailAndPassword(auth, email, pass);
        
        // Find guard info based on email
        const q = query(collection(db, "guards"), where("email", "==", email));
        const snap = await getDocs(q);
        
        if (snap.empty) {
            alert("Guard profile not found in database.");
            return;
        }
        
        const guardData = snap.docs[0].data();
        assignedSociety = guardData.society; 
        
        // Populate dropdown with guards from the same society
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
        alert("Logged in successfully!");
        
    } catch (e) {
        console.error("Login error:", e);
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
    
    const name = select.value;
    const phone = select.options[select.selectedIndex].dataset.phone;
    
    try {
        await updateDoc(doc(db, "societies", assignedSociety), { 
            activeGuardName: name, 
            activeGuardPhone: phone 
        });
        alert("Duty activated for " + assignedSociety);
    } catch (e) {
        console.error("Activation error:", e);
        alert("Failed to activate duty: " + e.message);
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
            resultDiv.innerHTML = `
                Flat: ${d.flatNumber}<br>
                <a href="tel:${d.mobileNumber}">📞 Call: ${d.mobileNumber}</a>`;
        } else {
            resultDiv.innerHTML = "Not found in your society.";
        }
    } catch (e) {
        console.error("Search error:", e);
        alert("Search failed: " + e.message);
    }
});
