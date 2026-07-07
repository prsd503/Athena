import { auth, db } from "./app.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const SOCIETY_MAP = {
    "brink2wink@gmail.com": "Aangan",
    "rkom@gmail.com": "Indra"
};

// --- Messaging Context ---
let pendingMobile = "";
let pendingVNum = "";

// --- Modal Functions ---
window.showModal = (msg) => {
    document.getElementById('modalMessage').innerText = msg;
    document.getElementById('customModal').style.display = 'block';
};

window.closeModal = () => {
    document.getElementById('customModal').style.display = 'none';
    document.getElementById('modalMsgInput').style.display = 'none';
    document.getElementById('modalActionBtn').style.display = 'none';
};

window.sendWhatsApp = (mobile, vNum) => {
    if (!mobile) return alert("No mobile number provided.");
    pendingMobile = mobile;
    pendingVNum = vNum;
    document.getElementById('modalMessage').innerText = "Message for " + vNum;
    document.getElementById('modalMsgInput').style.display = 'block';
    document.getElementById('modalActionBtn').style.display = 'inline-block';
    document.getElementById('customModal').style.display = 'block';
};

window.handleModalAction = () => {
    const msg = document.getElementById('modalMsgInput').value;
    if (!msg) return alert("Please enter a message!");
    const url = `https://wa.me/${pendingMobile}?text=${encodeURIComponent("Message from Finder-Owl Admin regarding vehicle number " + pendingVNum + ": " + msg)}`;
    window.open(url, '_blank');
    document.getElementById('modalMsgInput').value = "";
    closeModal();
};

document.addEventListener('DOMContentLoaded', () => {
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

    document.getElementById('adminSearchBtn')?.addEventListener('click', async () => {
        const qVal = document.getElementById('adminSearch').value.trim().toUpperCase();
        const userEmail = auth.currentUser?.email;
        const assignedSociety = SOCIETY_MAP[userEmail] || "Default";
        const q = query(collection(db, "vehicles"), where("vehicleNumber", "==", qVal), where("societyName", "==", assignedSociety));
        const snapshot = await getDocs(q);
        const container = document.getElementById('admin-results');
        container.innerHTML = "";
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            container.innerHTML += `
                <div style="margin:15px 0; border:2px solid #8d6e63; padding:15px; border-radius:15px; background:#fff;">
                    <p><b>Vehicle:</b> ${data.vehicleNumber}</p>
                    <p><b>Flat:</b> <input id="f-${docSnap.id}" value="${data.flatNumber}"></p>
                    <p><b>Mobile:</b> ${data.mobileNumber || "N/A"}</p>
                    <button onclick="window.updateData('${docSnap.id}')">Update</button>
                    <button onclick="window.deleteData('${docSnap.id}')" style="background:#d32f2f;">Delete</button>
                    <button onclick="window.sendWhatsApp('${data.mobileNumber}', '${data.vehicleNumber}')" style="background:#25D366;">Message</button>
                </div>`;
        });
    });

    document.getElementById('saveBtn')?.addEventListener('click', async () => {
        const vNum = document.getElementById('vNum').value.trim().toUpperCase();
        const fNum = document.getElementById('fNum').value;
        const mobile = document.getElementById('mobileNum').value.trim();
        const userEmail = auth.currentUser?.email;
        const society = SOCIETY_MAP[userEmail] || "Default";
        if (!vNum || !mobile) return showModal("Fields required.");
        try {
            await addDoc(collection(db, "vehicles"), { vehicleNumber: vNum, flatNumber: fNum, mobileNumber: mobile, societyName: society });
            showModal("Vehicle Saved!");
        } catch (e) { showModal("Error: " + e.message); }
    });
});

window.updateData = async (id) => {
    await updateDoc(doc(db, "vehicles", id), { flatNumber: document.getElementById(`f-${id}`).value });
    showModal("Updated!");
};

window.deleteData = async (id) => {
    if (confirm("Delete?")) {
        await deleteDoc(doc(db, "vehicles", id));
        showModal("Deleted!");
    }
};
