import { auth, db } from "./app.js";
import { signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, collection, addDoc, query, where, getDocs, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
    location.reload();
};

// --- Main Application Logic ---
document.addEventListener('DOMContentLoaded', () => {

    document.getElementById('loginBtn')?.addEventListener('click', async () => {
        const email = document.getElementById('email').value.trim();
        const pass = document.getElementById('pass').value.trim();
        
        if (!email || !pass) return window.showModal("Please enter Email and Password.");

        try {
            await signInWithEmailAndPassword(auth, email, pass);
            const adminDoc = await getDoc(doc(db, "admins", email));
            
            if (adminDoc.exists()) {
                assignedSociety = adminDoc.data().society;
                document.getElementById('login-section').style.display = 'none';
                document.getElementById('search-section').style.display = 'block';
                document.getElementById('data-section').style.display = 'block';
                window.showModal("Logged in! Society: " + assignedSociety);
            } else {
                throw new Error("Admin record not found.");
            }
        } catch (e) {
            let msg = "Login failed: ";
            switch (e.code) {
                case 'auth/invalid-email': msg += "Invalid email format."; break;
                case 'auth/invalid-credential': msg += "Invalid Email or Password."; break;
                default: msg += e.message;
            }
            window.showModal(msg);
        }
    });

    document.getElementById('adminSearchBtn')?.addEventListener('click', async () => {
        const qVal = document.getElementById('adminSearch').value.trim().toUpperCase();
        const q = query(collection(db, "vehicles"), where("vehicleNumber", "==", qVal), where("societyName", "==", assignedSociety));
        const snapshot = await getDocs(q);
        const container = document.getElementById('admin-results');
        container.innerHTML = "";

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

    document.getElementById('saveBtn')?.addEventListener('click', async () => {
        const vNum = document.getElementById('vNum').value.trim().toUpperCase();
        const fNum = document.getElementById('fNum').value.trim();
        const mNum = document.getElementById('mNum').value.trim();
        if (!vNum || !fNum) return window.showModal("Fill all fields.");
        await addDoc(collection(db, "vehicles"), { vehicleNumber: vNum, flatNumber: fNum, mobileNumber: mNum, societyName: assignedSociety });
        window.showModal("Vehicle added!");
        location.reload();
    });
});
