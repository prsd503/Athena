import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyBEYKHQpy_VjmgjYiWQOPjXth1bghYsf9M",
    authDomain: "finder-owl.firebaseapp.com",
    projectId: "finder-owl",
    storageBucket: "finder-owl.firebasestorage.app",
    messagingSenderId: "1011347100861",
    appId: "1:1011347100861:web:24246f9a4eb24d812cd3d4"
};

const app = initializeApp(firebaseConfig);

// CRITICAL: These exports make 'db' and 'auth' available to other files (like admin-logic.js)
export const db = getFirestore(app);
export const auth = getAuth(app);

// Public Search Logic for index.html
const findBtn = document.getElementById('findBtn');
if (findBtn) {
    findBtn.addEventListener('click', async () => {
        const searchInput = document.getElementById('search');
        const display = document.getElementById('result');
        const qVal = searchInput?.value.trim().toUpperCase();
        
        if (!qVal) {
            display.innerHTML = "Please enter a vehicle number.";
            return;
        }

        display.innerHTML = "Searching...";

        try {
            const vehiclesRef = collection(db, "vehicles");
            const q = query(vehiclesRef, where("vehicleNumber", "==", qVal));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                // Get the first result
                const docSnap = querySnapshot.docs[0];
                const data = docSnap.data();
                
                const adminPhone = data.mobileNumber || "919033406816"; 
                const message = encodeURIComponent("Hello Admin, I have a query regarding my vehicle.");
                const whatsappLink = `https://wa.me/${adminPhone}?text=${message}`;

                display.innerHTML = `
                    <div style="margin-top:15px;">
                        ✅ Vehicle registered.<br>
                        Flat Number: <b>${data.flatNumber || "N/A"}</b><br>
                        <a href="${whatsappLink}" target="_blank" style="display:inline-block; margin-top:10px; padding:10px; background:#25D366; color:white; text-decoration:none; border-radius:5px;">
                            💬 Message Society Admin
                        </a>
                    </div>
                `;
            } else {
                display.innerHTML = "❌ Not found.";
            }
        } catch (error) {
            console.error("Firestore Error:", error);
            display.innerHTML = "Error connecting to database.";
        }
    });
}
