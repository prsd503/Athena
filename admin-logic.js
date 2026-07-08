import { auth, db } from "./app.js";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, collection, addDoc, query, where, getDocs, deleteDoc, updateDoc, writeBatch } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let assignedSociety = "";

// --- UI Helpers ---
window.closeModal = () => { document.getElementById('customModal').style.display = 'none'; };
window.showModal = (msg) => {
    document.getElementById('modalMessage').innerText = msg;
    document.getElementById('customModal').style.display = 'block';
};

const downloadCSV = (content, filename) => {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

document.addEventListener('DOMContentLoaded', () => {

    // 1. Auth State Management
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const adminDoc = await getDoc(doc(db, "admins", user.email));
            if (adminDoc.exists()) {
                assignedSociety = adminDoc.data().society;
                document.getElementById('login-section').style.display = 'none';
                document.getElementById('search-section').style.display = 'block';
                document.getElementById('data-section').style.display = 'block';
            }
        }
    });

    
    // 2. Login Handler
document.getElementById('loginBtn')?.addEventListener('click', async () => {
    const email = document.getElementById('email').value.trim();
    const pass = document.getElementById('pass').value.trim();
    
    if (!email || !pass) return window.showModal("Please enter Email and Password.");
    
    try {
        await signInWithEmailAndPassword(auth, email, pass);
    } catch (e) {
        // Handle specific Firebase error codes
        if (e.code === 'auth/invalid-email' || e.code === 'auth/invalid-credential' || e.code === 'auth/user-not-found') {
            window.showModal("Invalid login credentials.");
        } else {
            window.showModal("Login error: " + e.message);
        }
    }
});

    // 3. Logout Handler
    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
        try {
            await signOut(auth);
            location.reload();
        } catch (e) { window.showModal("Error: " + e.message); }
    });

    // 4. Updated Search Handler ---
document.getElementById('adminSearchBtn')?.addEventListener('click', async () => {
    const qVal = document.getElementById('adminSearch').value.trim().toUpperCase();
    const container = document.getElementById('admin-results');
    container.innerHTML = "";
    if (!qVal) return window.showModal("Enter vehicle number.");

    const q = query(collection(db, "vehicles"), where("vehicleNumber", "==", qVal), where("societyName", "==", assignedSociety));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return window.showModal("No data found.");
    
    snapshot.forEach((d) => {
        const data = d.data();
        // WhatsApp link construction
        const waLink = data.mobileNumber ? `https://wa.me/${data.mobileNumber.replace(/\D/g, '')}?text=Hello, query regarding vehicle ${data.vehicleNumber}` : "#";
        
        container.innerHTML += `
            <div style="background:#fdf6e3; padding:10px; border-radius:10px; margin-bottom:10px;">
                <p><b>${data.vehicleNumber}</b> | Flat/Name: ${data.flatNumber}</p>
                <a href="${waLink}" target="_blank" style="background:#25d366; color:white; padding:5px 10px; border-radius:5px; text-decoration:none; font-size:0.9rem;">Message on WhatsApp</a>
            </div>`;
    });
});

    // 5. Save/Import/Export Handlers
    document.getElementById('saveBtn')?.addEventListener('click', async () => {
        const v = document.getElementById('vNum').value.trim().toUpperCase();
        const f = document.getElementById('fNum').value.trim();
        if (!v || !f) return window.showModal("Fill fields.");
        await addDoc(collection(db, "vehicles"), { vehicleNumber: v, flatNumber: f, societyName: assignedSociety });
        window.showModal("Added!");
    });

document.getElementById('importBtn')?.addEventListener('click', () => {
        const file = document.getElementById('excelInput').files[0];
        if (!file) return window.showModal("Select file.");
        const reader = new FileReader();
        reader.onload = async (e) => {
            const rows = e.target.result.split('\n').slice(1);
            const batch = writeBatch(db);
            rows.forEach(row => {
                const c = row.split(',');
                if (c.length >= 2) batch.set(doc(collection(db, "vehicles")), { vehicleNumber: c[0].trim().toUpperCase(), flatNumber: c[1].trim(), societyName: assignedSociety });
            });
            await batch.commit();
            window.showModal("Imported!");
        };
        reader.readAsText(file);
    });
});
// Add this block to your existing admin-logic.js
document.getElementById('downloadTemplateBtn')?.addEventListener('click', () => {
    const templateContent = "VehicleNumber,FlatNumber,MobileNumber\n";
    downloadCSV(templateContent, "Vehicle_Template.csv");
});


    
    document.getElementById('exportBtn')?.addEventListener('click', async () => {
        const snapshot = await getDocs(query(collection(db, "vehicles"), where("societyName", "==", assignedSociety)));
        let csv = "VehicleNumber,FlatNumber,MobileNumber\n";
        snapshot.docs.forEach(d => { const dt = d.data(); csv += `${dt.vehicleNumber},${dt.flatNumber},${dt.mobileNumber}\n`; });
        downloadCSV(csv, "Vehicles.csv");
    });
    
    
