import { auth, db } from "./app.js";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, setDoc, collection, addDoc, query, where, getDocs, deleteDoc, updateDoc, writeBatch, serverTimestamp, arrayUnion } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let assignedSociety = "";
let editingDocId = null;
let pendingDeleteId = null;
let teamPhone = "919033406816";
let isMasterAdminUser = false;

// --- UI & Global Helpers ---
window.showModal = (msg, showConfirm = false) => {
    document.getElementById('modalMessage').innerText = msg;
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    if (confirmBtn) confirmBtn.style.display = showConfirm ? 'inline-block' : 'none';
    document.getElementById('customModal').style.display = 'block';
};
window.closeModal = () => { document.getElementById('customModal').style.display = 'none'; };

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

// --- Security Guard Management Logic ---

// 1. Search Guard by Name
document.getElementById('searchGuardBtn')?.addEventListener('click', async () => {
    const searchName = document.getElementById('searchGuardName').value.trim().toLowerCase();
    if (!searchName) return window.showModal("Please enter a guard name to search.");

    try {
        const q = query(
            collection(db, "guards"), 
            where("society", "==", assignedSociety),
            where("name_lower", "==", searchName)
        );
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            window.showModal("No guard found with that name.");
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            document.getElementById('gEmail').value = data.email || docSnap.id;
            document.getElementById('gName').value = data.name || "";
            document.getElementById('gPhone').value = data.phone || "";
            window.showModal("Guard details loaded into form.");
        });
    } catch (err) {
        window.showModal("Error searching for guard. Check console indexes if needed.");
        console.error(err);
    }
});


// 2. Save / Add or Update Guard
document.getElementById('addGuardBtn')?.addEventListener('click', async () => {
    const email = document.getElementById('gEmail').value.trim().toLowerCase();
    const name = document.getElementById('gName').value.trim();
    const phone = document.getElementById('gPhone').value.trim();

    if (!email || !name) return window.showModal("Guard Email and Name are required.");

    try {
        const nameLower = name.toLowerCase();
        
        // Check if a guard with this name already exists in the same society
        const q = query(
            collection(db, "guards"),
            where("society", "==", assignedSociety),
            where("name_lower", "==", nameLower)
        );
        const querySnapshot = await getDocs(q);

        let targetDocId = email; // Default to email as ID if not found

        if (!querySnapshot.empty) {
            // If found, grab the existing document's ID so we update it instead of creating a new one
            targetDocId = querySnapshot.docs[0].id;
        }

        // Save or update using the resolved document ID
        await setDoc(doc(db, "guards", targetDocId), {
            email: email,
            name: name,
            name_lower: nameLower,
            phone: phone,
            society: assignedSociety,
            updatedAt: serverTimestamp()
        }, { merge: true });

        window.showModal("Guard saved successfully!");
    } catch (err) {
        window.showModal("Failed to save guard details.");
    }
});

// 3. Delete Guard
document.getElementById('deleteGuardBtn')?.addEventListener('click', async () => {
    const email = document.getElementById('gEmail').value.trim().toLowerCase();
    if (!email) return window.showModal("Please specify or search the guard email to delete.");

    try {
        await deleteDoc(doc(db, "guards", email));
        window.showModal("Guard deleted successfully.");
        
        // Clear input fields
        document.getElementById('gEmail').value = "";
        document.getElementById('gName').value = "";
        document.getElementById('gPhone').value = "";
    } catch (err) {
        window.showModal("Failed to delete guard record.");
    }
});


// --- Vehicle Search Logic ---
document.getElementById('adminSearchBtn')?.addEventListener('click', async () => {
    const searchVal = document.getElementById('adminSearch').value.trim().toUpperCase();
    const resultsDiv = document.getElementById('admin-results');
    if (!searchVal) return window.showModal("Please enter a vehicle number to search.");

    resultsDiv.innerHTML = "Searching...";
    try {
        const q = query(collection(db, "vehicles"), where("vehicleNumber", "==", searchVal), where("societyName", "==", assignedSociety));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            resultsDiv.innerHTML = "<p>No vehicle found.</p>";
            return;
        }

        // --- Delete Vehicle Document Helper ---
window.deleteVehicleDoc = async (docId) => {
    try {
        await deleteDoc(doc(db, "vehicles", docId));
        window.showModal("Vehicle deleted from registry.");
        // Clear or re-trigger search results view if desired
        document.getElementById('admin-results').innerHTML = "";
    } catch (err) {
        window.showModal("Failed to delete vehicle record.");
    }
};

        resultsDiv.innerHTML = "";
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            resultsDiv.innerHTML += `
                <div style="background:#f4ece0; padding:10px; margin-top:5px; border-radius:8px;">
                    <b>Vehicle:</b> ${data.vehicleNumber}<br>
                    <b>Vehicle Type:</b> ${data.vehicleType}<br>
                    <b>Flat:</b> ${data.flatNumber}<br>
                    <button onclick="window.deleteVehicleDoc('${docSnap.id}')" style="background:#d32f2f; font-size:0.9rem; padding:5px 10px;">Delete</button>
                </div>
            `;
        });
    } catch (err) {
        window.showModal("Error searching vehicle data.");
    }
});


// --- Save or Update Single Vehicle Registry Logic ---
document.getElementById('saveBtn')?.addEventListener('click', async () => {
    const vNum = document.getElementById('vNum').value.trim().toUpperCase();
    const fNum = document.getElementById('fNum').value.trim();
    const mNum = document.getElementById('mNum').value.trim();
    const vType = document.getElementById('vType').value;

    if (!vNum || !fNum) return window.showModal("Vehicle number and Flat number are required.");

    try {
        // Check if this vehicle number already exists for this society
        const q = query(
            collection(db, "vehicles"), 
            where("vehicleNumber", "==", vNum), 
            where("societyName", "==", assignedSociety)
        );
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            // If it exists, update the first matching document instead of adding a new one
            const existingDocId = querySnapshot.docs[0].id;
            await setDoc(doc(db, "vehicles", existingDocId), {
                flatNumber: fNum,
                mobileNumber: mNum,
                vehicleType: vType,
                updatedAt: serverTimestamp()
            }, { merge: true });

            window.showModal("Vehicle details updated successfully!");
        } else {
            // Otherwise, create a new vehicle entry
            await addDoc(collection(db, "vehicles"), {
                vehicleNumber: vNum,
                flatNumber: fNum,
                mobileNumber: mNum,
                vehicleType: vType,
                societyName: assignedSociety,
                createdAt: serverTimestamp()
            });

            window.showModal("Vehicle saved to registry successfully!");
        }

        // Clear input fields
        document.getElementById('vNum').value = "";
        document.getElementById('fNum').value = "";
        document.getElementById('mNum').value = "";
    } catch (err) {
        window.showModal("Failed to save vehicle.");
        console.error(err);
    }
});

// --- Time Picker Generator Helper ---
function buildTimeDropdownHTML(idPrefix) {
    let hourOptions = '<option value="">HH</option>';
    for (let i = 1; i <= 12; i++) {
        let hStr = i < 10 ? '0' + i : i;
        hourOptions += `<option value="${hStr}">${hStr}</option>`;
    }

    let minOptions = '<option value="00">00</option><option value="15">15</option><option value="30">30</option><option value="45">45</option>';

    return `
        <div style="display: flex; gap: 5px; align-items: center; display: inline-flex;">
            <select id="${idPrefix}Hour" style="padding: 6px; border-radius: 6px; border: 1px solid #d7ccc8; background: #fff;">${hourOptions}</select>
            <span>:</span>
            <select id="${idPrefix}Min" style="padding: 6px; border-radius: 6px; border: 1px solid #d7ccc8; background: #fff;">${minOptions}</select>
            <select id="${idPrefix}AmPm" style="padding: 6px; border-radius: 6px; border: 1px solid #d7ccc8; background: #fff;">
                <option value="AM">AM</option>
                <option value="PM">PM</option>
            </select>
        </div>
    `;
}

// Helper to convert dropdown pickers into 24-hour HH:MM format for Firestore
function getSelectedTimeString(idPrefix) {
    const hh = document.getElementById(`${idPrefix}Hour`).value;
    const mm = document.getElementById(`${idPrefix}Min`).value;
    const ap = document.getElementById(`${idPrefix}AmPm`).value;

    if (!hh) return null;

    let hour24 = parseInt(hh, 10);
    if (ap === "PM" && hour24 < 12) hour24 += 12;
    if (ap === "AM" && hour24 === 12) hour24 = 0;

    const formattedHour24 = hour24 < 10 ? '0' + hour24 : hour24;
    return `${formattedHour24}:${mm}`;
}

// --- CSV Template Download Helper ---
document.getElementById('downloadTemplateBtn')?.addEventListener('click', () => {
    const csvContent = "VehicleNumber,FlatNumber,MobileNumber,VehicleType\nKA01AB1234,101,9876543210,2W\n";
    window.downloadCSV(csvContent, "vehicle_template.csv");
});



function getLocalDateString() { return new Date().toLocaleDateString('en-CA'); }

// --- Initialization Logic ---
document.addEventListener('DOMContentLoaded', () => {

// Master Admin: Change Active Society override with existence verification
document.getElementById('masterSaveSocietyBtn')?.addEventListener('click', async () => {
    const newSociety = document.getElementById('masterSocietyInput').value.trim();
    if (!newSociety) return window.showModal("Please enter a valid society name.");
    
    try {
        // Query the 'admins' collection to check if the target society exists
        const q = query(collection(db, "admins"), where("society", "==", newSociety));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return window.showModal(`Society "${newSociety}" does not exist in the system.`);
        }

        assignedSociety = newSociety;
        window.showModal(`Active society switched to: ${assignedSociety}`);
        
        // Refresh relevant data views for the new society
        if (typeof loadNoticeData === 'function') loadNoticeData();
        if (typeof loadFacilitiesDropdown === 'function') loadFacilitiesDropdown();
        if (typeof loadActiveBookings === 'function') loadActiveBookings();

        // Render linked data summary below the control section
        let resultsContainer = document.getElementById('master-society-data');
        if (!resultsContainer) {
            resultsContainer = document.createElement('div');
            resultsContainer.id = 'master-society-data';
            resultsContainer.style.cssText = "margin-top: 15px; text-align: left; font-size: 0.9rem; background: #fff; padding: 10px; border-radius: 6px; border: 1px solid #d32f2f;";
            document.getElementById('master-admin-panel').appendChild(resultsContainer);
        }

        resultsContainer.innerHTML = `<b>Linked Data for ${assignedSociety}:</b><br>Found ${querySnapshot.size} admin profile(s) linked to this society.`;

    } catch (err) {
        console.error("Error verifying society existence:", err);
        window.showModal("Failed to verify society name.");
    }
});

document.getElementById('masterSavePhoneBtn')?.addEventListener('click', async () => {
    const newPhone = document.getElementById('masterPhoneInput').value.trim();
    if (!newPhone) return window.showModal("Please enter a valid phone number.");
    
    try {
        // Correct path pointing to your existing 'configs' collection and 'owlwatcher' document
        await setDoc(doc(db, "configs", "owlwatcher"), {
            teamPhone: newPhone
        }, { merge: true });

        teamPhone = newPhone;
        window.showModal(`Team WhatsApp phone updated and saved to database: ${teamPhone}`);
    } catch (err) {
        console.error("Error saving team phone:", err);
        window.showModal("Failed to save phone number.");
    }
});
    
    // --- Booking Date Boundary Setup ---
function setupBookingDateLimits() {
    const dateInput = document.getElementById('bookingDate');
    if (!dateInput) return;

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Calculate date exactly 6 months from today
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 6);
    const maxDateStr = maxDate.toISOString().split('T')[0];

    dateInput.min = todayStr;
    dateInput.max = maxDateStr;
}

// Ensure this is called inside your DOMContentLoaded listener:
// setupBookingDateLimits();

    // Add this inside your DOMContentLoaded block, near your other event listeners
document.getElementById('saveAllFacilityNamesBtn')?.addEventListener('click', saveAllFacilityNames);


const timeContainer = document.getElementById('bookingTimeContainer');
    if (timeContainer) {
        timeContainer.innerHTML = `
            <div style="margin-bottom: 10px;">
                <label style="display: block; font-size: 0.9rem; margin-bottom: 3px;">Start Time:</label>
                ${buildTimeDropdownHTML('start')}
            </div>
            <div>
                <label style="display: block; font-size: 0.9rem; margin-bottom: 3px;">End Time:</label>
                ${buildTimeDropdownHTML('end')}
            </div>
        `;
    }

    
    // 1. Auth & Session Persistence
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const adminDoc = await getDoc(doc(db, "admins", user.email));
            if (adminDoc.exists()) {
                const adminData = adminDoc.data();
                assignedSociety = adminData.society || "";
                isMasterAdminUser = adminData.isMaster || false;

                document.getElementById('login-section').style.display = 'none';
                document.getElementById('search-section').style.display = 'block';
                document.getElementById('data-section').style.display = 'block';

              if (isMasterAdminUser) {
    const bulkSection = document.getElementById('bulk-section');
    if (bulkSection) bulkSection.style.display = 'block';

    // Show Master Admin Panel and pre-fill existing values
    const masterPanel = document.getElementById('master-admin-panel');
    if (masterPanel) {
        masterPanel.style.display = 'block';
        document.getElementById('masterSocietyInput').value = assignedSociety;
        document.getElementById('masterPhoneInput').value = teamPhone;
    }
}
                
                
                // Setup UI based on role
                if (isMasterAdminUser) {
                    const bulkSection = document.getElementById('bulk-section');
                    if (bulkSection) bulkSection.style.display = 'block';
                }

              loadNoticeData();
loadFacilitiesDropdown();
await cleanupOldBookings(); // Automatically deletes bookings older than 7 days
loadActiveBookings();      // Loads the refreshed active list
                
            } else {
                window.showModal("Unauthorized access.");
                signOut(auth);
            }
        } else {
            document.getElementById('login-section').style.display = 'block';
            document.getElementById('search-section').style.display = 'none';
            document.getElementById('data-section').style.display = 'none';
        }
    });

  // 2. Login/Logout
document.getElementById('loginBtn')?.addEventListener('click', async () => {
    const email = document.getElementById('email').value.trim();
    const pass = document.getElementById('pass').value.trim();
    try { 
        await signInWithEmailAndPassword(auth, email, pass); 
    } catch (e) { 
        // Improved user-friendly messaging
        let userMsg = "Login failed. Please check your credentials.";
        if (e.code === 'auth/invalid-email') userMsg = "The email address is invalid.";
        if (e.code === 'auth/invalid-credential') userMsg = "Invalid email or password.";
        
        window.showModal(userMsg); 
    }
});

    document.getElementById('logoutBtn')?.addEventListener('click', () => signOut(auth));

    // 3. Notice Board Management
    document.getElementById('postNoticeBtn')?.addEventListener('click', async () => {
        await setDoc(doc(db, "notices", assignedSociety), {
            todayMessage: document.getElementById('todayMsg').value,
            tomorrowMessage: document.getElementById('tomorrowMsg').value,
            date: getLocalDateString(),
            updatedAt: serverTimestamp()
        }, { merge: true });
        window.showModal("Notices updated successfully!");
    });

    document.getElementById('deleteNoticeBtn')?.addEventListener('click', async () => {
        await deleteDoc(doc(db, "notices", assignedSociety));
        document.getElementById('todayMsg').value = "";
        document.getElementById('tomorrowMsg').value = "";
        window.showModal("Notice deleted.");
    });

// --- 4. Facility Management (F1-F5 Mapping) ---
window.updateFacilityName = async (fId) => {
    const newName = document.getElementById(`name_${fId}`).value.trim();
    if (!newName) return window.showModal("Please enter a name.");
    
    await setDoc(doc(db, "facilities", assignedSociety), { [fId]: newName }, { merge: true });
    window.showModal(`${fId} updated to ${newName}`);
    loadFacilitiesDropdown(); 
}; 

async function saveAllFacilityNames() {
    const data = {
        F1: document.getElementById('name_F1').value,
        F2: document.getElementById('name_F2').value,
        F3: document.getElementById('name_F3').value,
        F4: document.getElementById('name_F4').value,
        F5: document.getElementById('name_F5').value
    };
    
    await setDoc(doc(db, "facilities", assignedSociety), data, { merge: true });
    window.showModal("Facility names updated!");
    loadFacilitiesDropdown(); 
}

    
// --- Updated Dropdown Logic ---
async function loadFacilitiesDropdown() {
    if (!assignedSociety) return;
    const fDoc = await getDoc(doc(db, "facilities", assignedSociety));
    const data = fDoc.exists() ? fDoc.data() : {};
    const select = document.getElementById('facilitySelect');
    
    // Populate F1-F5 based on mapping
    select.innerHTML = "";
    ['F1', 'F2', 'F3', 'F4', 'F5'].forEach(fId => {
        const displayName = data[fId] || `Not Assigned (${fId})`;
        select.innerHTML += `<option value="${fId}">${fId}: ${displayName}</option>`;
        
        // If you have inputs for F1-F5 in your HTML
        const input = document.getElementById(`name_${fId}`);
        if (input) input.value = data[fId] || "";
    });
}

// --- 5. Booking & Deletion ---
// --- 5. Booking & Deletion ---

// Function to fetch and display existing bookings
async function loadActiveBookings() {
    if (!assignedSociety) return;
    const listContainer = document.getElementById('active-bookings-list');
    if (!listContainer) return;

    listContainer.innerHTML = "<p style='font-size: 0.9rem;'>Loading bookings...</p>";

    try {
        // Fetch facility name mappings first
        const fDoc = await getDoc(doc(db, "facilities", assignedSociety));
        const facilityNames = fDoc.exists() ? fDoc.data() : {};

        // Query bookings for this society
        const q = query(collection(db, "bookings"), where("society", "==", assignedSociety));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            listContainer.innerHTML = "<p style='font-size: 0.9rem; color: #777;'>No active bookings found.</p>";
            return;
        }

        listContainer.innerHTML = "<h4>Active Bookings:</h4>";
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const facilityName = facilityNames[data.facilityId] || data.facilityId;
            
            // Format start and end strings nicely for display
            const startTimeFormatted = data.start ? data.start.replace('T', ' ') : '';
            const endTimeFormatted = data.end ? data.end.split('T')[1] : '';

            listContainer.innerHTML += `
                <div style="background:#f4ece0; padding:10px; margin-top:8px; border-radius:8px; font-size: 0.95rem; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <b>${facilityName}</b><br>
                        <span style="font-size: 0.85rem; color: #555;">${startTimeFormatted} to ${endTimeFormatted}</span>
                    </div>
                    <button onclick="window.deleteBooking('${docSnap.id}')" style="background:#d32f2f; font-size:0.8rem; padding:5px 10px; margin:0;">Delete</button>
                </div>
            `;
        });
    } catch (err) {
        listContainer.innerHTML = "<p style='font-size: 0.9rem; color: red;'>Error loading bookings.</p>";
        console.error(err);
    }
}
    
// --- Updated Booking Handler with date verification ---
document.getElementById('bookFacilityBtn')?.addEventListener('click', async () => {
    const fId = document.getElementById('facilitySelect').value;
    const dateInput = document.getElementById('bookingDate');
    const date = dateInput.value; 
    
    const startT = getSelectedTimeString('start'); 
    const endT = getSelectedTimeString('end');     

    if (!date || !startT || !endT) return window.showModal("Please select a date and valid start/end times.");

    // Validate date: prevent past dates or dates > 6 months out
    const todayStr = new Date().toISOString().split('T')[0];
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 6);
    const maxDateStr = maxDate.toISOString().split('T')[0];

    if (date < todayStr || date > maxDateStr) {
        return window.showModal("Bookings are only allowed from today up to 6 months in advance.");
    }

    try {
        await addDoc(collection(db, "bookings"), { 
            society: assignedSociety, 
            facilityId: fId, 
            start: `${date}T${startT}:00`, 
            end: `${date}T${endT}:00`       
        });
        window.showModal("Booking created successfully!");
        loadActiveBookings(); 
    } catch (err) {
        window.showModal("Failed to create booking.");
    }
});

    

// Function to Delete Bookings
window.deleteBooking = async (bookingDocId) => {
    try {
        await deleteDoc(doc(db, "bookings", bookingDocId));
        window.showModal("Booking deleted.");
        loadActiveBookings(); // Refresh the list immediately after deletion
    } catch (err) {
        window.showModal("Failed to delete booking.");
    }
};

// --- Auto-Delete Expired Bookings (Older than 7 days) ---
async function cleanupOldBookings() {
    if (!assignedSociety) return;

    try {
        // Calculate the date 7 days ago in YYYY-MM-DD format
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 7);
        const cutoffString = cutoffDate.toISOString().split('T')[0]; // e.g., "2026-07-13"

        // Query bookings for this society
        const q = query(collection(db, "bookings"), where("society", "==", assignedSociety));
        const querySnapshot = await getDocs(q);

        const batch = writeBatch(db);
        let deleteCount = 0;

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            // Assuming data.start is stored as "YYYY-MM-DDTHH:MM:SS"
            if (data.start) {
                const bookingDatePart = data.start.split('T')[0];
                
                // If the booking date is strictly older than the 7-day cutoff window
                if (bookingDatePart < cutoffString) {
                    batch.delete(doc(db, "bookings", docSnap.id));
                    deleteCount++;
                }
            }
        });

        // Commit batch deletion if any expired bookings were found
        if (deleteCount > 0) {
            await batch.commit();
            console.log(`Cleaned up ${deleteCount} expired booking(s) older than 7 days.`);
        }
    } catch (err) {
        console.error("Failed to clean up old bookings:", err);
    }
}

    
    // 5. Bulk Management
    document.getElementById('importBtn')?.addEventListener('click', () => {
        const file = document.getElementById('excelInput').files[0];
        if (!file) return window.showModal("Select CSV.");
        const reader = new FileReader();
        reader.onload = async (e) => {
            const rows = e.target.result.split('\n').slice(1);
            const batch = writeBatch(db);
            for (const row of rows) {
                const c = row.split(',');
                if (c.length >= 2) {
                    batch.set(doc(collection(db, "vehicles")), { 
                        vehicleNumber: c[0].trim().toUpperCase(), 
                        flatNumber: c[1].trim(), 
                        societyName: assignedSociety 
                    });
                }
            }
            await batch.commit();
            window.showModal("Import complete.");
        };
        reader.readAsText(file);
    });

    // 6. Ad Approval
    document.getElementById('approveAdBtn')?.addEventListener('click', async () => {
        const adKey = document.getElementById('adApprovalKey').value.trim().toUpperCase();
        await updateDoc(doc(db, "ads", adKey), { societyApproved: true });
        window.showModal("Ad Approved!");
        window.open(`https://wa.me/${teamPhone}?text=Admin of ${assignedSociety} approved Ad: ${adKey}`);
    });
});

// --- Independent Helpers ---
async function loadNoticeData() {
    if (!assignedSociety) return;
    const docSnap = await getDoc(doc(db, "notices", assignedSociety));
    if (docSnap.exists()) {
        const data = docSnap.data();
        if (document.getElementById('todayMsg')) document.getElementById('todayMsg').value = data.todayMessage || "";
        if (document.getElementById('tomorrowMsg')) document.getElementById('tomorrowMsg').value = data.tomorrowMessage || "";
    }
}

