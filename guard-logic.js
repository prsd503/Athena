import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

const auth = getAuth();
const db = getFirestore();

window.login = async () => {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('pass').value;
    try {
        await signInWithEmailAndPassword(auth, email, pass);
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('searchSection').style.display = 'block';
    } catch (e) { alert("Invalid credentials."); }
};

window.searchVehicle = async () => {
    const vNum = document.getElementById('vNum').value.toUpperCase().trim();
    const guardEmail = auth.currentUser.email;

    // 1. Verify guard has a society assignment
    const guardDoc = await getDoc(doc(db, "guards", guardEmail));
    if (!guardDoc.exists()) return alert("Not authorized.");
    
    const societyId = guardDoc.data().societyId;

    // 2. Fetch vehicle and verify society match
    const vDoc = await getDoc(doc(db, "vehicles", vNum));
    if (vDoc.exists() && vDoc.data().societyId === societyId) {
        const d = vDoc.data();
        document.getElementById('result').style.display = 'block';
        document.getElementById('result').innerHTML = `
            <p><strong>Name:</strong> ${d.name}</p>
            <p><strong>Flat:</strong> ${d.flat}</p>
            <a href="tel:${d.phone}" style="color:green; font-weight:bold;">📞 Call Owner</a>
        `;
    } else {
        alert("Vehicle not found in your society registry.");
    }
};
