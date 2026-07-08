import { auth, db } from "./app.js";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, collection, addDoc, query, where, getDocs, deleteDoc, updateDoc, writeBatch } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let assignedSociety = "";

// --- Global UI Helpers ---
window.closeModal = () => { document.getElementById('customModal').style.display = 'none'; };

window.showModal = (msg) => {
    document.getElementById('modalMessage').innerText = msg;
    document.getElementById('customModal').style.display = 'block';
};

window.sendWhatsApp = (phone, vNum) => {
    if (!phone) return window.showModal("No mobile number found.");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent("Finder-Owl Admin query regarding vehicle: " + vNum)}`, '_blank');
};

// --- CRUD Operations ---
window.updateData = async (id) => {
    const newFlat = document.getElementById(`f-${id}`).value.trim();
    const newMobile = document.getElementById(`m-${id}`).value.trim();
    if (!newFlat) return window.showModal("Flat number required.");
    await updateDoc(doc(db, "vehicles", id), { flatNumber: newFlat, mobileNumber: newMobile });
    window.showModal("Updated successfully!");
};

window.deleteData = async (id) => {
    await deleteDoc(doc(db, "vehicles", id));
    window.showModal("Deleted.");
    document.getElementById('admin-results').innerHTML = "";
};

// --- Main Application Logic ---
document.addEventListener('DOMContentLoaded', () => {

    // 1. Persistent Login State
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

    // 2. Login Handler
    document.getElementById('loginBtn')?.addEventListener('click', async () => {
        const email = document.getElementById('email').value.trim();
        const pass = document.getElementById('pass').value.trim();
        if (!email || !pass) return window.showModal("Please enter Email and Password.");
        try {
            await signInWithEmailAndPassword(auth, email, pass);
            window.showModal("Logged in successfully!");
        } catch (e) {
            let msg = "Login failed: ";
            if (e.code === 'auth/invalid-email') msg += "Invalid email.";
            else if (e.code === 'auth/invalid-credential') msg += "Invalid Email or Password.";
            else msg += e.message;
            window.showModal(msg);
        }
    });

    // 3. Logout Handler (FIXED)
    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
        try {
            await signOut(auth);
            assignedSociety = "";
            document.getElementById('login-section').style.display = 'block';
            document.getElementById('search-section').style.display = 'none';
            document.getElementById('data-section').style.display = 'none';
            window.showModal("Logged out successfully.");
            location.reload(); // Refresh to clean state
        } catch (e) {
            window.showModal("Error logging out: " + e.message);
        }
    });

    // 4. Search Handler (with Validation)
    document.getElementById('adminSearchBtn')?.addEventListener('click', async () => {
        const qVal = document.getElementById('adminSearch').value.trim().toUpperCase();
        const container = document.getElementById('admin-results');
        container.innerHTML = "";
        if (!qVal) return window.showModal("Please enter a vehicle number.");

        const q = query(collection(db, "vehicles"), where("vehicleNumber", "==", qVal), where("societyName", "==", assignedSociety));
        const snapshot = await getDocs(q);
        if (snapshot.empty) return window.showModal("No data found.");
        
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            container.innerHTML += `
                <div style="margin:10px 0; border:1px solid #8d6e63; padding:10px; border-radius:10px;">
                    <p>Vehicle: <b>${data.vehicleNumber}</b></p>
                    Flat: <input id="f-${docSnap.id}" value="${data.flatNumber}"><br>
                    Mobile: <input id="m-${docSnap.id}" value="${data.mobileNumber || ''}"><br>
                    <button onclick="window.updateData('${docSnap.id}')">Update</button>
                    <button onclick="window.sendWhatsApp('${data.mobileNumber || ''}', '${data.vehicleNumber}')">WhatsApp</button>
                    <button onclick="window.deleteData('${docSnap.id}')">Delete</button>
                </div>`;
        });
    });

    // 5. Bulk Export & Import
    document.getElementById('exportBtn')?.addEventListener('click', async () => {
        const q = query(collection(db, "vehicles"), where("societyName", "==", assignedSociety));
        const snapshot = await getDocs(q);
        const dataToExport = snapshot.docs.map(doc => ({
            VehicleNumber: doc.data().vehicleNumber,
            FlatNumber: doc.data().flatNumber,
            MobileNumber: doc.data().mobileNumber
        }));
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Vehicles");
        XLSX.writeFile(wb, `${assignedSociety}_Vehicles.xlsx`);
    });

    document.getElementById('importBtn')?.addEventListener('click', () => {
        const file = document.getElementById('excelInput').files[0];
        if (!file) return window.showModal("Please select a file.");
        const reader = new FileReader();
        reader.onload = async (e) => {
            const json = XLSX.utils.sheet_to_json(XLSX.read(new Uint8Array(e.target.result), {type: 'array'}).Sheets[0]);
            for (let i = 0; i < json.length; i += 500) { // Batching 500 limit
                const batch = writeBatch(db);
                json.slice(i, i + 500).forEach(row => {
                    batch.set(doc(collection(db, "vehicles")), {
                        vehicleNumber: String(row.VehicleNumber || '').toUpperCase(),
                        flatNumber: String(row.FlatNumber || ''),
                        mobileNumber: String(row.MobileNumber || ''),
                        societyName: assignedSociety
                    });
                });
                await batch.commit();
            }
            window.showModal("Import complete! (Note: Processed in batches of 500).");
        };
        reader.readAsArrayBuffer(file);
    });

    document.getElementById('downloadTemplateBtn')?.addEventListener('click', () => {
        XLSX.writeFile(XLSX.utils.book_append_sheet(XLSX.utils.book_new(), XLSX.utils.json_to_sheet([{VehicleNumber:"", FlatNumber:"", MobileNumber:""}]), "Template"), "Template.xlsx");
    });
});
