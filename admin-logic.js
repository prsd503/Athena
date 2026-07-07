import { auth } from "/app.js"; 
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const loginSection = document.getElementById('login-section');
const dataSection = document.getElementById('data-section');

// Handle UI state based on login
onAuthStateChanged(auth, (user) => {
    if (user) {
        loginSection.classList.add('hidden');
        dataSection.classList.remove('hidden');
    } else {
        loginSection.classList.remove('hidden');
        dataSection.classList.add('hidden');
    }
});

// Login
document.getElementById('loginBtn').addEventListener('click', async () => {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('pass').value;
    try {
        await signInWithEmailAndPassword(auth, email, pass);
    } catch (e) {
        alert("Login failed: " + e.message);
    }
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', () => signOut(auth));
