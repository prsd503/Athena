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

window.downloadCSV = (content, filename) => {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

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

window.deleteEntry = (id) => {
    pendingDeleteId = id;
    window.showModal("Are you sure you want to delete this record?", true);
};

window.confirmDelete = async () => {
    try {
        await deleteDoc(doc(db, "vehicles", pendingDeleteId));
        window.closeModal();
        window.showModal("Data deleted successfully.");
        document.getElementById('adminSearchBtn').click();
    } catch (e) { window.showModal("Delete error: " + e.message); }
    pendingDeleteId = null;
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

    // 3. Search Vehicles
    document.getElementById('adminSearchBtn')?.addEventListener('click', async (event) => {
        const qVal = document.getElementById('adminSearch').value.trim().toUpperCase();
        const container = document.getElementById('admin-results');
        container.innerHTML = "";
        if (!qVal) return window.showModal("Enter vehicle number.");
        const q = query(collection(db, "vehicles"), where("vehicleNumber", "==", qVal), where("societyName", "==", assignedSociety));
        const snapshot = await getDocs(q);
        if (snapshot.empty) { if (event.isTrusted) window.showModal("No data found."); return; }
        snapshot.forEach((d) => {
            const data = d.data();
            container.innerHTML += `<div><b>${data.vehicleNumber}</b> | Flat: ${data.flatNumber}</div>`;
        });
    });

    // 4. Save/Update Vehicle (Simplified for brevity; keep your existing logic)
    // ... [Insert your existing vehicle Save/Update logic here]

    // 5. Bulk Management
    // ... [Insert your existing bulk management logic here]

    // 6. Search Guard by Name
    document.getElementById('searchGuardBtn')?.addEventListener('click', async () => {
        const nameToSearch = document.getElementById('searchGuardName').value.trim();
        if (!nameToSearch) return window.showModal("Enter a name to search.");
        const q = query(collection(db, "guards"), where("name", "==", nameToSearch), where("society", "==", assignedSociety));
        const snap = await getDocs(q);
        if (!snap.empty) {
            const docSnap = snap.docs[0];
            const data = docSnap.data();
            editingDocId = docSnap.id;
            document.getElementById('gEmail').value = data.email || "";
            document.getElementById('gName').value = data.name || "";
            document.getElementById('gPhone').value = data.phone || "";
            window.showModal("Guard found.");
        } else {
            window.showModal("No guard found.");
        }
    });

    // 7. Add/Update Guard
    document.getElementById('addGuardBtn')?.addEventListener('click', async () => {
        const email = document.getElementById('gEmail').value.trim();
        const name = document.getElementById('gName').value.trim();
        const phone = document.getElementById('gPhone').value.trim();

        if (!email || !name || !phone) return window.showModal("Fill all fields.");

        if (!editingDocId) {
            const q = query(collection(db, "guards"), where("name", "==", name), where("society", "==", assignedSociety));
            const snap = await getDocs(q);
            if (!snap.empty) return window.showModal("Error: Guard already exists.");
            await addDoc(collection(db, "guards"), { email, name, phone, society: assignedSociety });
            window.showModal("New guard added.");
        } else {
            await updateDoc(doc(db, "guards", editingDocId), { email, name, phone, society: assignedSociety });
            window.showModal("Guard updated.");
        }
        editingDocId = null;
    });

    // 8. Delete Guard
    document.getElementById('deleteGuardBtn')?.addEventListener('click', async () => {
        if (!editingDocId) return window.showModal("Search for a guard first.");
        await deleteDoc(doc(db, "guards", editingDocId));
        window.showModal("Guard deleted.");
        editingDocId = null;
    });
});
