// 1. Import initialized services from your app.js
import { auth, db } from "./app.js"; 
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, updateDoc, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Global variable to store society
let assignedSociety = "";

// 1. Handle Login
document.getElementById('loginBtn')?.addEventListener('click', async () => {
    const email = document.getElementById('email').value.trim();
    const pass = document.getElementById('pass').value.trim();
    
    try {
        await signInWithEmailAndPassword(auth, email, pass);
        
        // Find guard info based on email
        const q = query(collection(db, "guards"), where("email", "==", email));
        const snap = await getDocs(q);
        
        if (snap.empty) return alert("Guard profile not found.");
        
        const guardData = snap.docs[0].data();
        assignedSociety = guardData.society; // Store for later
        
        // Populate dropdown with guards from the same society
        const qGuards = query(collection(db, "guards"), where("society", "==", assignedSociety));
        const guards = await getDocs(qGuards);
        
        const select = document.getElementById('guardSelect');
        select.innerHTML = "";
        guards.forEach(d => {
            const data = d.data();
            select.innerHTML += `<option value="${data.name}" data-phone="${data.phone}">${data.name}</option>`;
        });
        
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('portalSection').style.display = 'block';
    } catch (e) {
        alert("Login failed: " + e.message);
    }
});

// 2. Activate Duty
document.getElementById('activateBtn')?.addEventListener('click', async () => {
    const select = document.getElementById('guardSelect');
    const name = select.value;
    const phone = select.options[select.selectedIndex].dataset.phone;
    
    // Update the society document dynamically
    await updateDoc(doc(db, "societies", assignedSociety), { 
        activeGuardName: name, 
        activeGuardPhone: phone 
    });
    alert("Duty activated for " + assignedSociety);
});

// 3. Search Vehicle (Fixed to use query)
document.getElementById('searchBtn')?.addEventListener('click', async () => {
    const vNum = document.getElementById('vSearch').value.trim().toUpperCase();
    if (!vNum) return alert("Enter vehicle number");

    const q = query(collection(db, "vehicles"), 
        where("vehicleNumber", "==", vNum), 
        where("societyName", "==", assignedSociety)
    );
    const snap = await getDocs(q);
    
    if (!snap.empty) {
        const d = snap.docs[0].data();
        document.getElementById('result').innerHTML = `
            Flat: ${d.flatNumber}<br>
            <a href="tel:${d.mobileNumber}">📞 Call: ${d.mobileNumber}</a>`;
    } else {
        document.getElementById('result').innerHTML = "Not found in your society.";
    }
});
