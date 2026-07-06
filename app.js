import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Your firebaseConfig object (from file "77dd83b6-3406-4dfb-a8c8-224d065f8548")
const firebaseConfig = {
  apiKey: "AIzaSyBEYKHQpy_VjmgjYIwQOPjXth1bghYsf9M",
  authDomain: "finder-owl.firebaseapp.com",
  projectId: "finder-owl",
  storageBucket: "finder-owl.firebasestorage.app",
  messagingSenderId: "1011347100861",
  appId: "1:1011347100861:web:24246f9a4eb24d812cd3d4"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Your logic with the event listener
document.getElementById('findBtn').addEventListener('click', async () => {
    const qVal = document.getElementById('search').value.trim().toUpperCase();
    
    if (!qVal) return;

    const vehiclesRef = collection(db, "vehicles");
    const q = query(vehiclesRef, where("vehicleNumber", "==", qVal));
    const querySnapshot = await getDocs(q);
    
    let display = document.getElementById('result');
    
    if (!querySnapshot.empty) {
        querySnapshot.forEach(doc => {
            const data = doc.data();
            display.innerHTML = `Found! Flat: <b>${data.flatNumber}</b>`;
        });
    } else {
        display.innerHTML = "Not found in our records.";
    }
});
