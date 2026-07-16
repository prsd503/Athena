// admin-logic.js
import { auth, db } from "./app.js";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, setDoc, collection, addDoc, query, where, getDocs, deleteDoc, updateDoc, writeBatch, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let assignedSociety = "";
let editingDocId = null;
let pendingDeleteId = null;
let teamPhone = "919033406816";
let isMasterAdminUser = false;

// --- Capacitor Navigation Helper ---
function handleCapacitorRouting(targetPage) {
    if (window.location.href.includes("capacitor://")) {
        window.location.href = "capacitor://localhost/" + targetPage;
    } else {
        window.location.href = targetPage;
    }
}

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
        document.getElementById('adminSearchBtn')?.click();
    } catch (e) { window.showModal("Delete error: " + e.message); }
    pendingDeleteId = null;
};

// --- Data Operations (Moved to Master Admin scope) ---
async function handleBulkDelete() {
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
        if (deletedCount > 0) { 
            await batch.commit(); 
            window.showModal(`Deleted ${deletedCount} vehicles.`); 
            document.getElementById('adminSearchBtn')?.click(); 
        }
        else window.showModal("No matching vehicles found.");
    };
    reader.readAsText(file);
}

async function handleExport() {
    const snapshot = await getDocs(query(collection(db, "vehicles"), where("societyName", "==", assignedSociety)));
    let csv = "VehicleNumber,FlatNumber/Name,MobileNumber,VehicleType\n"; 
    snapshot.forEach(d => { 
        const dt = d.data(); 
        csv += `${dt.vehicleNumber},${dt.flatNumber},${dt.mobileNumber || ''},${dt.vehicleType || '2-Wheeler'}\n`; 
    });
    window.downloadCSV(csv, "Vehicles.csv");
}

async function loadNoticeData() {
    if (!assignedSociety) return;
    try {
        const noticeDoc = await getDoc(doc(db, "notices", assignedSociety));
        if (noticeDoc.exists()) {
            const data = noticeDoc.data();
            if (document.getElementById('todayMsg')) document.getElementById('todayMsg').value = data.todayMessage || "";
            if (document.getElementById('tomorrowMsg')) document.getElementById('tomorrowMsg').value = data.tomorrowMessage || "";
        }
    } catch (e) { console.error("Error loading notices: ", e); }
}

async function loadConfigData() {
    try {
        const configDoc = await getDoc(doc(db, "configs", "owlwatcher"));
        if (configDoc.exists()) teamPhone = configDoc.data().teamPhone || "919033406816";
    } catch (e) { console.error("Error loading configs: ", e); }
}

// --- Master Admin UI Builder ---
function setupMasterAdminUI(isMaster) {
    isMasterAdminUser = isMaster;
    const masterSection = document.getElementById('master-section');
    if (!masterSection) return;

    if (isMaster) {
        masterSection.style.display = 'block';
        masterSection.innerHTML = `
            <div class="card" style="background: #efebe9; border: 2px solid #8d6e63; border-radius: 16px; padding: 18px;">
                <h3 style="color: #5d4037;">👑 Master Control Center</h3>
                <label>Society:</label>
                <div id="active-society-display" style="font-weight: bold; background: white; padding: 10px; margin-bottom: 10px;">${assignedSociety}</div>
                <input type="text" id="masterSocietySearch" placeholder="New Society Name">
                <button id="masterSocietySelectBtn">Select Workspace</button>
                <hr style="margin: 15px 0;">
                <button id="bulkDeleteBtn" style="background: #d32f2f; width: 100%;">Bulk Delete CSV</button>
                <button id="exportBtn" style="background: #27ae60; width: 100%;">Download All Data (CSV)</button>
            </div>
        `;
        document.getElementById('masterSocietySelectBtn').addEventListener('click', async () => {
            const sName = document.getElementById('masterSocietySearch').value.trim();
            if (!sName) return window.showModal("Enter a name.");
            assignedSociety = sName;
            document.getElementById('active-society-display').innerText = sName;
            loadNoticeData();
            window.showModal("Workspace switched to: " + sName);
        });
        document.getElementById('bulkDeleteBtn').addEventListener('click', handleBulkDelete);
        document.getElementById('exportBtn').addEventListener('click', handleExport);
    } else {
        masterSection.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            await loadConfigData();
            const adminDoc = await getDoc(doc(db, "admins", user.email));
            if (adminDoc.exists()) {
                const adminData = adminDoc.data();
                assignedSociety = adminData.society || "";
                document.getElementById('login-section').style.display = 'none';
                document.getElementById('search-section').style.display = 'block';
                document.getElementById('data-section').style.display = 'block';
                setupMasterAdminUI(adminData.isMaster === true);
                loadNoticeData();
            } else {
                window.showModal("Unauthorized.");
                await signOut(auth);
            }
        }
    });

    document.getElementById('loginBtn')?.addEventListener('click', async () => {
        const email = document.getElementById('email').value.trim();
        const pass = document.getElementById('pass').value.trim();
        try { await signInWithEmailAndPassword(auth, email, pass); }
        catch (e) { window.showModal("Login error."); }
    });

    document.getElementById('saveBtn')?.addEventListener('click', async () => {
        const v = document.getElementById('vNum').value.trim().toUpperCase();
        const f = document.getElementById('fNum').value.trim();
        const m = document.getElementById('mNum').value.trim();
        const type = document.getElementById('vType').value;
        if (!v || !f) return window.showModal("Fill fields.");
        
        if (!editingDocId) {
            await addDoc(collection(db, "vehicles"), { vehicleNumber: v, flatNumber: f, mobileNumber: m, vehicleType: type, societyName: assignedSociety });
        } else {
            await updateDoc(doc(db, "vehicles", editingDocId), { vehicleNumber: v, flatNumber: f, mobileNumber: m, vehicleType: type });
            editingDocId = null;
        }
        window.showModal("Saved!");
    });

    document.getElementById('importBtn')?.addEventListener('click', () => {
        const file = document.getElementById('excelInput').files[0];
        if (!file) return window.showModal("Select file.");
        const reader = new FileReader();
        reader.onload = async (e) => {
            const rows = e.target.result.split('\n').slice(1);
            const batch = writeBatch(db);
            for (const row of rows) {
                const c = row.split(',');
                if (c.length >= 2) {
                    batch.set(doc(collection(db, "vehicles")), { vehicleNumber: c[0].trim().toUpperCase(), flatNumber: c[1].trim(), mobileNumber: c[2]?.trim() || "", vehicleType: c[3]?.trim() || "2-Wheeler", societyName: assignedSociety });
                }
            }
            await batch.commit();
            window.showModal("Imported.");
        };
        reader.readAsText(file);
    });

    document.getElementById('downloadTemplateBtn')?.addEventListener('click', () => {
        window.downloadCSV("VehicleNumber,FlatNumber/Name,MobileNumber,VehicleType\n", "Vehicle_Template.csv");
    });
});
