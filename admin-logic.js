import { auth, db } from "./app.js";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, collection, addDoc, query, where, getDocs, deleteDoc, updateDoc, writeBatch } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let assignedSociety = "";
let editingDocId = null;
let pendingDeleteId = null;

// --- UI Helpers ---
window.closeModal = () => { document.getElementById('customModal').style.display = 'none'; };
window.showModal = (msg, showConfirm = false) => {
    document.getElementById('modalMessage').innerText = msg;
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    if (confirmBtn) confirmBtn.style.display = showConfirm ? 'inline-block' : 'none';
    document.getElementById('customModal').style.display = 'block';
};

// --- Core Logic ---
async function isVehicleExists(vNum, society) {
    const q = query(collection(db, "vehicles"), where("vehicleNumber", "==", vNum), where("societyName", "==", society));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
}

window.editEntry = (v, f, m, id) => {
    editingDocId = id;
    document.getElementById('vNum').value = v;
    document.getElementById('fNum').value = f;
    document.getElementById('mNum').value = m || "";
    document.getElementById('saveBtn').innerText = "Update Registry";
    window.showModal("Details loaded. Edit and click Update.");
};

window.confirmDelete = async () => {
    if (!pendingDeleteId) return;
    try {
        await deleteDoc(doc(db, "vehicles", pendingDeleteId));
        window.closeModal();
        window.showModal("Data deleted successfully.");
        document.getElementById('adminSearchBtn').click();
    } catch (e) { window.showModal("Delete error: " + e.message); }
    pendingDeleteId = null;
};

document.addEventListener('DOMContentLoaded', () => {
    // 1. Auth Observer
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                const adminDoc = await getDoc(doc(db, "admins", user.email));
                if (adminDoc.exists()) {
                    assignedSociety = adminDoc.data().society;
                    document.getElementById('login-section').style.display = 'none';
                    document.getElementById('search-section').style.display = 'block';
                    document.getElementById('data-section').style.display = 'block';
                } else {
                    window.showModal("User is authenticated but not registered as an Admin.");
                }
            } catch (e) { window.showModal("Error fetching admin data: " + e.message); }
        }
    });

    // 2. Login
    document.getElementById('loginBtn')?.addEventListener('click', async () => {
        const email = document.getElementById('email').value.trim();
        const pass = document.getElementById('pass').value.trim();
        if (!email || !pass) return window.showModal("Enter Email and Password.");
        try { 
            await signInWithEmailAndPassword(auth, email, pass); 
        }
        catch (e) { window.showModal("Login failed: " + e.message); }
    });

    // 3. Search
    document.getElementById('adminSearchBtn')?.addEventListener('click', async () => {
        const qVal = document.getElementById('adminSearch').value.trim().toUpperCase();
        const container = document.getElementById('admin-results');
        container.innerHTML = "";
        
        if (!qVal || !assignedSociety) return window.showModal("Please search a valid vehicle number.");

        const q = query(collection(db, "vehicles"), where("vehicleNumber", "==", qVal), where("societyName", "==", assignedSociety));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) return window.showModal("No data found for this society.");
        
        snapshot.forEach((d) => {
            const data = d.data();
            container.innerHTML += `
            <div style="background:#fdf6e3; padding:10px; border-radius:10px; margin-bottom:10px; border: 1px solid #8d6e63;">
                <p><b>${data.vehicleNumber}</b> | Flat: ${data.flatNumber}</p>
                <button onclick="editEntry('${data.vehicleNumber}', '${data.flatNumber}', '${data.mobileNumber || ''}', '${d.id}')">Edit</button>
                <button onclick="window.pendingDeleteId='${d.id}'; window.showModal('Confirm delete?', true)">Delete</button>
            </div>`;
        });
    });

    // 4. Save/Update
    document.getElementById('saveBtn')?.addEventListener('click', async () => {
        const v = document.getElementById('vNum').value.trim().toUpperCase();
        const f = document.getElementById('fNum').value.trim();
        const m = document.getElementById('mNum').value.trim();
        const type = document.getElementById('vType').value;

        if (!v || !f) return window.showModal("Fill required fields.");

        try {
            if (!editingDocId) {
                if (await isVehicleExists(v, assignedSociety)) return window.showModal("Vehicle already exists!");
                await addDoc(collection(db, "vehicles"), { vehicleNumber: v, flatNumber: f, mobileNumber: m, vehicleType: type, societyName: assignedSociety });
            } else {
                await updateDoc(doc(db, "vehicles", editingDocId), { vehicleNumber: v, flatNumber: f, mobileNumber: m, vehicleType: type });
                editingDocId = null;
                document.getElementById('saveBtn').innerText = "Save to Registry";
            }
            window.showModal("Operation successful.");
        } catch (e) { window.showModal("Error: " + e.message); }
    });
});
