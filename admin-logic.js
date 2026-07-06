import { auth, db } from "./app.js";
import { collection, query, where, getDocs, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 1. Search Logic
document.getElementById('adminSearchBtn').addEventListener('click', async () => {
    const qVal = document.getElementById('adminSearch').value.trim().toUpperCase();
    const q = query(collection(db, "vehicles"), where("vehicleNumber", "==", qVal));
    const snapshot = await getDocs(q);
    const container = document.getElementById('admin-results');
    container.innerHTML = "";

    snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        container.innerHTML += `
            <div style="margin-top:10px; border:1px solid #8d6e63; padding:10px;">
                <p>Flat: <input id="f-${docSnap.id}" value="${data.flatNumber}"></p>
                <button onclick="updateData('${docSnap.id}')">Update</button>
                <button onclick="deleteData('${docSnap.id}')" style="background:red;">Delete</button>
            </div>`;
    });
});

// 2. Update Function
window.updateData = async (id) => {
    const newFlat = document.getElementById(`f-${id}`).value;
    await updateDoc(doc(db, "vehicles", id), { flatNumber: newFlat });
    alert("Updated!");
};

// 3. Delete Function
window.deleteData = async (id) => {
    if (confirm("Delete this record?")) {
        await deleteDoc(doc(db, "vehicles", id));
        alert("Deleted!");
        document.getElementById('admin-results').innerHTML = "";
    }
};
