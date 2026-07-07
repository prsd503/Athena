// ... existing imports and config ...

findBtn.addEventListener('click', async () => {
    const qVal = document.getElementById('search').value.trim().toUpperCase();
    const display = document.getElementById('result');
    
    if (!qVal) return;

    display.innerHTML = "Searching...";

    try {
        const vehiclesRef = collection(db, "vehicles");
        const q = query(vehiclesRef, where("vehicleNumber", "==", qVal));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            querySnapshot.forEach(doc => {
                const data = doc.data();
                
                // Construct WhatsApp link using admin phone from database or fallback
                const adminPhone = data.mobileNumber || "919033406816"; 
                const message = encodeURIComponent("Hello, I have a query regarding my vehicle.");
                const whatsappLink = `https://wa.me/${adminPhone}?text=${message}`;

                // Injecting both flat number and the message link
                display.innerHTML = `
                    <div style="margin-top:15px;">
                        ✅ Vehicle registered.<br>
                        Flat Number: <b>${data.flatNumber || "N/A"}</b><br>
                        <a href="${whatsappLink}" target="_blank" style="display:inline-block; margin-top:10px; padding:10px; background:#25D366; color:white; text-decoration:none; border-radius:5px;">
                            💬 Message Society Admin
                        </a>
                    </div>
                `;
            });
        } else {
            display.innerHTML = "❌ Not found.";
        }
    } catch (error) {
        console.error("Firestore Error:", error);
        display.innerHTML = "Error connecting to database.";
    }
});
