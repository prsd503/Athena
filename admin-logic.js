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

document.addEventListener('DOMContentLoaded', () => {
    // 1. Auth Logic
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

    // 2. Search Guard by Name
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
            window.showModal("No guard found with that name.");
        }
    });

    // 3. Save/Update Guard
    document.getElementById('addGuardBtn')?.addEventListener('click', async () => {
        const email = document.getElementById('gEmail').value.trim();
        const name = document.getElementById('gName').value.trim();
        const phone = document.getElementById('gPhone').value.trim();

        if (!email || !name || !phone) return window.showModal("Fill all fields.");

        if (editingDocId) {
            await updateDoc(doc(db, "guards", editingDocId), { email, name, phone, society: assignedSociety });
            window.showModal("Guard updated.");
        } else {
            await addDoc(collection(db, "guards"), { email, name, phone, society: assignedSociety });
            window.showModal("Guard added.");
        }
        editingDocId = null;
    });

    // 4. Delete Guard
    document.getElementById('deleteGuardBtn')?.addEventListener('click', async () => {
        if (!editingDocId) return window.showModal("Search for a guard first.");
        await deleteDoc(doc(db, "guards", editingDocId));
        window.showModal("Guard deleted.");
        document.getElementById('gEmail').value = "";
        document.getElementById('gName').value = "";
        document.getElementById('gPhone').value = "";
        editingDocId = null;
    });

    // ... (Add your existing vehicle logic here)
            const reader = new FileReader();
        reader.onload = async (e) => {
            const rows = e.target.result.split('\n').slice(1);
            const batch = writeBatch(db);
            let deletedCount = 0;
            for (const row of rows) {
                const vNum = row.split(',')[0]?.trim().toUpperCase();
                if (!vNum) continue;
                const q = query(collection(db, "vehicles"), where("vehicleNumber", "==", vNum), where("societyName", "==", assignedSociety));
                const snapshot = await getDocs(q);
                snapshot.forEach((doc) => { batch.delete(doc.ref); deletedCount++; });
            }
            if (deletedCount > 0) { await batch.commit(); window.showModal(`Deleted ${deletedCount} vehicles.`); document.getElementById('adminSearchBtn').click(); }
            else window.showModal("No matching vehicles found.");
        };
        reader.readAsText(file);
    });

    document.getElementById('downloadTemplateBtn')?.addEventListener('click', () => {
        window.downloadCSV("VehicleNumber,FlatNumber/Name,MobileNumber\n", "Vehicle_Template.csv");
    });

    document.getElementById('exportBtn')?.addEventListener('click', async () => {
        const snapshot = await getDocs(query(collection(db, "vehicles"), where("societyName", "==", assignedSociety)));
        let csv = "VehicleNumber,FlatNumber,MobileNumber\n";
        snapshot.forEach(d => { const dt = d.data(); csv += `${dt.vehicleNumber},${dt.flatNumber},${dt.mobileNumber || ''}\n`; });
        window.downloadCSV(csv, "Vehicles.csv");
    });
});

});
