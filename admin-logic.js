//admin-logic.js

import { auth, db } from "./app.js";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, collection, addDoc, query, where, getDocs, deleteDoc, updateDoc, writeBatch } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let assignedSociety = "";
let userRole = ""; // 'admin' or 'guard'
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

// --- Auth & Role Management ---
document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                const adminDoc = await getDoc(doc(db, "admins", user.email));
                if (adminDoc.exists()) {
                    const data = adminDoc.data();
                    assignedSociety = data.society;
                    userRole = data.role || "guard"; // Default to guard if not specified

                    document.getElementById('login-section').style.display = 'none';
                    document.getElementById('search-section').style.display = 'block';
                    document.getElementById('data-section').style.display = 'block';

                    // Restrict management UI for Guards
                    if (userRole === 'guard') {
                        document.getElementById('admin-actions-container').style.display = 'none';
                        console.log("Logged in as Security Guard: Edit/Delete/Import disabled.");
                    } else {
                        document.getElementById('admin-actions-container').style.display = 'block';
                    }
                } else {
                    window.showModal("Unauthorized: User record not found.");
                }
            } catch (e) { window.showModal("Auth error: " + e.message); }
        }
    });

    // ... (Login/Logout logic remains same) ...

    // --- Search Logic (Updated to handle role display) ---
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
            let actionButtons = "";
            
            // Only Admins see management buttons
            if (userRole === 'admin') {
                actionButtons = `
                    <button onclick="editEntry('${data.vehicleNumber}', '${data.flatNumber}', '${data.mobileNumber || ''}', '${d.id}')">Edit</button>
                    <button onclick="window.pendingDeleteId='${d.id}'; window.showModal('Confirm delete?', true)">Delete</button>`;
            }
            
            container.innerHTML += `
            <div style="background:#fdf6e3; padding:10px; margin-bottom:10px;">
                <p><b>${data.vehicleNumber}</b> | Flat: ${data.flatNumber}</p>
                ${actionButtons}
            </div>`;
        });
    });

    // ... (Add/Update/Import methods remain same but consider wrapping in a role check) ...
});
