import { auth, db } from "./app.js";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, collection, addDoc, query, where, getDocs, deleteDoc, updateDoc, writeBatch } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let assignedSociety = "";
let editingDocId = null;
let pendingDeleteId = null; // New: stores ID for delete confirmation

// --- UI Helpers ---
window.closeModal = () => { document.getElementById('customModal').style.display = 'none'; };
window.showModal = (msg, showConfirm = false) => {
    document.getElementById('modalMessage').innerText = msg;
    // Show/Hide the confirm button based on the second argument
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    if (confirmBtn) confirmBtn.style.display = showConfirm ? 'inline-block' : 'none';
    document.getElementById('customModal').style.display = 'block';
};

async function isVehicleExists(vNum, society) {
    const q = query(collection(db, "vehicles"), 
              where("vehicleNumber", "==", vNum), 
              where("societyName", "==", society));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
}

window.downloadCSV = (content, filename) => {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // Best practice to free up memory
    URL.revokeObjectURL(url); 
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

// Updated Delete Function: triggers modal instead of confirm()
window.deleteEntry = (id) => {
    pendingDeleteId = id;
    window.showModal("Are you sure you want to delete this record?", true);
};

// New: This function performs the actual delete
window.confirmDelete = async () => {
    try {
        await deleteDoc(doc(db, "vehicles", pendingDeleteId));
        window.closeModal();
        window.showModal("Record deleted.");
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


    //bulk delete 
    
    document.getElementById('bulkDeleteBtn')?.addEventListener('click', () => {
    const file = document.getElementById('excelInput').files[0];
    if (!file) return window.showModal("Select a CSV file first.");
    
    const reader = new FileReader();
    reader.onload = async (e) => {
        const rows = e.target.result.split('\n').slice(1);
        const batch = writeBatch(db);
        let deletedCount = 0;

        // Process all rows
        for (const row of rows) {
            const vNum = row.split(',')[0]?.trim().toUpperCase();
            if (!vNum) continue;

            const q = query(collection(db, "vehicles"), 
                where("vehicleNumber", "==", vNum), 
                where("societyName", "==", assignedSociety));
            const snapshot = await getDocs(q);

            snapshot.forEach((doc) => {
                batch.delete(doc.ref);
                deletedCount++;
            });
        }

        // Only commit if we found items to delete
        if (deletedCount > 0) {
            await batch.commit();
            // --- UPDATED MESSAGE HERE ---
            window.showModal(`Deleted ${deletedCount} vehicles successfully.`);
            document.getElementById('adminSearchBtn').click(); 
        } else {
            window.showModal("No matching vehicles found to delete.");
        }
    };
    reader.readAsText(file);
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
                    <p><b>${data.vehicleNumber}</b> | Flat/Name: ${data.flatNumber}</p>
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

    if (!editingDocId) {
        // Check for duplicates only if adding new
        if (await isVehicleExists(v, assignedSociety)) {
            return window.showModal("This vehicle is already registered in your society.");
        }
        await addDoc(collection(db, "vehicles"), { vehicleNumber: v, flatNumber: f, mobileNumber: m, societyName: assignedSociety });
        window.showModal("Added!");
    } else {
        await updateDoc(doc(db, "vehicles", editingDocId), { vehicleNumber: v, flatNumber: f, mobileNumber: m });
        window.showModal("Updated!");
        editingDocId = null;
    }
});


    // 5. Bulk Management
    document.getElementById('importBtn')?.addEventListener('click', () => {
    const file = document.getElementById('excelInput').files[0];
    if (!file) return window.showModal("Select file.");
    const reader = new FileReader();
    
    reader.onload = async (e) => {
        const rows = e.target.result.split('\n').slice(1);
        const batch = writeBatch(db);
        let count = 0;

        for (const row of rows) {
            const c = row.split(',');
            if (c.length >= 2) {
                const vNum = c[0].trim().toUpperCase();
                // Check if exists in DB before adding to batch
                if (!(await isVehicleExists(vNum, assignedSociety))) {
                    batch.set(doc(collection(db, "vehicles")), { 
                        vehicleNumber: vNum, 
                        flatNumber: c[1].trim(), 
                        mobileNumber: c[2]?.trim() || "", 
                        societyName: assignedSociety 
                    });
                    count++;
                }
            }
        }
        await batch.commit();
        window.showModal(`Imported ${count} new vehicles. Duplicates were skipped.`);
    };
    reader.readAsText(file);
});


    
    // FIX: Explicitly call window.downloadCSV
    // Update Template Download:
document.getElementById('downloadTemplateBtn')?.addEventListener('click', () => {
    window.downloadCSV("VehicleNumber,FlatNumber/Name,MobileNumber\n", "Vehicle_Template.csv");
});

// Update Export Download:
document.getElementById('exportBtn')?.addEventListener('click', async () => {
    const snapshot = await getDocs(query(collection(db, "vehicles"), where("societyName", "==", assignedSociety)));
    let csv = "VehicleNumber,FlatNumber,MobileNumber\n";
    snapshot.forEach(d => { 
        const dt = d.data(); 
        csv += `${dt.vehicleNumber},${dt.flatNumber},${dt.mobileNumber || ''}\n`; 
    });
    window.downloadCSV(csv, "Vehicles.csv");
});

});
