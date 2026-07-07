import { auth, db } from "./app.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const SOCIETY_MAP = {
    "brink2wink@gmail.com": "Aangan",
    "rkom@gmail.com": "Indra"
};

window.showModal = (msg) => {
    document.getElementById('modalMessage').innerText = msg;
    document.getElementById('customModal').style.display = 'block';
};

window.closeModal = () => {
    document.getElementById('customModal').style.display = 'none';
};

// WhatsApp Integration Function
window.sendWhatsApp = (mobile, vNum) => {
    const msg = prompt("Enter your message to the owner:");
    if (!msg) return;
    
    // Redirects to WhatsApp using the wa.me approach
    const url = `https://wa.me/${mobile}?text=${encodeURIComponent("Message from Admin regarding vehicle " + vNum + ": " + msg)}`;
    window.open(url, '_blank');
};

document.addEventListener('DOMContentLoaded', () => {

    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', async () => {
            const email = document.getElementById('email').value;
            const pass = document.getElementById('pass').value;
            try {
                await signInWithEmailAndPassword(auth, email, pass);
                document.getElementById('login-section').style.display = 'none';
                document.getElementById('data-section').style.display = 'block';
                document.getElementById('search-section').style.display = 'block';
                showModal("Logged in as: " + (SOCIETY_MAP[email] || "Default"));
            } catch (e) { showModal("Login failed: " + e.message); }
        });
    }

    const searchBtn = document.getElementById('adminSearchBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', async () => {
            const qVal = document.getElementById('adminSearch').value.trim().toUpperCase();
            const userEmail = auth.currentUser ? auth.currentUser.email : "";
            const assignedSociety = SOCIETY_MAP[userEmail] || "My Society Name";

            const q = query(
                collection(db, "vehicles"), 
                where("vehicleNumber", "==", qVal),
                where("societyName", "==", assignedSociety)
            );
            
            const snapshot = await getDocs(q);
            const container = document.getElementById('admin-results');
            container.innerHTML = "";

            snapshot.forEach((docSnap) => {
                const data = docSnap.data();
                container.innerHTML += `
                    <div style="margin:15px 0; border:2px solid #8d6e63; padding:15px; border-radius:15px; background:#fff; text-align:left;">
                        <p style="margin:5px 0;"><b>Vehicle:</b> ${data.vehicleNumber}</p>
                        <p style="margin:5px 0;"><b>Flat:</b> <input id="f-${docSnap.id}" value="${data.flatNumber}" style="width:60%;"></p>
                        <p style="margin:5px 0;"><b>Mobile:</b> ${data.mobileNumber || "Not provided"}</p>
                        <button onclick="window.updateData('${docSnap.id}')" style="padding:5px 10px;">Update</button>
                        <button onclick="window.deleteData('${docSnap.id}')" style="padding:5px 10px; background:#d32f2f;">Delete</button>
                        <button onclick="window.sendWhatsApp('${data.mobileNumber}', '${data.vehicleNumber}')" style="padding:5px 10px; background:#25D366; color:white;">Message Owner</button>
                    </div>`;
            });
        });
    }

    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            const vNum = document.getElementById('vNum').value.trim().toUpperCase();
            const fNum = document.getElementById('fNum').value;
            const mobile = document.getElementById('mobileNum').value.trim();
            const userEmail = auth.currentUser ? auth.currentUser.email : "";
            const assignedSociety = SOCIETY_MAP[userEmail] || "My Society Name";

            try {
                await addDoc(collection(db, "vehicles"), { 
                    vehicleNumber: vNum, 
                    flatNumber: fNum, 
                    mobileNumber: mobile,
                    societyName: assignedSociety 
                });
                showModal("Vehicle registered with mobile: " + mobile);
            } catch (e) { showModal("Error: " + e.message); }
        });
    }
});

window.updateData = async (id) => {
    const newFlat = document.getElementById(`f-${id}`).value;
    await updateDoc(doc(db, "vehicles", id), { flatNumber: newFlat });
    showModal("Updated successfully!");
};

window.deleteData = async (id) => {
    if (confirm("Delete this record?")) {
        await deleteDoc(doc(db, "vehicles", id));
        showModal("Deleted successfully!");
        document.getElementById('admin-results').innerHTML = "";
    }
};
