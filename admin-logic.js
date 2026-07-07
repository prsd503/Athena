import { auth, db } from "./app.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, updateDoc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Global variable to hold the society name after login
let userSociety = "";

// --- Modal Controls ---
window.showModal = (msg, showInput = false) => {
    document.getElementById('modalMessage').innerText = msg;
    document.getElementById('modalMsgInput').style.display = showInput ? 'block' : 'none';
    document.getElementById('modalActionBtn').style.display = showInput ? 'block' : 'none';
    document.getElementById('customModal').style.display = 'block';
};

window.closeModal = () => document.getElementById('customModal').style.display = 'none';

// --- WhatsApp Messaging ---
window.sendWhatsApp = (mobile, vNum) => {
    if (!mobile) return alert("No owner mobile number found.");
    window.pendingMobile = mobile;
    window.pendingVNum = vNum;
    window.showModal("Message for " + vNum, true);
};

window.handleModalAction = () => {
    const msg = document.getElementById('modalMsgInput').value;
    const url = `https://wa.me/${window.pendingMobile}?text=${encodeURIComponent("Finder-Owl: " + msg)}`;
    window.open(url, '_blank');
    window.closeModal();
};

document.addEventListener('DOMContentLoaded', () => {
    // --- Login Logic ---
    document.getElementById('loginBtn')?.addEventListener('click', async () => {
        const email = document.getElementById('email').value.trim();
        const pass = document.getElementById('pass').value;
        try {
            const userCred = await signInWithEmailAndPassword(auth, email, pass);
            
            // LINK SOCIETY DYNAMICALLY: Fetch from Firestore 'admins' collection
            const adminSnap = await getDoc(doc(db, "admins", email));
            if (adminSnap.exists()) {
                userSociety = adminSnap.data().society;
                document.getElementById('login-section').style.display = 'none';
                document.getElementById('search-section').style.display = 'block';
                document.getElementById('data-section').style.display = 'block';
                window.showModal("Logged in! Society: " + userSociety);
            } else {
                throw new Error("Admin record not found for this email.");
            }
        } catch (e) { window.showModal("Login failed: " + e.message); }
    });

    // --- Search & Edit/Delete Logic ---
    document.getElementById('adminSearchBtn')?.addEventListener('click', async () => {
        const qVal = document.getElementById('adminSearch').value.trim().toUpperCase();
        const q = query(collection(db, "vehicles"), where("vehicleNumber", "==", qVal), where("societyName", "==", userSociety));
        
        const snapshot = await getDocs(q);
        const container = document.getElementById('admin-results');
        container.innerHTML = "";
        
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            container.innerHTML += `
                <div style="margin:10px 0; padding:10px; border:1px solid #8d6e63; border-radius:10px;">
                    <p><b>Vehicle:</b> ${data.vehicleNumber}</p>
                    <p><b>Flat:</b> <input id="f-${docSnap.id}" value="${data.flatNumber}"></p>
                    <button onclick="window.updateData('${docSnap.id}')">Update</button>
                    <button onclick="window.deleteData('${docSnap.id}')">Delete</button>
                    <button onclick="window.sendWhatsApp('${data.mobileNumber}', '${data.vehicleNumber}')">Message</button>
                </div>`;
        });
    });

    // --- Create New Entry ---
    document.getElementById('saveBtn')?.addEventListener('click', async () => {
        const vNum = document.getElementById('vNum').value.trim().toUpperCase();
        const fNum = document.getElementById('fNum').value;
        const mobile = document.getElementById('mobileNum').value.trim();
        
        if (!vNum || !mobile) return window.showModal("Enter Vehicle & Mobile.");
        
        await addDoc(collection(db, "vehicles"), { 
            vehicleNumber: vNum, flatNumber: fNum, mobileNumber: mobile, societyName: userSociety 
        });
        window.showModal("Vehicle Saved!");
    });
});

// --- CRUD Operations ---
window.updateData = async (id) => {
    await updateDoc(doc(db, "vehicles", id), { flatNumber: document.getElementById(`f-${id}`).value });
    window.showModal("Updated!");
};

window.deleteData = async (id) => {
    await deleteDoc(doc(db, "vehicles", id));
    window.showModal("Deleted!");
    document.getElementById('admin-results').innerHTML = "";
};
