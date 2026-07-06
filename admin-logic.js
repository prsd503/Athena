import { auth, db } from "./app.js"; // Import your initialized Firebase
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Handle Login
window.login = async () => {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('pass').value;
    try {
        await signInWithEmailAndPassword(auth, email, pass);
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('data-section').style.display = 'block';
        alert("Logged in successfully!");
    } catch (e) { alert(e.message); }
};

// Save Data
window.saveData = async () => {
    const vNum = document.getElementById('vNum').value.toUpperCase();
    const fNum = document.getElementById('fNum').value;
    const sName = document.getElementById('sName').value;

    try {
        await addDoc(collection(db, "vehicles"), {
            vehicleNumber: vNum,
            flatNumber: fNum,
            societyName: sName,
            addedBy: auth.currentUser.uid
        });
        alert("Vehicle added!");
    } catch (e) { alert("Error: " + e.message); }
};
