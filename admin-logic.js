// admin-logic.js
import { auth, db } from "./app.js";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, setDoc, collection, addDoc, query, where, getDocs, deleteDoc, updateDoc, writeBatch, serverTimestamp, arrayUnion } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let assignedSociety = "";
let editingDocId = null;
let pendingDeleteId = null;
let teamPhone = "919033406816"; // Default dynamic team phone number
let isMasterAdminUser = false;

// --- UI Helpers ---
window.closeModal = () => { document.getElementById('customModal').style.display = 'none'; };
window.showModal = (msg, showConfirm = false) => {
    document.getElementById('modalMessage').innerText = msg;
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    if (confirmBtn) confirmBtn.style.display = showConfirm ? 'inline-block' : 'none';
    document.getElementById('customModal').style.display = 'block';
};

window.downloadCSV = (content, filename) => {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

async function isVehicleExists(vNum, society) {
    const q = query(collection(db, "vehicles"), where("vehicleNumber", "==", vNum), where("societyName", "==", society));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
}

window.editEntry = (v, f, m, id) => {
    editingDocId = id;
    document.getElementById('vNum').value = v;
    document.getElementById('fNum').value = f;
    document.getElementById('mNum').value = m || "";
    document.getElementById('saveBtn').innerText = "Update Registry";
    window.showModal("Details loaded. Edit and click Update.");
};

window.deleteEntry = (id) => {
    pendingDeleteId = id;
    window.showModal("Are you sure you want to delete this record?", true);
};

window.confirmDelete = async () => {
    try {
        await deleteDoc(doc(db, "vehicles", pendingDeleteId));
        window.closeModal();
        window.showModal("Data deleted successfully.");
        document.getElementById('adminSearchBtn').click();
    } catch (e) { window.showModal("Delete error: " + e.message); }
    pendingDeleteId = null;
};

// --- Notice Board Helper Function ---
// --- Helper to get IST Date String (YYYY-MM-DD) ---
function getLocalDateString() {
    // Current time is IST (GMT+5:30)
    return new Date().toLocaleDateString('en-CA'); // 'en-CA' format is YYYY-MM-DD
}

// --- Updated Notice Board Helper ---
async function loadNoticeData() {
    if (!assignedSociety) return;
    try {
        const noticeRef = doc(db, "notices", assignedSociety);
        const noticeDoc = await getDoc(noticeRef);
        
        if (noticeDoc.exists()) {
            const data = noticeDoc.data();
            const todayStr = getLocalDateString(); // Uses IST-aligned local date

            // Check if the stored date is from a previous day
            if (data.date && data.date !== todayStr) {
                const newData = {
                    todayMessage: data.tomorrowMessage || "",
                    tomorrowMessage: "",
                    date: todayStr,
                    updatedAt: serverTimestamp()
                };

                await setDoc(noticeRef, newData, { merge: true });

                document.getElementById('todayMsg').value = newData.todayMessage;
                document.getElementById('tomorrowMsg').value = "";
                
                console.log("Notice board rotated to IST date:", todayStr);
            } else {
                if (document.getElementById('todayMsg')) document.getElementById('todayMsg').value = data.todayMessage || "";
                if (document.getElementById('tomorrowMsg')) document.getElementById('tomorrowMsg').value = data.tomorrowMessage || "";
            }
        }
    } catch (e) {
        console.error("Error loading/rotating notices: ", e);
    }
}

// --- Dynamic Config Loader ---
async function loadConfigData() {
    try {
        const configDoc = await getDoc(doc(db, "configs", "owlwatcher"));
        if (configDoc.exists()) {
            teamPhone = configDoc.data().teamPhone || "919033406816";
        }
    } catch (e) {
        console.error("Error loading configs: ", e);
    }
}

// --- Master Admin UI Builder ---
function setupMasterAdminUI(isMaster) {
    isMasterAdminUser = isMaster;
    let masterSection = document.getElementById('master-section');

document.getElementById('masterSocietySelectBtn')?.addEventListener('click', async () => {
    // ... (your existing code)
    assignedSociety = sName;
    document.getElementById('active-society-display').innerText = assignedSociety;
    
    // Add this line here:
    loadFacilitiesDropdown(); 
    
    loadNoticeData();
    
    // 2. NEW: Toggle Bulk Management visibility
    const bulkSection = document.getElementById('bulk-section'); // Ensure your HTML has this ID
    if (bulkSection) {
        bulkSection.style.display = isMaster ? 'block' : 'none';
    }
    
    if (!masterSection) {
        masterSection = document.createElement('div');
        masterSection.id = 'master-section';
        masterSection.className = 'card';
        masterSection.style.cssText = "background: #efebe9; border: 2px solid #8d6e63; border-radius: 16px; padding: 18px; margin-bottom: 15px; display: none;";
        
        const target = document.getElementById('search-section');
        if (target) {
            target.parentNode.insertBefore(masterSection, target);
        } else {
            const container = document.querySelector('.scrollable-controls-container');
            if (container) container.prepend(masterSection);
        }
    }

    if (isMaster) {
        masterSection.style.display = 'block';
        masterSection.innerHTML = `
            <h3 style="border-left: 4px solid #6d4c41; padding-left: 8px; margin-bottom: 12px; color: #5d4037;">👑 Master Control Center</h3>
            
            <div class="control-group">
                <label style="font-weight: bold; font-size: 0.85rem; color: #555;">Selected Workspace Society:</label>
                <div id="active-society-display" style="font-size: 1.15rem; font-weight: bold; color: #8d6e63; margin: 6px 0 12px 0; background: white; padding: 10px; border-radius: 8px; border: 1px solid #d7ccc8;">
                    ${assignedSociety || "None Selected"}
                </div>
                
                <div style="display: flex; gap: 8px;">
                    <input type="text" id="masterSocietySearch" placeholder="Search / Type Society Name" style="flex: 1; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px;">
                    <button id="masterSocietySelectBtn" style="background: #6d4c41; color: white; border: none; padding: 10px 16px; border-radius: 8px; cursor: pointer; font-weight: bold;">Select</button>
                </div>
            </div>
            
            <div style="border-top: 1px solid #d7ccc8; margin-top: 15px; padding-top: 15px;">
                <label style="font-weight: bold; font-size: 0.85rem; color: #555;">Owl Watcher Central Whatsapp Phone Number:</label>
                <div style="display: flex; gap: 8px; margin-top: 6px;">
                    <input type="text" id="teamPhoneInput" value="${teamPhone}" placeholder="e.g., 919033406816" style="flex: 1; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px;">
                    <button id="saveTeamPhoneBtn" style="background: #25d366; color: white; border: none; padding: 10px 16px; border-radius: 8px; cursor: pointer; font-weight: bold;">Update</button>
                </div>
            </div>
        `;

        // Master UI Event Listeners
        document.getElementById('masterSocietySelectBtn')?.addEventListener('click', async () => {
            const sName = document.getElementById('masterSocietySearch').value.trim();
            if (!sName) return window.showModal("Please enter a society name.");
            
            // Verify if society has existing registry records
            const q = query(collection(db, "vehicles"), where("societyName", "==", sName));
            const snap = await getDocs(q);
            
            assignedSociety = sName;
            document.getElementById('active-society-display').innerText = assignedSociety;
            loadNoticeData();
            
            if (snap.empty) {
                window.showModal(`Workspace shifted to "${sName}". (Note: No existing vehicle data found. Ready to import or build)`);
            } else {
                window.showModal(`Workspace successfully loaded: "${sName}"!`);
            }
        });

        document.getElementById('saveTeamPhoneBtn')?.addEventListener('click', async () => {
            const newPhone = document.getElementById('teamPhoneInput').value.trim().replace(/\D/g, '');
            if (!newPhone) return window.showModal("Please enter a valid numeric phone number.");
            
            try {
                await setDoc(doc(db, "configs", "owlwatcher"), { teamPhone: newPhone }, { merge: true });
                teamPhone = newPhone;
                window.showModal("Owl Watcher Support Contact saved successfully!");
            } catch (e) {
                window.showModal("Error saving dynamic contact: " + e.message);
            }
        });
    } else {
        masterSection.style.display = 'none';
    }
}

async function addFacility(name) {
    const ref = doc(db, "facilities", assignedSociety);
    try {
        await updateDoc(ref, {
            list: arrayUnion(name)
        });
        window.showModal("Facility added successfully!");
    } catch (e) {
        // If the document doesn't exist yet, create it
        if (e.code === 'not-found') {
            await setDoc(ref, { list: [name] });
            window.showModal("Facility created and added!");
        } else {
            window.showModal("Error adding facility: " + e.message);
        }
    }
}

async function loadFacilitiesDropdown() {
    const facilityDoc = await getDoc(doc(db, "facilities", assignedSociety));
    const select = document.getElementById('facilitySelect');
    if (facilityDoc.exists()) {
        const list = facilityDoc.data().list;
        select.innerHTML = list.map(f => `<option value="${f}">${f}</option>`).join('');
    }
}

                                                                    
document.addEventListener('DOMContentLoaded', () => {


    // Add this inside document.addEventListener('DOMContentLoaded', ...)
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
        console.log("Tab returned to focus, re-checking date...");
        loadNoticeData(); // Re-run the shift logic
    }
});
    
    // --- 1. Auth & Session Persistence ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                await loadConfigData(); // Load dynamic Owl Watcher contact
                const adminDoc = await getDoc(doc(db, "admins", user.email));
                if (adminDoc.exists()) {
                    const adminData = adminDoc.data();
                    assignedSociety = adminData.society || "";
                    loadFacilitiesDropdown();
                    
                    // Force display states to maintain layout on refresh
                    document.getElementById('login-section').style.display = 'none';
                    document.getElementById('search-section').style.display = 'block';
                    document.getElementById('data-section').style.display = 'block';
                    
                    // Handle Master Admin Interface logic
                    if (adminData.isMaster === true) {
                        setupMasterAdminUI(true);
                    } else {
                        setupMasterAdminUI(false);
                    }
                    
                    loadNoticeData();
                } else {
                    window.showModal("Unauthorized access: Admin record not found.");
                    await signOut(auth);
                }
            } catch (err) {
                console.error("Error verifying admin profile:", err);
            }
        } else {
            // Revert interface view cleanly if unauthenticated
            document.getElementById('login-section').style.display = 'block';
            document.getElementById('search-section').style.display = 'none';
            document.getElementById('data-section').style.display = 'none';
            setupMasterAdminUI(false);
            assignedSociety = "";
        }
    });

 // --- 2. Login/Logout ---
   document.getElementById('loginBtn')?.addEventListener('click', async () => {
        const email = document.getElementById('email').value.trim();
        const pass = document.getElementById('pass').value.trim();
        if (!email || !pass) return window.showModal("Enter Email and Password.");
        try { 
            await signInWithEmailAndPassword(auth, email, pass); 
        } catch (e) { 
            // Handle different Firebase Auth error cases
            if (e.code === 'auth/invalid-email') {
                window.showModal("Please enter a valid email address.");
            } else if (e.code === 'auth/invalid-credential' || e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password') {
                window.showModal("Invalid Credentials. Please check your email and password.");
            } else {
                window.showModal("Login error: " + e.message);
            }
        }
    });

    document.getElementById('logoutBtn')?.addEventListener('click', async () => { 
        try {
            await signOut(auth);
        } catch (e) {
            window.showModal("Logout error: " + e.message);
        }
    });

    // --- 3. Search Vehicles ---
    document.getElementById('adminSearchBtn')?.addEventListener('click', async (event) => {
        const qVal = document.getElementById('adminSearch').value.trim().toUpperCase();
        const container = document.getElementById('admin-results');
        container.innerHTML = "";
        if (!qVal) return window.showModal("Enter vehicle number.");
        const q = query(collection(db, "vehicles"), where("vehicleNumber", "==", qVal), where("societyName", "==", assignedSociety));
        const snapshot = await getDocs(q);
        if (snapshot.empty) { if (event.isTrusted) window.showModal("No data found."); return; }
        
        snapshot.forEach((d) => {
            const data = d.data();
            const type = data.vehicleType || "N/A";
            
            const waLink = data.mobileNumber ? `https://wa.me/${data.mobileNumber.replace(/\D/g, '')}?text=Hello, query regarding vehicle ${data.vehicleNumber}` : "#";
            const hasPhone = data.mobileNumber ? "" : "pointer-events: none; opacity: 0.5; background: #999;";

            container.innerHTML += `
            <div style="background:#fdf6e3; padding:12px; border-radius:10px; margin-bottom:10px; text-align:left; border: 1px solid #8d6e63;">
                <p style="margin: 0 0 8px 0;"><b>${data.vehicleNumber}</b> (${type}) | Flat: ${data.flatNumber}</p>
                <a href="${waLink}" target="_blank" style="background:#25d366; color:white; padding:6px 12px; border-radius:6px; text-decoration:none; font-size:0.8rem; display:inline-block; margin-right:5px; ${hasPhone}">WhatsApp</a>
                <button onclick="editEntry('${data.vehicleNumber}', '${data.flatNumber}', '${data.mobileNumber || ''}', '${d.id}')" style="background:#6d4c41; font-size:0.8rem; padding:6px 12px; border-radius:6px; color:white; border:none; cursor:pointer;">Edit</button>
                <button onclick="deleteEntry('${d.id}')" style="background:#d32f2f; font-size:0.8rem; padding:6px 12px; border-radius:6px; color:white; border:none; cursor:pointer;">Delete</button>
            </div>`;
        });
    });
    
        document.getElementById('addFacilityBtn')?.addEventListener('click', () => {
    const fName = document.getElementById('newFacilityName').value.trim();
    if (fName) {
        addFacility(fName); // This calls your existing function
        document.getElementById('newFacilityName').value = ""; // Clear input
    } else {
        window.showModal("Please enter a facility name.");
    }
});
    // --- 4. Save/Update Vehicles ---
    document.getElementById('saveBtn')?.addEventListener('click', async () => {
        const v = document.getElementById('vNum').value.trim().toUpperCase();
        const f = document.getElementById('fNum').value.trim();
        const m = document.getElementById('mNum').value.trim();
        const type = document.getElementById('vType').value;


    

        if (!v || !f) return window.showModal("Fill fields.");

        if (!editingDocId) {
            if (await isVehicleExists(v, assignedSociety)) return window.showModal("Vehicle exists!");
            await addDoc(collection(db, "vehicles"), { 
                vehicleNumber: v, flatNumber: f, mobileNumber: m, vehicleType: type, societyName: assignedSociety 
            });
            window.showModal("Added!");
        } else {
            await updateDoc(doc(db, "vehicles", editingDocId), { 
                vehicleNumber: v, flatNumber: f, mobileNumber: m, vehicleType: type 
            });
            window.showModal("Updated!");
            editingDocId = null;
            document.getElementById('saveBtn').innerText = "Save to Registry";
        }
    });

    // --- 5. Bulk Management ---
    document.getElementById('importBtn')?.addEventListener('click', () => {
        const file = document.getElementById('excelInput').files[0];
        if (!file) return window.showModal("Select file.");
        const reader = new FileReader();
        reader.onload = async (e) => {
            const rows = e.target.result.split('\n').slice(1);
            const batch = writeBatch(db);
            let count = 0;

            for (const row of rows) {
                const c = row.split(',');
                if (c.length >= 2) {
                    const vNum = c[0].trim().toUpperCase();
                    const vType = c[3]?.trim() || "2-Wheeler"; 
                    
                    if (!(await isVehicleExists(vNum, assignedSociety))) {
                        batch.set(doc(collection(db, "vehicles")), { 
                            vehicleNumber: vNum, 
                            flatNumber: c[1].trim(), 
                            mobileNumber: c[2]?.trim() || "", 
                            vehicleType: vType, 
                            societyName: assignedSociety 
                        });
                        count++;
                    }
                }
            }
            await batch.commit();
            window.showModal(`Imported ${count} new vehicles.`);
        };
        reader.readAsText(file);
    });

    document.getElementById('bulkDeleteBtn')?.addEventListener('click', () => {
        const file = document.getElementById('excelInput').files[0];
        if (!file) return window.showModal("Select CSV first.");
        const reader = new FileReader();
        reader.onload = async (e) => {
            const rows = e.target.result.split('\n').slice(1);
            const batch = writeBatch(db);
            let deletedCount = 0;
            for (const row of rows) {
                const vNum = row.split(',')[0]?.trim().toUpperCase();
                if (!vNum) continue;
                const q = query(collection(db, "vehicles"), where("vehicleNumber", "==", vNum), where("societyName", "==", assignedSociety));
                const snapshot = await getDocs(q);
                snapshot.forEach((doc) => { batch.delete(doc.ref); deletedCount++; });
            }
            if (deletedCount > 0) { await batch.commit(); window.showModal(`Deleted ${deletedCount} vehicles.`); document.getElementById('adminSearchBtn').click(); }
            else window.showModal("No matching vehicles found.");
        };
        reader.readAsText(file);
    });

    document.getElementById('downloadTemplateBtn')?.addEventListener('click', () => {
        window.downloadCSV("VehicleNumber,FlatNumber/Name,MobileNumber,VehicleType\n", "Vehicle_Template.csv");
    });

    document.getElementById('exportBtn')?.addEventListener('click', async () => {
        const snapshot = await getDocs(query(collection(db, "vehicles"), where("societyName", "==", assignedSociety)));
        let csv = "VehicleNumber,FlatNumber/Name,MobileNumber,VehicleType\n"; 
        snapshot.forEach(d => { 
            const dt = d.data(); 
            csv += `${dt.vehicleNumber},${dt.flatNumber},${dt.mobileNumber || ''},${dt.vehicleType || '2-Wheeler'}\n`; 
        });
        window.downloadCSV(csv, "Vehicles.csv");
    });

    // --- 6. Notice Board Management ---
   document.getElementById('postNoticeBtn')?.addEventListener('click', async () => {
    const today = document.getElementById('todayMsg').value;
    const tomorrow = document.getElementById('tomorrowMsg').value;

    if (!assignedSociety) return window.showModal("Society not loaded.");

    try {
        await setDoc(doc(db, "notices", assignedSociety), {
            todayMessage: today,
            tomorrowMessage: tomorrow,
            date: getLocalDateString(), // Saves using the same IST-aligned format
            updatedAt: serverTimestamp()
        }, { merge: true });
        
        window.showModal("Notices updated successfully!");
    } catch (e) {
        window.showModal("Error posting notice: " + e.message);
    }
});

    document.getElementById('deleteNoticeBtn')?.addEventListener('click', async () => {
        if (!assignedSociety) return;
        try {
            await deleteDoc(doc(db, "notices", assignedSociety));
            document.getElementById('todayMsg').value = "";
            document.getElementById('tomorrowMsg').value = "";
            alert("Notice deleted.");
        } catch (e) {
            alert("Error deleting: " + e.message);
        }
    });

    // --- 7. Security Guard Management ---
    document.getElementById('searchGuardBtn')?.addEventListener('click', async () => {
        const nameToSearch = document.getElementById('searchGuardName').value.trim().toLowerCase();
        if (!nameToSearch) return window.showModal("Enter a name to search.");

        const q = query(collection(db, "guards"), where("name_lower", "==", nameToSearch), where("society", "==", assignedSociety));
        const snap = await getDocs(q);

        if (!snap.empty) {
            const docSnap = snap.docs[0];
            const data = docSnap.data();
            editingDocId = docSnap.id;
            document.getElementById('gEmail').value = data.email || "";
            document.getElementById('gName').value = data.name || "";
            document.getElementById('gPhone').value = data.phone || "";
            window.showModal("Guard found.");
        } else {
            window.showModal("No guard found.");
        }
    });

    document.getElementById('addGuardBtn')?.addEventListener('click', async () => {
        const email = document.getElementById('gEmail').value.trim();
        const name = document.getElementById('gName').value.trim();
        const phone = document.getElementById('gPhone').value.trim();
        const nameLower = name.toLowerCase();

        if (!email || !name || !phone) return window.showModal("Fill all fields.");

        if (!editingDocId) {
            const q = query(collection(db, "guards"), where("name_lower", "==", nameLower), where("society", "==", assignedSociety));
            const snap = await getDocs(q);
            if (!snap.empty) return window.showModal("Error: Guard already exists.");
            
            await addDoc(collection(db, "guards"), { 
                email, name, phone, name_lower: nameLower, society: assignedSociety 
            });
            window.showModal("New guard added.");
        } else {
            await updateDoc(doc(db, "guards", editingDocId), { 
                email, name, phone, name_lower: nameLower, society: assignedSociety 
            });
            window.showModal("Guard updated.");
        }
        editingDocId = null;
    });

    document.getElementById('deleteGuardBtn')?.addEventListener('click', async () => {
        if (!editingDocId) return window.showModal("Search for a guard first.");
        await deleteDoc(doc(db, "guards", editingDocId));
        window.showModal("Guard deleted.");
        editingDocId = null;
        document.getElementById('gEmail').value = "";
        document.getElementById('gName').value = "";
        document.getElementById('gPhone').value = "";
    }); 
    


    
    async function createBooking(facilityName, date, timeSlot) {
    await addDoc(collection(db, "bookings"), {
        society: assignedSociety,
        facility: facilityName,
        start: date, // FullCalendar format: YYYY-MM-DD
        title: `Booked: ${facilityName}`
    });
}

    document.getElementById('bookFacilityBtn')?.addEventListener('click', () => {
    const fName = document.getElementById('facilitySelect').value;
    const date = document.getElementById('bookingDate').value;
    
    if (!fName || !date) return window.showModal("Please select a facility and date.");
    
    createBooking(fName, date, "Full Day"); // Calling your existing function
    window.showModal("Booking created for " + fName);
});
    
    
// --- 8. Ad Request Key Approval System ---
    document.getElementById('approveAdBtn')?.addEventListener('click', async () => {
        const adKeyInput = document.getElementById('adApprovalKey');
        if (!adKeyInput) return;
        
        const adKey = adKeyInput.value.trim().toUpperCase();
        if (!adKey) return window.showModal("Please enter an Ad Request Key.");
        if (!assignedSociety) return window.showModal("Society data missing. Please re-login.");

        try {
            const adDocRef = doc(db, "ads", adKey);
            const adSnap = await getDoc(adDocRef);

            if (!adSnap.exists()) {
                return window.showModal("No such Ad Request Key found in the system.");
            }

            const adData = adSnap.data();
            
            // Security verification: Ensure admin only approves ads for their own society
            if (adData.societyName?.toLowerCase() !== assignedSociety.toLowerCase()) {
                return window.showModal("Unauthorized: This key belongs to another community billboard.");
            }

            await updateDoc(adDocRef, { societyApproved: true });

            // Dynamically utilize loaded teamPhone variable
            const message = `Hello Owl Watcher Central Team, I am the admin of "${assignedSociety}". I have approved the Ad Request Key: ${adKey}. Please collect the creative details.`;
            const waUrl = `https://wa.me/${teamPhone}?text=${encodeURIComponent(message)}`;

            // Create a custom modal confirmation flow with a direct button to chat
            const modalContent = document.getElementById('customModal');
            if (modalContent) {
                window.showModal(`Success! Ad Request ${adKey} has been verified and approved.`);
                
                // Update/inject WhatsApp button dynamically underneath input field
                let waButton = document.getElementById('adminWaTeamBtn');
                if (!waButton) {
                    waButton = document.createElement('a');
                    waButton.id = 'adminWaTeamBtn';
                    waButton.target = '_blank';
                    waButton.style.cssText = "background:#25d366; color:white; padding:10px 20px; border-radius:10px; text-decoration:none; font-size:1.1rem; display:inline-block; margin-top:10px; font-weight:bold; text-align:center; border: 2px solid #1ebe57; width:80%; box-sizing:border-box;";
                    adKeyInput.parentNode.appendChild(waButton);
                }
                waButton.href = waUrl;
                waButton.innerText = `💬 Send Approved Key (${adKey}) to Owl Watcher`;
                waButton.style.display = 'inline-block';
            }

            adKeyInput.value = ""; // Clear input field upon successful updates
        } catch (e) {
            window.showModal("Error approving Ad Key: " + e.message);
        }
    });    
});
