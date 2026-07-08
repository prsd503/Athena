import { auth, db } from "./app.js";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, collection, addDoc, query, where, getDocs, deleteDoc, updateDoc, writeBatch } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let assignedSociety = "";

window.closeModal = () => { document.getElementById('customModal').style.display = 'none'; };
window.showModal = (msg) => {
    document.getElementById('modalMessage').innerText = msg;
    document.getElementById('customModal').style.display = 'block';
};

// --- CSV Helper Functions ---
const downloadCSV = (content, filename) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

document.addEventListener('DOMContentLoaded', () => {
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

    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
        await signOut(auth);
        location.reload();
    });

    // Export to CSV
    document.getElementById('exportBtn')?.addEventListener('click', async () => {
        const q = query(collection(db, "vehicles"), where("societyName", "==", assignedSociety));
        const snapshot = await getDocs(q);
        let csvContent = "VehicleNumber,FlatNumber,MobileNumber\n";
        snapshot.docs.forEach(d => {
            const data = d.data();
            csvContent += `${data.vehicleNumber},${data.flatNumber},${data.mobileNumber}\n`;
        });
        downloadCSV(csvContent, `${assignedSociety}_Vehicles.csv`);
    });

    // Download Template CSV
    document.getElementById('downloadTemplateBtn')?.addEventListener('click', () => {
        downloadCSV("VehicleNumber,FlatNumber,MobileNumber\n", "Vehicle_Template.csv");
    });

    // Import CSV
    document.getElementById('importBtn')?.addEventListener('click', () => {
        const file = document.getElementById('excelInput').files[0];
        if (!file) return window.showModal("Select a CSV file first.");
        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target.result;
            const rows = text.split('\n').slice(1); // skip header
            for (let i = 0; i < rows.length; i += 500) {
                const batch = writeBatch(db);
                rows.slice(i, i + 500).forEach(row => {
                    const cols = row.split(',');
                    if (cols.length >= 2) {
                        batch.set(doc(collection(db, "vehicles")), {
                            vehicleNumber: cols[0].trim().toUpperCase(),
                            flatNumber: cols[1].trim(),
                            mobileNumber: cols[2] ? cols[2].trim() : '',
                            societyName: assignedSociety
                        });
                    }
                });
                await batch.commit();
            }
            window.showModal("Bulk import complete!");
        };
        reader.readAsText(file);
    });
    
    // ... keep your existing Search/Add Logic here
});
