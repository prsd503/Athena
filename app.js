// Remove "window." and wrap the logic in a listener
document.getElementById('findBtn').addEventListener('click', async () => {
    const qVal = document.getElementById('search').value.trim().toUpperCase();
    
    // Check if input is empty
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
