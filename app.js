window.searchVehicle = async function() {
    const qVal = document.getElementById('search').value.trim().toUpperCase();
    
    // Reference the 'vehicles' collection
    const vehiclesRef = collection(db, "vehicles");
    
    // Create the query
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
};
