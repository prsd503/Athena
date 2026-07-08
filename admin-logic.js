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

// --- Action Helpers (Global) ---
window.editEntry = (v, f, m) => {
    document.getElementById('vNum').value = v;
    document.getElementById('fNum').value = f;
    document.getElementById('mNum').value = m;
    window.showModal("Details loaded into 'Add Vehicle' form for editing.");
};

window.deleteEntry = async (id) => {
    if (confirm("Are you sure you want to delete this record?")) {
        await deleteDoc(doc(db, "vehicles", id));
        window.showModal("Record deleted.");
        document.getElementById('adminSearchBtn').click(); // Refresh search
    }
};

document.addEventListener('DOMContentLoaded', () => {

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

    document.getElementById('loginBtn')?.addEventListener('click', async () => {
        const email = document.getElementById('email').value.trim();
        const pass = document.getElementById('pass').value.trim();
        if (!email || !pass) return window.showModal("Enter Email and Password.");
        try {
            await signInWithEmailAndPassword(auth, email, pass);
        } catch (e) {
            window.showModal(e.code === 'auth/invalid-email' || e.code === 'auth/invalid-credential' ? "Invalid login credentials." : "Login error: " + e.message);
        }
    });

    document.getElementById('logoutBtn')?.addEventListener('click', async () => { await signOut(auth); location.reload(); });

    // Correct Search Handler with WhatsApp, Edit, Delete
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
            const cleanPhone = data.mobileNumber ? data.mobileNumber.replace(/\D/g, '') : "";
            const waLink = cleanPhone ? `https://wa.me/${cleanPhone}?text=Hello, query regarding vehicle ${data.vehicleNumber}` : "#";
            
            container.innerHTML += `
                <div style="background:#fdf6e3; padding:10px; border-radius:10px; margin-bottom:10px; text-align:left; border: 1px solid #8d6e63;">
                    <p><b>Vehicle:</b> ${data.vehicleNumber} | <b>Flat:</b> ${data.flatNumber}</p>
                    <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                        <a href="${waLink}" target="_blank" style="background:#25d366; color:white; padding:5px 8px; border-radius:5px; text-decoration:none; font-size:0.8rem;">WhatsApp</a>
                        <button onclick="editEntry('${data.vehicleNumber}', '${data.flatNumber}', '${data.mobileNumber || ''}')" style="background:#6d4c41; font-size:0.8rem;">Edit</button>
                        <button onclick="deleteEntry('${d.id}')" style="background:#d32f2f; font-size:0.8rem;">Delete</button>
                    </div>
                </div>`;
        });
    });

    document.getElementById('saveBtn')?.addEventListener('click', async () => {
        const v = document.getElementById('vNum').value.trim().toUpperCase();
        const f = document.getElementById('fNum').value.trim();
        const m = document.getElementById('mNum').value.trim();
        if (!v || !f) return window.showModal("Fill Vehicle and Flat fields.");
        await addDoc(collection(db, "vehicles"), { vehicleNumber: v, flatNumber: f, mobileNumber: m, societyName: assignedSociety });
        window.showModal("Added!");
    });

    document.getElementById('downloadTemplateBtn')?.addEventListener('click', () => {
        downloadCSV("VehicleNumber,FlatNumber,MobileNumber\n", "Vehicle_Template.csv");
    });
});
