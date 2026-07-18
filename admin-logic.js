import { auth, db } from "./app.js";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, setDoc, collection, addDoc, query, where, getDocs, deleteDoc, updateDoc, writeBatch, serverTimestamp, arrayUnion } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let assignedSociety = "";
let editingDocId = null;
let pendingDeleteId = null;
let teamPhone = "919033406816";
let isMasterAdminUser = false;

// --- UI & Global Helpers ---
window.showModal = (msg, showConfirm = false) => {
    document.getElementById('modalMessage').innerText = msg;
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    if (confirmBtn) confirmBtn.style.display = showConfirm ? 'inline-block' : 'none';
    document.getElementById('customModal').style.display = 'block';
};
window.closeModal = () => { document.getElementById('customModal').style.display = 'none'; };

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

function getLocalDateString() { return new Date().toLocaleDateString('en-CA'); }

// --- Initialization Logic ---
document.addEventListener('DOMContentLoaded', () => {

    // Add this inside your DOMContentLoaded block, near your other event listeners
document.getElementById('saveAllFacilityNamesBtn')?.addEventListener('click', saveAllFacilityNames);

    // 1. Auth & Session Persistence
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const adminDoc = await getDoc(doc(db, "admins", user.email));
            if (adminDoc.exists()) {
                const adminData = adminDoc.data();
                assignedSociety = adminData.society || "";
                isMasterAdminUser = adminData.isMaster || false;

                document.getElementById('login-section').style.display = 'none';
                document.getElementById('search-section').style.display = 'block';
                document.getElementById('data-section').style.display = 'block';

                // Setup UI based on role
                if (isMasterAdminUser) {
                    const bulkSection = document.getElementById('bulk-section');
                    if (bulkSection) bulkSection.style.display = 'block';
                }

                loadNoticeData();
                loadFacilitiesDropdown();
            } else {
                window.showModal("Unauthorized access.");
                signOut(auth);
            }
        } else {
            document.getElementById('login-section').style.display = 'block';
            document.getElementById('search-section').style.display = 'none';
            document.getElementById('data-section').style.display = 'none';
        }
    });

    // 2. Login/Logout
    document.getElementById('loginBtn')?.addEventListener('click', async () => {
        const email = document.getElementById('email').value.trim();
        const pass = document.getElementById('pass').value.trim();
        try { await signInWithEmailAndPassword(auth, email, pass); } 
        catch (e) { window.showModal("Login error: " + e.message); }
    });

    document.getElementById('logoutBtn')?.addEventListener('click', () => signOut(auth));

    // 3. Notice Board Management
    document.getElementById('postNoticeBtn')?.addEventListener('click', async () => {
        await setDoc(doc(db, "notices", assignedSociety), {
            todayMessage: document.getElementById('todayMsg').value,
            tomorrowMessage: document.getElementById('tomorrowMsg').value,
            date: getLocalDateString(),
            updatedAt: serverTimestamp()
        }, { merge: true });
        window.showModal("Notices updated successfully!");
    });

    document.getElementById('deleteNoticeBtn')?.addEventListener('click', async () => {
        await deleteDoc(doc(db, "notices", assignedSociety));
        document.getElementById('todayMsg').value = "";
        document.getElementById('tomorrowMsg').value = "";
        window.showModal("Notice deleted.");
    });

// --- 4. Facility Management (F1-F5 Mapping) ---
window.updateFacilityName = async (fId) => {
    const newName = document.getElementById(`name_${fId}`).value.trim();
    if (!newName) return window.showModal("Please enter a name.");
    
    await setDoc(doc(db, "facilities", assignedSociety), { [fId]: newName }, { merge: true });
    window.showModal(`${fId} updated to ${newName}`);
    loadFacilitiesDropdown(); 
}; 

async function saveAllFacilityNames() {
    const data = {
        F1: document.getElementById('name_F1').value,
        F2: document.getElementById('name_F2').value,
        F3: document.getElementById('name_F3').value,
        F4: document.getElementById('name_F4').value,
        F5: document.getElementById('name_F5').value
    };
    
    await setDoc(doc(db, "facilities", assignedSociety), data, { merge: true });
    window.showModal("Facility names updated!");
    loadFacilitiesDropdown(); 
}

    
// --- Updated Dropdown Logic ---
async function loadFacilitiesDropdown() {
    if (!assignedSociety) return;
    const fDoc = await getDoc(doc(db, "facilities", assignedSociety));
    const data = fDoc.exists() ? fDoc.data() : {};
    const select = document.getElementById('facilitySelect');
    
    // Populate F1-F5 based on mapping
    select.innerHTML = "";
    ['F1', 'F2', 'F3', 'F4', 'F5'].forEach(fId => {
        const displayName = data[fId] || `Not Assigned (${fId})`;
        select.innerHTML += `<option value="${fId}">${fId}: ${displayName}</option>`;
        
        // If you have inputs for F1-F5 in your HTML
        const input = document.getElementById(`name_${fId}`);
        if (input) input.value = data[fId] || "";
    });
}

// --- 5. Booking & Deletion ---
// Updated Booking function
document.getElementById('bookFacilityBtn')?.addEventListener('click', async () => {
    const fId = document.getElementById('facilitySelect').value;
    const date = document.getElementById('bookingDate').value; // e.g., 2026-07-18
    const startT = document.getElementById('startTime').value; // e.g., 10:00
    const endT = document.getElementById('endTime').value;     // e.g., 14:00

    if (!date || !startT || !endT) return window.showModal("Please select date and times.");

    await addDoc(collection(db, "bookings"), { 
        society: assignedSociety, 
        facilityId: fId, 
        start: `${date}T${startT}:00`, // FullCalendar ISO start
        end: `${date}T${endT}:00`       // FullCalendar ISO end
    });
    window.showModal("Booking created with time slot!");
});

// New Function to Delete Bookings
window.deleteBooking = async (bookingDocId) => {
    await deleteDoc(doc(db, "bookings", bookingDocId));
    window.showModal("Booking deleted.");
    // Add logic here to re-fetch and refresh your bookings list view
};
    // 5. Bulk Management
    document.getElementById('importBtn')?.addEventListener('click', () => {
        const file = document.getElementById('excelInput').files[0];
        if (!file) return window.showModal("Select CSV.");
        const reader = new FileReader();
        reader.onload = async (e) => {
            const rows = e.target.result.split('\n').slice(1);
            const batch = writeBatch(db);
            for (const row of rows) {
                const c = row.split(',');
                if (c.length >= 2) {
                    batch.set(doc(collection(db, "vehicles")), { 
                        vehicleNumber: c[0].trim().toUpperCase(), 
                        flatNumber: c[1].trim(), 
                        societyName: assignedSociety 
                    });
                }
            }
            await batch.commit();
            window.showModal("Import complete.");
        };
        reader.readAsText(file);
    });

    // 6. Ad Approval
    document.getElementById('approveAdBtn')?.addEventListener('click', async () => {
        const adKey = document.getElementById('adApprovalKey').value.trim().toUpperCase();
        await updateDoc(doc(db, "ads", adKey), { societyApproved: true });
        window.showModal("Ad Approved!");
        window.open(`https://wa.me/${teamPhone}?text=Admin of ${assignedSociety} approved Ad: ${adKey}`);
    });
});

// --- Independent Helpers ---
async function loadNoticeData() {
    if (!assignedSociety) return;
    const docSnap = await getDoc(doc(db, "notices", assignedSociety));
    if (docSnap.exists()) {
        const data = docSnap.data();
        if (document.getElementById('todayMsg')) document.getElementById('todayMsg').value = data.todayMessage || "";
        if (document.getElementById('tomorrowMsg')) document.getElementById('tomorrowMsg').value = data.tomorrowMessage || "";
    }
}


