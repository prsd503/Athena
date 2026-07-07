import { auth, db } from "./app.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Keep your existing mapping
const SOCIETY_MAP = {
    "brink2wink@gmail.com": "Aangan",
    "rkom@gmail.com": "Indra"
};

// Global Helper for WhatsApp
window.sendWhatsApp = (phone, vNum) => {
    const msg = encodeURIComponent(`Hello, I have a query regarding your vehicle: ${vNum}`);
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
};

// Global Update function
window.updateData = async (id) => {
    const newFlat = document.getElementById(`f-${id}`).value;
    await updateDoc(doc(db, "vehicles", id), { flatNumber: newFlat });
    alert("Updated successfully!");
};

// Global Delete function
window.deleteData = async (id) => {
    if (confirm("Delete this entry?")) {
        await deleteDoc(doc(db, "vehicles", id));
        alert("Deleted.");
        location.reload();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    
    // Login
    document.getElementById('loginBtn')?.addEventListener('click', async () => {
        const email = document.getElementById('email').value;
        const pass = document.getElementById('pass').value;
        try {
            await signInWithEmailAndPassword(auth, email, pass);
            document.getElementById('login-section').style.display = 'none';
            document.getElementById('search-section').style.display = 'block';
            document.getElementById('data-section').style.display = 'block';
        } catch (e) { alert("Login failed: " + e.message); }
    });

    // Search with WhatsApp integration
    document.getElementById('adminSearchBtn')?.addEventListener('click', async () => {
        const qVal = document.getElementById('adminSearch').value.trim().toUpperCase();
        const userEmail = auth.currentUser?.email || "";
        const assignedSociety = SOCIETY_MAP[userEmail] || "Unknown";

        const q = query(collection(db, "vehicles"), where("vehicleNumber", "==", qVal), where("societyName", "==", assignedSociety));
        const snapshot = await getDocs(q);
        const container = document.getElementById('admin-results');
        container.innerHTML = "";

        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            container.innerHTML += `
                <div style="margin:10px 0; border:1px solid #8d6e63; padding:10px; border-radius:10px;">
                    <p>Vehicle: <b>${data.vehicleNumber}</b></p>
                    <p>Flat: <input id="f-${docSnap.id}" value="${data.flatNumber}"></p>
                    <p>Mobile: <input id="m-${docSnap.id}" value="${data.mobileNumber || ''}" placeholder="Phone (with country code)"></p>
                    <button onclick="window.updateData('${docSnap.id}')">Update</button>
                    <button onclick="window.sendWhatsApp(document.getElementById('m-${docSnap.id}').value, '${data.vehicleNumber}')" style="background:#25D366; color:white;">WhatsApp</button>
                    <button onclick="window.deleteData('${docSnap.id}')" style="background:red; color:white;">Delete</button>
                </div>`;
        });
    });

    // Save New Entry
    document.getElementById('saveBtn')?.addEventListener('click', async () => {
        const vNum = document.getElementById('vNum').value.trim().toUpperCase();
        const fNum = document.getElementById('fNum').value;
        const mNum = document.getElementById('mNum')?.value || ""; // Ensure you add id="mNum" to HTML
        const userEmail = auth.currentUser?.email || "";
        const assignedSociety = SOCIETY_MAP[userEmail] || "Unknown";

        await addDoc(collection(db, "vehicles"), { 
            vehicleNumber: vNum, 
            flatNumber: fNum, 
            mobileNumber: mNum,
            societyName: assignedSociety 
        });
        alert("Vehicle added to " + assignedSociety);
    });
});
