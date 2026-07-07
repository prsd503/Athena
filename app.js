import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBEYKHQpy_VjmgjYiWQOPjXth1bghYsf9M",
  authDomain: "finder-owl.firebaseapp.com",
  projectId: "finder-owl",
  storageBucket: "finder-owl.firebasestorage.app",
  messagingSenderId: "1011347100861",
  appId: "1:1011347100861:web:24246f9a4eb24d812cd3d4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Public Search Listener
const findBtn = document.getElementById('findBtn');
if (findBtn) {
    findBtn.addEventListener('click', async () => {
        const searchInput = document.getElementById('search');
        const display = document.getElementById('result');
        const qVal = searchInput.value.trim().toUpperCase();
        
        if (!qVal) {
            display.innerHTML = "Please enter a vehicle number.";
            return;
        }

        display.innerHTML = "Searching...";

        try {
            const vehiclesRef = collection(db, "vehicles");
            // Query for the specific vehicle number
            const q = query(vehiclesRef, where("vehicleNumber", "==", qVal));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                let resultsHtml = "Found!<br>";
                querySnapshot.forEach(doc => {
                    const data = doc.data();
                    resultsHtml += `
                        <div style="margin-top:10px; border-top:1px solid #ccc; padding-top:5px;">
                            Flat: <b>${data.flatNumber || "N/A"}</b><br>
                            Society: <b>${data.societyName || "N/A"}</b>
                        </div>
                    `;
                });
                display.innerHTML = resultsHtml;
            } else {
                display.innerHTML = "Not found in our records.";
            }
        } catch (error) {
            console.error("Firestore Error:", error);
            display.innerHTML = "Error connecting to database. Please check your console.";
        }
    });
}
