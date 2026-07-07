import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, query, where, getDocs, deleteDoc, doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyBEYKHQpy_VjmgjYiWQOPjXth1bghYsf9M",
    authDomain: "finder-owl.firebaseapp.com",
    projectId: "finder-owl",
    storageBucket: "finder-owl.firebasestorage.app",
    messagingSenderId: "1011347100861",
    appId: "1:1011347100861:web:24246f9a4eb24d812cd3d4"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

const SOCIETY_MAP = {
    "brink2wink@gmail.com": "Aangan",
    "rkom@gmail.com": "Indra"
};

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
    showModal("Message for vehicle " + vNum, true);
};

window.handleModalAction = () => {
    const msg = document.getElementById('modalMsgInput').value;
    if (!msg) return alert("Please enter a message!");
    const url = `https://wa.me/${pendingOwnerMobile}?text=${encodeURIComponent("Finder-Owl Admin Message regarding " + pendingVNum + ": " + msg)}`;
    window.open(url, '_blank');
    document.getElementById('modalMsgInput').value = "";
    closeModal();
};

document.addEventListener('DOMContentLoaded', () => {
    // Attach event to modal button specifically
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
            showModal("Logged in as: " + (SOCIETY_MAP[email] || "Admin"));
        } catch (e) { showModal("Login failed: " + e.message); }
    });

    // --- Search Logic ---
    document.getElementById('adminSearchBtn')?.addEventListener('click', async () => {
        const qVal = document.getElementById('adminSearch').value.trim().toUpperCase();
        const userEmail = auth.currentUser?.email;
        const assignedSociety = SOCIETY_MAP[userEmail] || "Default";
        
        const q = query(collection(db, "vehicles"), where("vehicleNumber", "==", qVal), where("societyName", "==", assignedSociety));
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
        const society = SOCIETY_MAP[auth.currentUser?.email] || "Default";
        
        try {
            await addDoc(collection(db, "vehicles"), { vehicleNumber: vNum, flatNumber: fNum, mobileNumber: mobile, societyName: society });
            showModal("Vehicle Saved!");
        } catch (e) { showModal("Error: " + e.message); }
    });
});

// --- CRUD Operations ---
window.updateData = async (id) => {
    await updateDoc(doc(db, "vehicles", id), { flatNumber: document.getElementById(`f-${id}`).value });
    showModal("Updated successfully!");
};

window.deleteData = async (id) => {
    if (confirm("Delete this record?")) {
        await deleteDoc(doc(db, "vehicles", id));
        showModal("Deleted!");
    }
};
