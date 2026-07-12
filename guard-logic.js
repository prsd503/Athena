import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

const db = getFirestore();
const auth = getAuth();

// 1. Handle Login
document.getElementById('loginBtn').addEventListener('click', async () => {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('pass').value;
    await signInWithEmailAndPassword(auth, email, pass);
    
    // Once logged in, populate the guard dropdown
    const guards = await getDocs(collection(db, "guards"));
    const select = document.getElementById('guardSelect');
    select.innerHTML = "";
    guards.forEach(doc => {
        const data = doc.data();
        select.innerHTML += `<option value="${data.name}" data-phone="${data.phone}">${data.name}</option>`;
    });
    
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('portalSection').style.display = 'block';
});

// 2. Activate Duty
document.getElementById('activateBtn').addEventListener('click', async () => {
    const select = document.getElementById('guardSelect');
    const name = select.value;
    const phone = select.options[select.selectedIndex].dataset.phone;
    
    await updateDoc(doc(db, "societies", "Aangan"), { activeGuardName: name, activeGuardPhone: phone });
    alert("You are now active!");
});

// 3. Search Vehicle
document.getElementById('searchBtn').addEventListener('click', async () => {
    const vNum = document.getElementById('vSearch').value.toUpperCase();
    const snap = await getDoc(doc(db, "vehicles", vNum));
    if (snap.exists()) {
        const d = snap.data();
        document.getElementById('result').innerHTML = `Owner: ${d.name}<br>Flat: ${d.flat}<br><a href="tel:${d.phone}">📞 Call: ${d.phone}</a>`;
    } else {
        alert("Not found");
    }
});
