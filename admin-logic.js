import { auth, db } from "./app.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, collection, addDoc, query, where, getDocs, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ... inside your login click listener
try {
    await signInWithEmailAndPassword(auth, email, pass);
    // ... rest of your success logic
} catch (e) {
    let errorMessage = "An error occurred.";
    
    // Catch specific Firebase Auth error codes
    if (e.code === 'auth/invalid-email') {
        errorMessage = "Invalid email format.";
    } else if (e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        errorMessage = "Invalid Email or Password.";
    } else if (e.code === 'auth/too-many-requests') {
        errorMessage = "Too many attempts. Try again later.";
    }
    
    // Use your existing modal function
    window.showModal(errorMessage);
}


// --- Updated Login Catch Block ---
} catch (e) {
    let errorMessage = "Login failed: ";
    
    // Map Firebase error codes to friendly messages
    switch (e.code) {
        case 'auth/invalid-email':
            errorMessage = "Invalid email format.";
            break;
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
            errorMessage = "Invalid Email or Password.";
            break;
        case 'auth/too-many-requests':
            errorMessage = "Too many attempts. Please try again later.";
            break;
        default:
            errorMessage = "Error: " + e.message;
    }
    
    // Trigger your custom modal instead of alert()
    window.showModal(errorMessage);
}


// Global variable to store society linked to logged-in admin
let assignedSociety = "";

// Global Helper for WhatsApp
window.sendWhatsApp = (phone, vNum) => {
    if (!phone) return alert("No mobile number found.");
    const msg = encodeURIComponent(`Hello, I have a query regarding your vehicle: ${vNum}`);
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
};

// Global Update function
window.updateData = async (id) => {
    const newFlat = document.getElementById(`f-${id}`).value.trim();
    const newMobile = document.getElementById(`m-${id}`).value.trim();
    if (!newFlat) return alert("Flat number required.");

    await updateDoc(doc(db, "vehicles", id), { flatNumber: newFlat, mobileNumber: newMobile });
    alert("Updated successfully!");
};

// Global Delete function
window.deleteData = async (id) => {
    if (confirm("Delete this entry?")) {
        await deleteDoc(doc(db, "vehicles", id));
        alert("Deleted.");
        location.reload();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    
    // Login & Dynamic Society Fetch
    document.getElementById('loginBtn')?.addEventListener('click', async () => {
        const email = document.getElementById('email').value.trim();
        const pass = document.getElementById('pass').value.trim();
        
        try {
            await signInWithEmailAndPassword(auth, email, pass);
            
            // DYNAMIC LOOKUP: Fetch society from the 'admins' collection
            const adminDoc = await getDoc(doc(db, "admins", email));
            if (adminDoc.exists()) {
                assignedSociety = adminDoc.data().society;
                document.getElementById('login-section').style.display = 'none';
                document.getElementById('search-section').style.display = 'block';
                document.getElementById('data-section').style.display = 'block';
                alert("Logged in as Admin for: " + assignedSociety);
            } else {
                alert("Admin account found, but no society linked.");
            }
        } catch (e) { alert("Login failed: " + e.message); }
    });

    // Search
    document.getElementById('adminSearchBtn')?.addEventListener('click', async () => {
        const qVal = document.getElementById('adminSearch').value.trim().toUpperCase();
        
        const q = query(
            collection(db, "vehicles"), 
            where("vehicleNumber", "==", qVal), 
            where("societyName", "==", assignedSociety)
        );
        
        const snapshot = await getDocs(q);
        const container = document.getElementById('admin-results');
        container.innerHTML = "";

        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            container.innerHTML += `
                <div style="margin:10px 0; border:1px solid #8d6e63; padding:10px; border-radius:10px;">
                    <p>Vehicle: <b>${data.vehicleNumber}</b></p>
                    <p>Flat: <input id="f-${docSnap.id}" value="${data.flatNumber}"></p>
                    <p>Mobile: <input id="m-${docSnap.id}" value="${data.mobileNumber || ''}"></p>
                    <button onclick="window.updateData('${docSnap.id}')">Update</button>
                    <button onclick="window.sendWhatsApp('${data.mobileNumber || ''}', '${data.vehicleNumber}')" style="background:#25D366; color:white;">WhatsApp</button>
                    <button onclick="window.deleteData('${docSnap.id}')" style="background:red; color:white;">Delete</button>
                </div>`;
        });
    });

    // Save New Entry
    document.getElementById('saveBtn')?.addEventListener('click', async () => {
        const vNum = document.getElementById('vNum').value.trim().toUpperCase();
        const fNum = document.getElementById('fNum').value.trim();
        const mNum = document.getElementById('mNum').value.trim();

        if (!vNum || !fNum) return alert("Fill all fields.");

        await addDoc(collection(db, "vehicles"), { 
            vehicleNumber: vNum, 
            flatNumber: fNum, 
            mobileNumber: mNum,
            societyName: assignedSociety 
        });
        alert("Vehicle added to " + assignedSociety);
        location.reload();
    });
});
