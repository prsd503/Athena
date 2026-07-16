import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { 
    initializeAuth, 
    indexedDBLocalPersistence, 
    browserLocalPersistence 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// FIXED: Cleaned up authDomain to remove protocols/slashes and pointed to the correct handler
const firebaseConfig = {
  apiKey: "AIzaSyBEYKHQpy_VjmgjYIwQOPjXth1bghYsf9M",
  authDomain: "finder-owl.firebaseapp.com", 
  projectId: "finder-owl",
  storageBucket: "finder-owl.firebasestorage.app",
  messagingSenderId: "1011347100861",
  appId: "1:1011347100861:web:24246f9a4eb24d812cd3d4"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// --- CAPACITOR PERSISTENCE FIX ---
// Uses indexedDB for native iOS/Android packages to prevent local session storage loss and CORS errors
let authInstance;
if (window.location.href.includes("capacitor://")) {
    authInstance = initializeAuth(app, {
        persistence: indexedDBLocalPersistence
    });
} else {
    authInstance = initializeAuth(app, {
        persistence: browserLocalPersistence
    });
}
export const auth = authInstance;

// Public Search Listener
const findBtn = document.getElementById('findBtn');
if (findBtn) {
    findBtn.addEventListener('click', async () => {
        const qVal = document.getElementById('search').value.trim().toUpperCase();
        if (!qVal) return;

        const vehiclesRef = collection(db, "vehicles");
        const q = query(vehiclesRef, where("vehicleNumber", "==", qVal));
        const querySnapshot = await getDocs(q);
        
        let display = document.getElementById('result');
        
        if (!querySnapshot.empty) {
            querySnapshot.forEach(doc => {
                const data = doc.data();
                display.innerHTML = `
                    Found!<br>
                    Flat: <b>${data.flatNumber}</b><br>
                    Society: <b>${data.societyName || "N/A"}</b>
                `;
            });
        } else {
            display.innerHTML = "Not found in our records.";
        }
    });
}
