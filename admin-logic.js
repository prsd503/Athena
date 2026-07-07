import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, query, where, getDocs, addDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = { /* Your Config */ };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let linkedSociety = "";

// Login and Link Society
document.getElementById("loginBtn").addEventListener("click", async () => {
    const email = document.getElementById("email").value;
    const pass = document.getElementById("pass").value;
    
    try {
        await signInWithEmailAndPassword(auth, email, pass);
        
        // Lookup society linked to this admin email
        const q = query(collection(db, "admins"), where("email", "==", email));
        const snap = await getDocs(q);
        
        if (!snap.empty) {
            linkedSociety = snap.docs[0].data().societyName;
            document.getElementById("login-section").style.display = "none";
            document.getElementById("search-section").style.display = "block";
            document.getElementById("data-section").style.display = "block";
            document.getElementById("admin-dashboard").style.display = "block";
        } else {
            alert("This email is not registered as an Admin.");
        }
    } catch (e) { alert("Login Error: " + e.message); }
});

// Add Vehicle to Linked Society
document.getElementById("saveBtn").addEventListener("click", async () => {
    const vNum = document.getElementById("vNum").value.trim().toUpperCase();
    const fNum = document.getElementById("fNum").value.trim();
    
    if (!vNum || !fNum) return alert("All fields required");

    await addDoc(collection(db, "vehicles"), {
        vehicleNumber: vNum,
        flatNumber: fNum,
        societyName: linkedSociety
    });
    alert("Vehicle added to " + linkedSociety);
});

// Search and WhatsApp Action
document.getElementById("adminSearchBtn").addEventListener("click", async () => {
    const vNum = document.getElementById("adminSearch").value.trim().toUpperCase();
    const q = query(collection(db, "vehicles"), where("societyName", "==", linkedSociety));
    const snap = await getDocs(q);
    const match = snap.docs.find(d => d.data().vehicleNumber === vNum);

    const display = document.getElementById("admin-results");
    if (match) {
        const data = match.data();
        display.innerHTML = `
            <p>Flat: ${data.flatNumber}</p>
            <a href="https://wa.me/${data.mobileNumber}?text=Hello, query regarding your vehicle ${vNum}" target="_blank">
                <button>Message Owner on WhatsApp</button>
            </a>
            <button onclick="deleteVehicle('${match.id}')" style="background:red;">Delete Entry</button>
        `;
    } else {
        display.innerHTML = "No vehicle found in this society.";
    }
});

window.deleteVehicle = async (id) => {
    if(confirm("Confirm deletion?")) {
        await deleteDoc(doc(db, "vehicles", id));
        alert("Removed.");
    }
};
