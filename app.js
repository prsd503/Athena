import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = { /* PASTE YOUR CONFIG FROM FIREBASE CONSOLE HERE */ };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

window.searchVehicle = async function() {
    const qVal = document.getElementById('search').value.toUpperCase();
    const q = query(collection(db, "vehicles"), where("vehicleNumber", "==", qVal));
    const querySnapshot = await getDocs(q);
    
    let display = document.getElementById('result');
    if (!querySnapshot.empty) {
        querySnapshot.forEach(doc => {
            display.innerHTML = `Found! Flat: <b>${doc.data().flatNumber}</b>`;
        });
    } else {
        display.innerHTML = "Not found in our records.";
    }
};

// Register Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
}
