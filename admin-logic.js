import { auth, db } from "./app.js";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, collection, addDoc, query, where, getDocs, deleteDoc, updateDoc, writeBatch } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let assignedSociety = "";
let editingDocId = null;
let pendingDeleteId = null;
let editingNoticeId = null; // Track notices being edited

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

// --- Notice Board Functions ---
async function loadNotices() {
    const container = document.getElementById('notice-list');
    if (!container) return;
    container.innerHTML = "Loading notices...";
    
    try {
        const q = query(collection(db, "notices"), where("societyName", "==", assignedSociety));
        const snapshot = await getDocs(q);
        container.innerHTML = "";
        
        if (snapshot.empty) {
            container.innerHTML = "<p>No active notices found.</p>";
            return;
        }
        
        snapshot.forEach((d) => {
            const data = d.data();
            const dateStr = data.createdAt ? new Date(data.createdAt).toLocaleDateString() : 'N/A';
            container.innerHTML += `
                <div style="background:#f5f5f5; padding:10px; border-radius:8px; margin-bottom:10px; border-left: 5px solid #6d4c41;">
                    <h4>${data.title} <span style="font-size:0.75rem; color:#777; font-weight:normal;">(${dateStr})</span></h4>
                    <p style="margin: 5px 0;">${data.content}</p>
                    <button onclick="window.editNotice('${d.id}', '${data.title.replace(/'/g, "\\'")}', '${data.content.replace(/'/g, "\\'")}')" style="background:#6d4c41; font-size:0.75rem; margin-right:5px;">Edit</button>
                    <button onclick="window.deleteNotice('${d.id}')" style="background:#d32f2f; font-size:0.75rem;">Delete</button>
                </div>`;
        });
    } catch (e) {
        container.innerHTML = "Error loading notices: " + e.message;
    }
}

window.editNotice = (id, title, content) => {
    editingNoticeId = id;
    document.getElementById('noticeTitle').value = title;
    document.getElementById('noticeContent').value = content;
    document.getElementById('saveNoticeBtn').innerText = "Update Notice";
};

window.deleteNotice = async (id) => {
    if (!confirm("Are you sure you want to delete this notice?")) return;
    try {
        await deleteDoc(doc(db, "notices", id));
        window.showModal("Notice deleted successfully.");
        loadNotices();
    } catch (e) { window.showModal("Error deleting notice: " + e.message); }
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
                
                // Show the notice board panel if it exists in HTML
                const noticeSection = document.getElementById('notice-section');
                if (noticeSection) noticeSection.style.display = 'block';
                
                loadNotices();
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
    document.getElementById('adminSearchBtn')?.addEventListener('click', async (event) => {
        const qVal = document.getElementById('adminSearch').value.trim().toUpperCase();
        const container = document.getElementById('admin-results');
        container.innerHTML = "";
        if (!qVal) return window.showModal("Enter vehicle number.");

        const q = query(collection(db, "vehicles"), where("vehicleNumber", "==", qVal), where("societyName", "==", assignedSociety));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            if (event.isTrusted) window.showModal("No data found.");
            return;
        }
        
        snapshot.forEach((d) => {
            const data = d.data();
            const waLink = data.mobileNumber ? `https://wa.me/${data.mobileNumber.replace(/\D/g, '')}?text= (Using: Owl-Watch) Hello, regarding vehicle ${data.vehicleNumber}` : "#";
            container.innerHTML += `
                <div style="background:#fdf6e3; padding:10px; border-radius:10px; margin-bottom:10px; text-align:left; border: 1px solid #8d6e63;">
                    <p><b>${data.vehicleNumber}</b> | Flat/Name: ${data.flatNumber}</p>
                    <a href="${waLink}" target="_blank" style="background:#25d366; color:white; padding:5px 8px; border-radius:5px; text-decoration:none; font-size:0.8rem;">WhatsApp</a>
                    <button onclick="editEntry('${data.vehicleNumber}', '${data.flatNumber}', '${data.mobileNumber || ''}', '${d.id}')" style="background:#6d4c41; font-size:0.8rem;">Edit</button>
                    <button onclick="deleteEntry('${d.id}')" style="background:#d32f2f; font-size:0.8rem;">Delete</button>
                </div>`;
        });
    });

    // 4. Save/Update Vehicle
    document.getElementById('saveBtn')?.addEventListener('click', async () => {
        const v = document.getElementById('vNum').value.trim().toUpperCase();
        const f = document.getElementById('fNum').value.trim();
        const m = document.getElementById('mNum').value.trim();
        if (!v || !f) return window.showModal("Fill fields.");
        if (!editingDocId) {
            if (await isVehicleExists(v, assignedSociety)) return window.showModal("Vehicle already registered.");
            await addDoc(collection(db, "vehicles"), { vehicleNumber: v, flatNumber: f, mobileNumber: m, societyName: assignedSociety });
            window.showModal("Added!");
        } else {
            await updateDoc(doc(db, "vehicles", editingDocId), { vehicleNumber: v, flatNumber: f, mobileNumber: m });
            window.showModal("Updated!");
            editingDocId = null;
            document.getElementById('saveBtn').innerText = "Save Entry";
        }
        // Clear inputs after vehicle operation
        document.getElementById('vNum').value = "";
        document.getElementById('fNum').value = "";
        document.getElementById('mNum').value = "";
    });

    // 4b. Save/Update Notice
    document.getElementById('saveNoticeBtn')?.addEventListener('click', async () => {
        const title = document.getElementById('noticeTitle').value.trim();
        const content = document.getElementById('noticeContent').value.trim();
        
        if (!title || !content) return window.showModal("Fill out title and content elements.");

        try {
            if (!editingNoticeId) {
                await addDoc(collection(db, "notices"), {
                    title: title,
                    content: content,
                    societyName: assignedSociety,
                    createdAt: Date.now()
                });
                window.showModal("Notice Posted!");
            } else {
                await updateDoc(doc(db, "notices", editingNoticeId), {
                    title: title,
                    content: content
                });
                window.showModal("Notice Updated!");
                editingNoticeId = null;
                document.getElementById('saveNoticeBtn').innerText = "Post Notice";
            }
            document.getElementById('noticeTitle').value = "";
            document.getElementById('noticeContent').value = "";
            loadNotices();
        } catch (e) { window.showModal("Notice error: " + e.message); }
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
                if (c.length >= 2 && !(await isVehicleExists(c[0].trim().toUpperCase(), assignedSociety))) {
                    batch.set(doc(collection(db, "vehicles")), { vehicleNumber: c[0].trim().toUpperCase(), flatNumber: c[1].trim(), mobileNumber: c[2]?.trim() || "", societyName: assignedSociety });
                    count++;
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
        window.downloadCSV("VehicleNumber,FlatNumber/Name,MobileNumber\n", "Vehicle_Template.csv");
    });

    document.getElementById('exportBtn')?.addEventListener('click', async () => {
        const snapshot = await getDocs(query(collection(db, "vehicles"), where("societyName", "==", assignedSociety)));
        let csv = "VehicleNumber,FlatNumber,MobileNumber\n";
        snapshot.forEach(d => { const dt = d.data(); csv += `${dt.vehicleNumber},${dt.flatNumber},${dt.mobileNumber || ''}\n`; });
        window.downloadCSV(csv, "Vehicles.csv");
    });
});
