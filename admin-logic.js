import { auth, db } from "./app.js";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, collection, addDoc, query, where, getDocs, deleteDoc, updateDoc, writeBatch } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let assignedSociety = "";
let editingDocId = null;

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

// --- Edit/Delete Helpers ---
window.editEntry = (v, f, m, id) => {
    editingDocId = id;
    document.getElementById('vNum').value = v;
    document.getElementById('fNum').value = f;
    document.getElementById('mNum').value = m || "";
    document.getElementById('saveBtn').innerText = "Update Registry";
    window.showModal("Details loaded. Edit and click Update.");
};

window.deleteEntry = async (id) => {
    if (confirm("Are you sure you want to delete this record?")) {
        try {
            await deleteDoc(doc(db, "vehicles", id));
            window.showModal("Record deleted.");
            document.getElementById('adminSearchBtn').click();
        } catch (e) { window.showModal("Delete error: " + e.message); }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // 1. Auth
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

    // 2. Login/Logout
    document.getElementById('loginBtn')?.addEventListener('click', async () => {
        const email = document.getElementById('email').value.trim();
        const pass = document.getElementById('pass').value.trim();
        if (!email || !pass) return window.showModal("Enter Email and Password.");
        try { await signInWithEmailAndPassword(auth, email, pass); }
        catch (e) { window.showModal("Login error: " + e.message); }
    });
    document.getElementById('logoutBtn')?.addEventListener('click', async () => { await signOut(auth); location.reload(); });

    // 3. Search
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
            const waLink = data.mobileNumber ? `https://wa.me/${data.mobileNumber.replace(/\D/g, '')}?text=Hello, query regarding vehicle ${data.vehicleNumber}` : "#";
            container.innerHTML += `
                <div style="background:#fdf6e3; padding:10px; border-radius:10px; margin-bottom:10px; text-align:left; border: 1px solid #8d6e63;">
                    <p><b>${data.vehicleNumber}</b> | Flat: ${data.flatNumber}</p>
                    <a href="${waLink}" target="_blank" style="background:#25d366; color:white; padding:5px 8px; border-radius:5px; text-decoration:none; font-size:0.8rem;">WhatsApp</a>
                    <button onclick="editEntry('${data.vehicleNumber}', '${data.flatNumber}', '${data.mobileNumber || ''}', '${d.id}')" style="background:#6d4c41; font-size:0.8rem;">Edit</button>
                    <button onclick="deleteEntry('${d.id}')" style="background:#d32f2f; font-size:0.8rem;">Delete</button>
                </div>`;
        });
    });

    // 4. Save/Update
    document.getElementById('saveBtn')?.addEventListener('click', async () => {
        const v = document.getElementById('vNum').value.trim().toUpperCase();
        const f = document.getElementById('fNum').value.trim();
        const m = document.getElementById('mNum').value.trim();
        if (!v || !f) return window.showModal("Fill fields.");
        
        if (editingDocId) {
            await updateDoc(doc(db, "vehicles", editingDocId), { vehicleNumber: v, flatNumber: f, mobileNumber: m });
            window.showModal("Record updated successfully!");
            editingDocId = null;
            document.getElementById('saveBtn').innerText = "Save to Registry";
        } else {
            await addDoc(collection(db, "vehicles"), { vehicleNumber: v, flatNumber: f, mobileNumber: m, societyName: assignedSociety });
            window.showModal("Added successfully!");
        }
        document.getElementById('vNum').value = '';
        document.getElementById('fNum').value = '';
        document.getElementById('mNum').value = '';
    });

    // 5. Bulk Management (Ensured these are active)
    document.getElementById('importBtn')?.addEventListener('click', () => {
        const file = document.getElementById('excelInput').files[0];
        if (!file) return window.showModal("Select file.");
        const reader = new FileReader();
        reader.onload = async (e) => {
            const rows = e.target.result.split('\n').slice(1);
            const batch = writeBatch(db);
            rows.forEach(row => {
                const c = row.split(',');
                if (c.length >= 2) batch.set(doc(collection(db, "vehicles")), { vehicleNumber: c[0].trim().toUpperCase(), flatNumber: c[1].trim(), mobileNumber: c[2]?.trim() || "", societyName: assignedSociety });
            });
            await batch.commit();
            window.showModal("Imported successfully!");
        };
        reader.readAsText(file);
    });

    document.getElementById('downloadTemplateBtn')?.addEventListener('click', () => {
        downloadCSV("VehicleNumber,FlatNumber,MobileNumber\n", "Vehicle_Template.csv");
    });

    document.getElementById('exportBtn')?.addEventListener('click', async () => {
        const snapshot = await getDocs(query(collection(db, "vehicles"), where("societyName", "==", assignedSociety)));
        let csv = "VehicleNumber,FlatNumber,MobileNumber\n";
        snapshot.forEach(d => { 
            const dt = d.data(); 
            csv += `${dt.vehicleNumber},${dt.flatNumber},${dt.mobileNumber || ''}\n`; 
        });
        downloadCSV(csv, "Vehicles.csv");
    });
});
