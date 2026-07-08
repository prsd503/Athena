import { auth, db } from "./app.js";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, collection, addDoc, query, where, getDocs, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let assignedSociety = "";
let editingDocId = null; 
let pendingDeleteId = null; 

// UI Helpers
window.closeModal = () => { document.getElementById('customModal').style.display = 'none'; };
window.showModal = (msg, showConfirm = false) => {
    document.getElementById('modalMessage').innerText = msg;
    document.getElementById('confirmDeleteBtn').style.display = showConfirm ? 'inline-block' : 'none';
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

// Global Actions
window.editEntry = (v, f, m, id) => {
    editingDocId = id;
    document.getElementById('vNum').value = v;
    document.getElementById('fNum').value = f;
    document.getElementById('mNum').value = m;
    document.getElementById('saveBtn').innerText = "Update Registry";
    window.showModal("Details loaded. Edit and click Update.");
};

window.deleteEntry = (id) => {
    pendingDeleteId = id;
    window.showModal("Are you sure you want to delete this record?", true);
};

window.confirmDelete = async () => {
    try {
        await deleteDoc(doc(db, "vehicles", pendingDeleteId));
        window.closeModal();
        window.showModal("Record deleted.");
        document.getElementById('adminSearchBtn').click();
    } catch (e) { window.showModal("Error: " + e.message); }
};

document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, async (u) => {
        if (u) {
            const snap = await getDoc(doc(db, "admins", u.email));
            if (snap.exists()) {
                assignedSociety = snap.data().society;
                document.getElementById('login-section').style.display = 'none';
                document.getElementById('search-section').style.display = 'block';
                document.getElementById('data-section').style.display = 'block';
            }
        }
    });

    document.getElementById('loginBtn')?.addEventListener('click', async () => {
        try { await signInWithEmailAndPassword(auth, document.getElementById('email').value, document.getElementById('pass').value); } 
        catch (e) { window.showModal("Error: " + e.message); }
    });

    document.getElementById('logoutBtn')?.addEventListener('click', () => { signOut(auth); location.reload(); });

    document.getElementById('adminSearchBtn')?.addEventListener('click', async () => {
        const qVal = document.getElementById('adminSearch').value.trim().toUpperCase();
        const container = document.getElementById('admin-results');
        container.innerHTML = "";
        const q = query(collection(db, "vehicles"), where("vehicleNumber", "==", qVal), where("societyName", "==", assignedSociety));
        const snap = await getDocs(q);
        if (snap.empty) return window.showModal("No data found.");
        snap.forEach((d) => {
            const data = d.data();
            container.innerHTML += `
                <div style="background:#fdf6e3; padding:10px; border-radius:10px; margin-bottom:10px; border: 1px solid #8d6e63;">
                    <p><b>Vehicle:</b> ${data.vehicleNumber} | <b>Flat:</b> ${data.flatNumber}</p>
                    <button onclick="editEntry('${data.vehicleNumber}', '${data.flatNumber}', '${data.mobileNumber || ''}', '${d.id}')">Edit</button>
                    <button onclick="deleteEntry('${d.id}')" style="background:#d32f2f;">Delete</button>
                </div>`;
        });
    });

    document.getElementById('saveBtn')?.addEventListener('click', async () => {
        const v = document.getElementById('vNum').value.trim().toUpperCase();
        const f = document.getElementById('fNum').value.trim();
        const m = document.getElementById('mNum').value.trim();
        if (editingDocId) {
            await updateDoc(doc(db, "vehicles", editingDocId), { vehicleNumber: v, flatNumber: f, mobileNumber: m });
            window.showModal("Updated!");
            editingDocId = null;
            document.getElementById('saveBtn').innerText = "Save to Registry";
        } else {
            await addDoc(collection(db, "vehicles"), { vehicleNumber: v, flatNumber: f, mobileNumber: m, societyName: assignedSociety });
            window.showModal("Added!");
        }
    });

    document.getElementById('exportBtn')?.addEventListener('click', async () => {
        const snap = await getDocs(query(collection(db, "vehicles"), where("societyName", "==", assignedSociety)));
        let csv = "VehicleNumber,FlatNumber,MobileNumber\n";
        snap.forEach(d => { const dt = d.data(); csv += `${dt.vehicleNumber},${dt.flatNumber},${dt.mobileNumber}\n`; });
        downloadCSV(csv, "Vehicles.csv");
    });
});
