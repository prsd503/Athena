import { collection, getDocs, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from "./app.js";

// 1. Fetch and Display
async function loadVehicles() {
    const querySnapshot = await getDocs(collection(db, "vehicles"));
    const list = document.getElementById('vehicle-list');
    list.innerHTML = "";
    
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        list.innerHTML += `
            <div style="border-bottom:1px solid #ccc; padding:10px;">
                ${data.vehicleNumber} - ${data.flatNumber}
                <button onclick="deleteRecord('${doc.id}')">Delete</button>
            </div>`;
    });
}

// 2. Delete
window.deleteRecord = async (id) => {
    if (confirm("Are you sure?")) {
        await deleteDoc(doc(db, "vehicles", id));
        loadVehicles(); // Refresh list
    }
};

// 3. Update (Call this after successful login)
// Add a call to loadVehicles() inside your login function after login succeeds
