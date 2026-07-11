import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

// Note: Ensure your Firebase initialization code is present in this file
// or imported here if it's in a separate config file.

const auth = getAuth();

document.getElementById('submitDeleteBtn').addEventListener('click', () => {
    const user = auth.currentUser;
    
    if (!user) {
        alert("Session expired. Please log in again.");
        window.location.href = "index.html";
        return;
    }

    const email = user.email;
    const phoneNumber = "919033406816";
    const message = encodeURIComponent(`Hi, I am requesting to delete my Owl Watcher account. 
Please process my data export and account closure for the following email: ${email}`);

    // This method is more reliable than window.open for opening WhatsApp
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;

    alert("Redirecting to WhatsApp to submit your request...");
    window.location.href = whatsappUrl;
});
