//admin-logic.js
import { auth, db } from "./app.js";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, setDoc, collection, addDoc, query, where, getDocs, deleteDoc, updateDoc, writeBatch, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// --- Notice Board Helper Function ---
async function loadNoticeData() {
    if (!assignedSociety) return;
    try {
        const noticeDoc = await getDoc(doc(db, "notices", assignedSociety));
        if (noticeDoc.exists()) {
            const data = noticeDoc.data();
            if (document.getElementById('todayMsg')) document.getElementById('todayMsg').value = data.todayMessage || "";
            if (document.getElementById('tomorrowMsg')) document.getElementById('tomorrowMsg').value = data.tomorrowMessage || "";
        }
    } catch (e) {
        console.error("Error loading notices: ", e);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. Auth ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const adminDoc = await getDoc(doc(db, "admins", user.email));
            if (adminDoc.exists()) {
                assignedSociety = adminDoc.data().society;
                document.getElementById('login-section').style.display = 'none';
                document.getElementById('search-section').style.display = 'block';
                document.getElementById('data-section').style.display = 'block';
                
                // Fixed: The function now safely executes here
                loadNoticeData();
            }
        }
    });

    // --- 2. Login/Logout ---
    document.getElementById('loginBtn')?.addEventListener('click', async () => {
        const email = document.getElementById('email').value.trim();
        const pass = document.getElementById('pass').value.trim();
        if (!email || !pass) return window.showModal("Enter Email and Password.");
        try { await signInWithEmailAndPassword(auth, email, pass); }
        catch (e) { window.showModal("Login error: " + e.message); }
    });

    document.getElementById('logoutBtn')?.addEventListener('click', async () => { 
        await signOut(auth); 
        location.reload(); 
    });

    // --- 3. Search Vehicles ---
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

    // --- 4. Save/Update Vehicles ---
    document.getElementById('saveBtn')?.addEventListener('click', async () => {
        const v = document.getElementById('vNum').value.trim().toUpperCase();
        const f = document.getElementById('fNum').value.trim();
        const m = document.getElementById('mNum').value.trim();
        const type = document.getElementById('vType').value;

        if (!v || !f) return window.showModal("Fill fields.");

        if (!editingDocId) {
            if (await isVehicleExists(v, assignedSociety)) return window.showModal("Vehicle exists!");
            await addDoc(collection(db, "vehicles"), { 
                vehicleNumber: v, flatNumber: f, mobileNumber: m, vehicleType: type, societyName: assignedSociety 
            });
            window.showModal("Added!");
        } else {
            await updateDoc(doc(db, "vehicles", editingDocId), { 
                vehicleNumber: v, flatNumber: f, mobileNumber: m, vehicleType: type 
            });
            window.showModal("Updated!");
            editingDocId = null;
            document.getElementById('saveBtn').innerText = "Save to Registry";
        }
    });

    // --- 5. Bulk Management ---
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
                    const vType = c[3]?.trim() || "2-Wheeler"; 
                    
                    if (!(await isVehicleExists(vNum, assignedSociety))) {
                        batch.set(doc(collection(db, "vehicles")), { 
                            vehicleNumber: vNum, 
                            flatNumber: c[1].trim(), 
                            mobileNumber: c[2]?.trim() || "", 
                            vehicleType: vType, 
                            societyName: assignedSociety 
                        });
                        count++;
                    }
                }
            }
            await batch.commit();
            window.showModal(`Imported ${count} new vehicles.`);
        };
        reader.readAsText(file);
    });

    document.getElementById('bulkDeleteBtn')?.addEventListener('click', () => {
        const file = document.getElementById('excelInput').files[0];
        if (!file) return window.showModal("Select CSV first.");
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
        window.downloadCSV("VehicleNumber,FlatNumber/Name,MobileNumber,VehicleType\n", "Vehicle_Template.csv");
    });

    document.getElementById('exportBtn')?.addEventListener('click', async () => {
        const snapshot = await getDocs(query(collection(db, "vehicles"), where("societyName", "==", assignedSociety)));
        let csv = "VehicleNumber,FlatNumber/Name,MobileNumber,VehicleType\n"; 
        snapshot.forEach(d => { 
            const dt = d.data(); 
            csv += `${dt.vehicleNumber},${dt.flatNumber},${dt.mobileNumber || ''},${dt.vehicleType || '2-Wheeler'}\n`; 
        });
        window.downloadCSV(csv, "Vehicles.csv");
    });

    // --- 6. Notice Board Management ---
    document.getElementById('postNoticeBtn')?.addEventListener('click', async () => {
        const today = document.getElementById('todayMsg').value;
        const tomorrow = document.getElementById('tomorrowMsg').value;
        
        const countWords = (str) => str.trim().split(/\s+/).filter(w => w.length > 0).length;

        if (countWords(today) > 60 || countWords(tomorrow) > 60) {
            alert("Notice exceeds the 60-word limit for one or both fields!");
            return; 
        }

        if (!assignedSociety) return alert("Society not loaded.");

        try {
            await setDoc(doc(db, "notices", assignedSociety), {
                todayMessage: today,
                tomorrowMessage: tomorrow,
                date: new Date().toISOString().split('T')[0],
                updatedAt: serverTimestamp()
            }, { merge: true });
            alert("Notices updated successfully!");
        } catch (e) {
            alert("Error posting notice: " + e.message);
        }
    });

    document.getElementById('deleteNoticeBtn')?.addEventListener('click', async () => {
        if (!assignedSociety) return;
        try {
            await deleteDoc(doc(db, "notices", assignedSociety));
            document.getElementById('todayMsg').value = "";
            document.getElementById('tomorrowMsg').value = "";
            alert("Notice deleted.");
        } catch (e) {
            alert("Error deleting: " + e.message);
        }
    });

    // --- 7. Security Guard Management ---
    document.getElementById('searchGuardBtn')?.addEventListener('click', async () => {
        const nameToSearch = document.getElementById('searchGuardName').value.trim().toLowerCase();
        if (!nameToSearch) return window.showModal("Enter a name to search.");

        const q = query(collection(db, "guards"), where("name_lower", "==", nameToSearch), where("society", "==", assignedSociety));
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

    document.getElementById('addGuardBtn')?.addEventListener('click', async () => {
        const email = document.getElementById('gEmail').value.trim();
        const name = document.getElementById('gName').value.trim();
        const phone = document.getElementById('gPhone').value.trim();
        const nameLower = name.toLowerCase();

        if (!email || !name || !phone) return window.showModal("Fill all fields.");

        if (!editingDocId) {
            const q = query(collection(db, "guards"), where("name_lower", "==", nameLower), where("society", "==", assignedSociety));
            const snap = await getDocs(q);
            if (!snap.empty) return window.showModal("Error: Guard already exists.");
            
            await addDoc(collection(db, "guards"), { 
                email, name, phone, name_lower: nameLower, society: assignedSociety 
            });
            window.showModal("New guard added.");
        } else {
            await updateDoc(doc(db, "guards", editingDocId), { 
                email, name, phone, name_lower: nameLower, society: assignedSociety 
            });
            window.showModal("Guard updated.");
        }
        editingDocId = null;
    });

    document.getElementById('deleteGuardBtn')?.addEventListener('click', async () => {
        if (!editingDocId) return window.showModal("Search for a guard first.");
        await deleteDoc(doc(db, "guards", editingDocId));
        window.showModal("Guard deleted.");
        editingDocId = null;
        document.getElementById('gEmail').value = "";
        document.getElementById('gName').value = "";
        document.getElementById('gPhone').value = "";
    }); 
});
