// Import auth and db from your centralized config file
import { auth, db } from "./app.js"; 
import { signInWithEmailAndPassword } from "https://console.firebase.google.com/";
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const SOCIETY_MAP = {
    "brink2wink@gmail.com": "Aangan",
    "rkom@gmail.com": "Indra"
};

// Global Context
let pendingOwnerMobile = "";
let pendingVNum = "";

// --- Modal Controls ---
window.showModal = (msg, showInput = false) => {
    document.getElementById('modalMessage').innerText = msg;
    document.getElementById('modalMsgInput').style.display = showInput ? 'block' : 'none';
    document.getElementById('modalActionBtn').style.display = showInput ? 'block' : 'none';
    document.getElementById('customModal').style.display = 'block';
};

window.closeModal = () => {
    document.getElementById('customModal').style.display = 'none';
};

// --- WhatsApp Messaging ---
window.sendWhatsApp = (mobile, vNum) => {
    if (!mobile) return alert("No owner mobile number found.");
    pendingOwnerMobile = mobile;
    pendingVNum = vNum;
    window.showModal("Message for vehicle " + vNum, true);
};

window.handleModalAction = () => {
    const msg = document.getElementById('modalMsgInput').value;
    if (!msg) return alert("Please enter a message!");
    
    const url = `https://wa.me/${pendingOwnerMobile}?text=${encodeURIComponent("Finder-Owl Admin Message regarding " + pendingVNum + ": " + msg)}`;
    window.open(url, '_blank');
    document.getElementById('modalMsgInput').value = "";
    window.closeModal();
};

document.addEventListener('DOMContentLoaded', () => {
    // Attach modal action button event
    document.getElementById('modalActionBtn')?.addEventListener('click', window.handleModalAction);

    // --- Login Logic ---
    document.getElementById('loginBtn')?.addEventListener('click', async () => {
        const email = document.getElementById('email').value;
        const pass = document.getElementById('pass').value;
        try {
            await signInWithEmailAndPassword(auth, email, pass);
            document.getElementById('login-section').style.display = 'none';
            document.getElementById('data-section').style.display = 'block';
            document.getElementById('search-section').style.display = 'block';
            window.showModal("Logged in as: " + (SOCIETY_MAP[email] || "Admin"));
        } catch (e) { window.showModal("Login failed: " + e.message); }
    });

    // --- Search Logic ---
    document.getElementById('adminSearchBtn')?.addEventListener('click', async () => {
        const qVal = document.getElementById('adminSearch').value.trim().toUpperCase();
        const userEmail = auth.currentUser?.email;
        const assignedSociety = SOCIETY_MAP[userEmail] || "Default";
        
        const q = query(
            collection(db, "vehicles"), 
            where("vehicleNumber", "==", qVal),
            where("societyName", "==", assignedSociety)
        );
        
        const snapshot = await getDocs(q);
        const container = document.getElementById('admin-results');
        container.innerHTML = snapshot.empty ? "No records found." : "";
        
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            container.innerHTML += `
                <div style="margin:15px 0; border:2px solid #8d6e63; padding:15px; border-radius:15px; background:#fff;">
                    <p><b>Vehicle:</b> ${data.vehicleNumber}</p>
                    <p><b>Flat:</b> <input id="f-${docSnap.id}" value="${data.flatNumber}"></p>
                    <button onclick="window.updateData('${docSnap.id}')">Update</button>
                    <button onclick="window.deleteData('${docSnap.id}')" style="background:#d32f2f;">Delete</button>
                    <button onclick="window.sendWhatsApp('${data.mobileNumber}', '${data.vehicleNumber}')" style="background:#25D366;">Message</button>
                </div>`;
        });
    });

    // --- Save Logic ---
    document.getElementById('saveBtn')?.addEventListener('click', async () => {
        const vNum = document.getElementById('vNum').value.trim().toUpperCase();
        const fNum = document.getElementById('fNum').value;
        const mobile = document.getElementById('mobileNum').value.trim();
        const userEmail = auth.currentUser?.email;
        const society = SOCIETY_MAP[userEmail] || "Default";
        
        if (!vNum || !mobile) return window.showModal("Please fill in both Vehicle and Mobile fields.");
        
        try {
            await addDoc(collection(db, "vehicles"), { 
                vehicleNumber: vNum, 
                flatNumber: fNum, 
                mobileNumber: mobile, 
                societyName: society 
            });
            window.showModal("Vehicle Saved successfully!");
        } catch (e) { window.showModal("Error: " + e.message); }
    });
});

// --- CRUD Operations ---
window.updateData = async (id) => {
    await updateDoc(doc(db, "vehicles", id), { flatNumber: document.getElementById(`f-${id}`).value });
    window.showModal("Updated successfully!");
};

window.deleteData = async (id) => {
    if (confirm("Delete this record?")) {
        await deleteDoc(doc(db, "vehicles", id));
        window.showModal("Deleted successfully!");
        document.getElementById('admin-results').innerHTML = "";
    }
};
