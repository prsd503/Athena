import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

const auth = getAuth();

document.getElementById('submitDeleteBtn').addEventListener('click', () => {
    const user = auth.currentUser;
    if (!user) {
        alert("You must be logged in to request deletion.");
        window.location.href = "index.html";
        return;
    }

    const email = user.email;
    const message = encodeURIComponent(`Hi, I am requesting to delete my Owl Watcher account. 
    Please process my data export and account closure for the following email: ${email}`);

    // Open WhatsApp
    window.open(`https://wa.me/919033406816?text=${message}`, '_blank');
    
    alert("Request submitted! I will contact you shortly to confirm your data export.");
    window.location.href = "index.html";
});
