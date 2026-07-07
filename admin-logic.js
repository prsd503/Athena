import { auth, db } from "./app.js";
import { signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- Global Modal Functions ---
window.showModal = (msg, showInput = false) => {
    document.getElementById('modalMessage').innerText = msg;
    document.getElementById('modalMsgInput').style.display = showInput ? 'block' : 'none';
    document.getElementById('modalActionBtn').style.display = showInput ? 'block' : 'none';
    document.getElementById('customModal').style.display = 'block';
};

window.closeModal = () => {
    document.getElementById('customModal').style.display = 'none';
};

// --- Logic ---
document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('loginBtn');
    
    loginBtn?.addEventListener('click', async () => {
        const email = document.getElementById('email').value;
        const pass = document.getElementById('pass').value;
        try {
            await signInWithEmailAndPassword(auth, email, pass);
            // On success, switch UI
            document.getElementById('login-section').style.display = 'none';
            document.getElementById('search-section').style.display = 'block';
            document.getElementById('data-section').style.display = 'block';
        } catch (e) {
            window.showModal("Login failed: " + e.message);
        }
    });
});
