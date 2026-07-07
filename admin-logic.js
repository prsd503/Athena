import { auth, db } from "./app.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, query, where, getDocs, updateDoc, doc, deleteDoc, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Global variables for modal state
window.currentMobile = "";
window.currentVNum = "";

window.closeModal = () => {
    document.getElementById('customModal').style.display = 'none';
};

// Open Modal for Messaging
window.openMessageModal = (mobile, vNum) => {
    window.currentMobile = mobile;
    window.currentVNum = vNum;
    document.getElementById('modalMessage').innerText = "Message to " + vNum;
    document.getElementById('waMessage').style.display = 'block';
    document.getElementById('modalActionBtn').style.display = 'block';
    document.getElementById('customModal').style.display = 'block';
};

// Final WhatsApp Redirect
window.sendWhatsAppFinal = () => {
    const msg = document.getElementById('waMessage').value;
    const url = `https://wa.me/${window.currentMobile}?text=${encodeURIComponent("Finder-Owl Admin: " + msg)}`;
    window.open(url, '_blank');
    closeModal();
};

// --- Logic inside search ---
// Inside your snapshot.forEach in admin-logic.js, add this button:
// <button onclick="window.openMessageModal('${data.mobileNumber}', '${data.vehicleNumber}')">Message Owner</button>
