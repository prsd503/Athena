import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, deleteUser, EmailAuthProvider, reauthenticateWithCredential } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

// Initialize Firebase (Ensure these match your actual config)
const firebaseConfig = { /* ... your config ... */ };
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
    const email = document.getElementById('delEmail').value;
    const pass = document.getElementById('delPass').value;
    const user = auth.currentUser;

    if (!user) {
        alert("Please log in first.");
        return;
    }

    try {
        // 1. Re-authenticate the user
        const credential = EmailAuthProvider.credential(email, pass);
        await reauthenticateWithCredential(user, credential);

        // 2. Delete the user from Auth
        await deleteUser(user);
        
        alert("Account deleted successfully. Redirecting to home.");
        window.location.href = "index.html";
    } catch (error) {
        console.error(error);
        alert("Error: " + error.message);
    }
});
