import { auth, db } from "./app.js";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, collection, addDoc, query, where, getDocs, deleteDoc, updateDoc, writeBatch } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let assignedSociety = "";

window.closeModal = () => { document.getElementById('customModal').style.display = 'none'; };
window.showModal = (msg) => { document.getElementById('modalMessage').innerText = msg; document.getElementById('customModal').style.display = 'block'; };

const downloadCSV = (content, filename) => {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
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

    document.getElementById('loginBtn')?.addEventListener('click', async () => {
        try {
            await signInWithEmailAndPassword(auth, document.getElementById('email').value.trim(), document.getElementById('pass').value.trim());
        } catch (e) { window.showModal("Login failed: " + e.message); }
    });

    document.getElementById('logoutBtn')?.addEventListener('click', async () => { await signOut(auth); location.reload(); });

    document.getElementById('exportBtn')?.addEventListener('click', async () => {
        const snapshot = await getDocs(query(collection(db, "vehicles"), where("societyName", "==", assignedSociety)));
        let csv = "VehicleNumber,FlatNumber,MobileNumber\n";
        snapshot.docs.forEach(d => { const data = d.data(); csv += `${data.vehicleNumber},${data.flatNumber},${data.mobileNumber}\n`; });
        downloadCSV(csv, "Vehicles.csv");
    });

    document.getElementById('downloadTemplateBtn')?.addEventListener('click', () => {
        downloadCSV("VehicleNumber,FlatNumber,MobileNumber\n", "Template.csv");
    });

    document.getElementById('importBtn')?.addEventListener('click', () => {
        const file = document.getElementById('excelInput').files[0];
        if (!file) return window.showModal("Select a CSV file.");
        const reader = new FileReader();
        reader.onload = async (e) => {
            const rows = e.target.result.split('\n').slice(1);
            for (let i = 0; i < rows.length; i += 500) {
                const batch = writeBatch(db);
                rows.slice(i, i + 500).forEach(row => {
                    const c = row.split(',');
                    if (c.length >= 2) batch.set(doc(collection(db, "vehicles")), { vehicleNumber: c[0].trim().toUpperCase(), flatNumber: c[1].trim(), mobileNumber: c[2]?.trim() || '', societyName: assignedSociety });
                });
                await batch.commit();
            }
            window.showModal("Import successful!");
        };
        reader.readAsText(file);
    });
});
