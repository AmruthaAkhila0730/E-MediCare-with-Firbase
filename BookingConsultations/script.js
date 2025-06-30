import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

import {
    getFirestore,
    writeBatch,
    doc,
    getDoc,
    setDoc,
    collection,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

const auth = window.firebaseAuth;
const db = window.firebaseDB;

// DOM Elements
const adminBookingDoctor = document.getElementById("admin-doctor");
const adminBookingDay = document.getElementById("admin-day");
const adminBookingTime = document.getElementById("admin-time");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const switchToRegister = document.getElementById("switch-to-register");
const switchToLogin = document.getElementById("switch-to-login");
const authTitle = document.getElementById("auth-title");
const authView = document.getElementById("auth-view");
const mainView = document.getElementById("main-view");
const currentUserName = document.getElementById("current-user-name");
const currentUserRole = document.getElementById("current-user-role");
const logoutBtn = document.getElementById("logout-btn");
const adminDashboard = document.getElementById("admin-dashboard");
const doctorDashboard = document.getElementById("doctor-dashboard");
const patientDashboard = document.getElementById("patient-dashboard");
const addAvailabilityBtn = document.getElementById("add-availability-btn");
const doctorAvailabilityList = document.getElementById("doctor-availability-list");
const bookingForm = document.getElementById("booking-form");
const bookingDoctor = document.getElementById("booking-doctor");
const bookingDay = document.getElementById("booking-day");
const bookingTime = document.getElementById("booking-time");
const adminDoctorForm = document.getElementById("admin-add-doctor-form");
const adminDoctorName = document.getElementById("admin-doctor-name");
const adminDoctorEmail = document.getElementById("admin-doctor-email");
const adminDoctorPassword = document.getElementById("admin-doctor-password");
const adminDoctorSpecialty = document.getElementById("doctor-specialty");
const doctorsList = document.getElementById("doctors-list");
const adminConsultationsList = document.getElementById("admin-consultations-list");

let currentUser = null;

function toggleElement(element, show) {
    element?.classList[show ? "remove" : "add"]("hidden");
}

switchToRegister?.addEventListener("click", (e) => {
    e.preventDefault();
    toggleElement(loginForm, false);
    toggleElement(registerForm, true);
    authTitle.textContent = "Register";
});

switchToLogin?.addEventListener("click", (e) => {
    e.preventDefault();
    toggleElement(registerForm, false);
    toggleElement(loginForm, true);
    authTitle.textContent = "Login";
});

registerForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("register-name").value;
    const email = document.getElementById("register-email").value;
    const password = document.getElementById("register-password").value;
    const role = document.getElementById("register-role").value;

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        await setDoc(doc(db, "users", userCredential.user.uid), {
            uid: userCredential.user.uid,
            name,
            email,
            role,
            availability: []
        });
    } catch (error) {
        alert(error.message);
    }
});

loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        alert(error.message);
    }
});

logoutBtn?.addEventListener("click", async () => {
    await signOut(auth);
});

onAuthStateChanged(auth, async (user) => {
    const authNavbar = document.getElementById("auth-navbar");

    if (user) {
        if (authNavbar) authNavbar.style.display = "none"; // 🔻 Hide navbar after login

        const userDoc = await getDoc(doc(db, "users", user.uid));
        currentUser = {
            uid: user.uid,
            ...userDoc.data()
        };

        currentUserName.textContent = currentUser.name;
        currentUserRole.textContent = currentUser.role;
        currentUserRole.className = `badge role-badge ${
            currentUser.role === 'admin' ? 'bg-danger' :
            currentUser.role === 'doctor' ? 'bg-primary' : 'bg-success'
        }`;

        toggleElement(authView, false);
        toggleElement(mainView, true);

        await renderDashboard(currentUser.role);

        if (currentUser.role === "doctor") {
            renderDoctorConsultations();
        }

        if (currentUser.role === "patient") {
            await renderPatientDashboard();
            await renderPatientConsultations();
        }

    } else {
        if (authNavbar) authNavbar.style.display = "block"; // Show navbar when not logged in

        toggleElement(authView, true);
        toggleElement(mainView, false);
        loginForm.reset();
        registerForm.reset();
        toggleElement(loginForm, true);
        toggleElement(registerForm, false);
        authTitle.textContent = "Login";
        currentUser = null;
    }
});

async function renderDashboard(role) {
    toggleElement(adminDashboard, role === "admin");
    toggleElement(doctorDashboard, role === "doctor");
    toggleElement(patientDashboard, role === "patient");
    if (role === "doctor") renderDoctorAvailability();
    if (role === "patient") await renderPatientDashboard();
    if (role === "admin") await renderAdminDashboard();
}


import { query, where } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

async function renderDoctorConsultations() {
    const container = document.getElementById("doctor-consultations-list");
    if (!container || !currentUser || currentUser.role !== "doctor") return;

    container.innerHTML = "<p class='text-muted'>Loading...</p>";

    try {
        const consultQuery = query(
            collection(db, "consultations"),
            where("doctorId", "==", currentUser.uid)
        );

        const consultSnap = await getDocs(consultQuery);
        const myConsultations = [];

        consultSnap.forEach(doc => {
            myConsultations.push({ id: doc.id, ...doc.data() });
        });

        container.innerHTML = "";

        if (myConsultations.length === 0) {
            container.innerHTML = "<p class='text-muted'>No consultations scheduled yet.</p>";
            return;
        }

        myConsultations.forEach(consult => {
            container.innerHTML += `
                <div class="card mb-2">
                    <div class="card-body">
                        <h5 class="card-title">Consultation With: ${consult.patientName || "Unknown"}</h5>
                        <p class="card-text">
                            <i class="bi bi-calendar-event"></i> ${consult.day}<br>
                            <i class="bi bi-clock"></i> ${consult.time}
                        </p>
                        <div class="text-end">
                            <span class="badge ${consult.status === "cancelled" ? "bg-secondary" : "bg-primary"}">
                                ${consult.status}
                            </span>
                            ${consult.status !== "cancelled"
                                ? `<button class="btn btn-sm btn-outline-danger cancel-doctor-consultation mt-2" data-id="${consult.id}">Cancel</button>`
                                : ""}
                        </div>
                    </div>
                </div>
            `;
        });

        // Register cancel listeners *after rendering*
        document.querySelectorAll(".cancel-doctor-consultation").forEach(btn => {
            btn.addEventListener("click", async () => {
                const id = btn.dataset.id;
                if (confirm("Cancel this consultation?")) {
                    try {
                        await updateDoc(doc(db, "consultations", id), { status: "cancelled" });
                        await renderDoctorConsultations(); // Refresh UI
                    } catch (err) {
                        console.error("Error cancelling consultation:", err.message);
                        alert("Failed to cancel consultation.");
                    }
                }
            });
        });

    } catch (error) {
        console.error("Error fetching consultations:", error);
        container.innerHTML = "<p class='text-danger'>Failed to load consultations.</p>";
    }
}



// Doctor availability rendering
function renderDoctorAvailability() {
    if (!doctorAvailabilityList || !currentUser) return;
    doctorAvailabilityList.innerHTML = "";

    currentUser.availability.forEach((availability, index) => {
        const container = document.createElement("div");
        container.className = "availability-day mb-3 p-3";
        container.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-2">
        <h6 class="mb-0">${availability.day}</h6>
        <button class="btn btn-sm btn-outline-danger remove-availability" data-index="${index}">
          <i class="bi bi-trash"></i>
        </button>
      </div>
      <div class="d-flex">
        <input type="time" class="form-control form-control-sm me-2 new-time" data-index="${index}" step="3600">
        <button class="btn btn-sm btn-outline-primary add-time" data-index="${index}">Add Time</button>
      </div>
      <div class="times-container mt-2">
        ${availability.times.map(time => `<span class="badge bg-light text-dark me-1">${time}</span>`).join("")}
      </div>
    `;
        doctorAvailabilityList.appendChild(container);
    });

    document.querySelectorAll(".remove-availability").forEach(btn => {
        btn.addEventListener("click", async () => {
            const index = parseInt(btn.dataset.index);
            currentUser.availability.splice(index, 1);
            await updateDoc(doc(db, "users", currentUser.uid), {
                availability: currentUser.availability
            });
            renderDoctorAvailability();
        });
    });

    document.querySelectorAll(".add-time").forEach(btn => {
        btn.addEventListener("click", async () => {
            const index = parseInt(btn.dataset.index);
            const input = document.querySelector(`.new-time[data-index='${index}']`);
            const time = input.value;
            if (!time) return;
            if (!currentUser.availability[index].times.includes(time)) {
                currentUser.availability[index].times.push(time);
                currentUser.availability[index].times.sort();
                await updateDoc(doc(db, "users", currentUser.uid), {
                    availability: currentUser.availability
                });
                renderDoctorAvailability();
            }
        });
    });
}

addAvailabilityBtn?.addEventListener("click", async () => {
    if (!currentUser || currentUser.role !== "doctor") return;

    const allDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const existingDays = currentUser.availability.map(a => a.day);
    const remainingDays = allDays.filter(day => !existingDays.includes(day));

    if (remainingDays.length === 0) {
        alert("All 7 days already added.");
        return;
    }

    const select = document.createElement("select");
    select.className = "form-select mb-2";
    select.innerHTML = `<option value="">Select a day</option>` +
        remainingDays.map(d => `<option value="${d}">${d}</option>`).join("");

    const confirmBtn = document.createElement("button");
    confirmBtn.className = "btn btn-sm btn-success mb-3";
    confirmBtn.textContent = "Add Selected Day";

    const container = document.createElement("div");
    container.appendChild(select);
    container.appendChild(confirmBtn);
    doctorAvailabilityList.prepend(container);

    confirmBtn.addEventListener("click", async () => {
        const selectedDay = select.value;
        if (!selectedDay) return alert("Please select a day");

        currentUser.availability.push({ day: selectedDay, times: [] });
        await updateDoc(doc(db, "users", currentUser.uid), {
            availability: currentUser.availability
        });

        renderDoctorAvailability();
    });
});

// Patient booking system

async function renderPatientDashboard() {
    bookingDoctor.innerHTML = '<option value="">Select a doctor</option>';

    const usersSnap = await getDocs(collection(db, "users"));
    usersSnap.forEach(docSnap => {
        const user = docSnap.data();
        if (user.role === "doctor") {
            bookingDoctor.innerHTML += `<option value="${user.uid}">${user.name} (${user.specialty || "N/A"})</option>`;
        }
    });
}

async function renderPatientConsultations() {
    bookingDoctor.innerHTML = '<option value="">Select a doctor</option>';

    const usersSnap = await getDocs(collection(db, "users"));
    usersSnap.forEach(docSnap => {
        const user = docSnap.data();
        if (user.role === "doctor") {
            bookingDoctor.innerHTML += `<option value="${user.uid}">${user.name} (${user.specialty || "N/A"})</option>`;
        }
    });

    const container = document.getElementById("patient-consultations-list");
    if (!container || !currentUser || currentUser.role !== "patient") return;

    container.innerHTML = "<p class='text-muted'>Loading consultations...</p>";

    try {
        const consultQuery = query(
            collection(db, "consultations"),
            where("patientId", "==", currentUser.uid)
        );
        const consultSnap = await getDocs(consultQuery);
        const consultations = [];

        consultSnap.forEach(docSnap => {
            consultations.push({ id: docSnap.id, ...docSnap.data() });
        });

        container.innerHTML = "";

        if (consultations.length === 0) {
            container.innerHTML = "<p class='text-muted'>No consultations booked yet.</p>";
            return;
        }

        consultations.forEach(c => {
            container.innerHTML += `
            <div class="card mb-2">
              <div class="card-body">
                <h5 class="card-title">Consultation with ${c.doctorName || "Doctor"}</h5>
                <p class="card-text">
                  <i class="bi bi-calendar-event"></i> ${c.day}<br>
                  <i class="bi bi-clock"></i> ${c.time}<br>
                  <span class="badge ${c.status === 'cancelled' ? 'bg-secondary' : 'bg-primary'}">${c.status}</span>
                </p>
                ${c.status !== "cancelled"
                    ? `<button class="btn btn-sm btn-outline-danger cancel-consultation" data-id="${c.id}">Cancel</button>`
                    : ""
                }
              </div>
            </div>
            `;
        });

        // Re-attach cancel listeners
        document.querySelectorAll(".cancel-consultation").forEach(btn => {
            btn.addEventListener("click", async () => {
                const id = btn.dataset.id;
                if (confirm("Cancel this consultation?")) {
                    try {
                        await updateDoc(doc(db, "consultations", id), { status: "cancelled" });
                        await renderPatientConsultations();
                        bookingDoctor.dispatchEvent(new Event("change"));
                    } catch (err) {
                        console.error("Error cancelling consultation:", err.message);
                        alert("Failed to cancel consultation.");
                    }
                }
            });
        });

    } catch (error) {
        console.error("Error loading patient consultations:", error.message);
        container.innerHTML = "<p class='text-danger'>Failed to load consultations.</p>";
    }
}

bookingDoctor?.addEventListener("change", async (e) => {
    const doctorId = e.target.value;
    bookingDay.innerHTML = '<option value="">Select a day</option>';
    bookingTime.innerHTML = '<option value="">Select a time</option>';
    bookingDay.disabled = true;
    bookingTime.disabled = true;

    if (!doctorId) return;

    const docRef = await getDoc(doc(db, "users", doctorId));
    const doctor = docRef.data();
    const availableDays = [...new Set(doctor.availability.map(a => a.day))];

    availableDays.forEach(day => {
        bookingDay.innerHTML += `<option value="${day}">${day}</option>`;
    });

    if (availableDays.length > 0) {
        bookingDay.disabled = false;
    }
});

bookingDay?.addEventListener("change", async (e) => {
    const doctorId = bookingDoctor.value;
    const selectedDay = e.target.value;

    bookingTime.innerHTML = '<option value="">Select a time</option>';
    bookingTime.disabled = true;

    if (!doctorId || !selectedDay) return;

    try {
        const docRef = await getDoc(doc(db, "users", doctorId));
        const doctor = docRef.data();
        const dayAvailability = doctor.availability.find(a => a.day === selectedDay);
        if (!dayAvailability) return;

        const consultQuery = query(
            collection(db, "consultations"),
            where("doctorId", "==", doctorId),
            where("day", "==", selectedDay)
        );
        const consultSnap = await getDocs(consultQuery);

        const booked = [];
        consultSnap.forEach(docSnap => {
            const data = docSnap.data();
            if (data.status !== "cancelled") {
                booked.push(data.time);
            }
        });

        const availableTimes = dayAvailability.times.filter(time => !booked.includes(time));

        if (availableTimes.length === 0) {
            bookingTime.innerHTML = '<option value="">No available slots for now</option>';
            bookingTime.disabled = true;
        } else {
            availableTimes.forEach(time => {
                bookingTime.innerHTML += `<option value="${time}">${time}</option>`;
            });
            bookingTime.disabled = false;
        }

    } catch (error) {
        console.error("Error loading available times:", error.message);
        bookingTime.innerHTML = '<option value="">Error loading times</option>';
        bookingTime.disabled = true;
    }
});

bookingForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const doctorId = bookingDoctor.value;
    const day = bookingDay.value;
    const time = bookingTime.value;

    if (!currentUser) {
        alert("User not authenticated. Please log in again.");
        return;
    }

    if (!doctorId || !day || !time) {
        alert("Please complete all fields.");
        return;
    }

    // Fetch doctor data
    let doctorName = "Doctor";
    try {
        const doctorDoc = await getDoc(doc(db, "users", doctorId));
        if (doctorDoc.exists()) {
            const doctor = doctorDoc.data();
            doctorName = doctor.name || "Doctor";
        }
    } catch (err) {
        console.warn("Couldn't fetch doctor info:", err.message);
    }

    const newBooking = {
        doctorId,
        doctorName,  // Now defined
        patientId: currentUser.uid,
        patientName: currentUser.name,
        day,
        time,
        status: "upcoming",
        timestamp: Date.now()
    };

    try {
        await addDoc(collection(db, "consultations"), newBooking);
        alert("Consultation booked successfully!");
        bookingForm.reset();
        bookingDay.innerHTML = '<option value="">Select a day</option>';
        bookingTime.innerHTML = '<option value="">Select a time</option>';
        bookingDay.disabled = true;
        bookingTime.disabled = true;

        await renderPatientConsultations(); // refresh
    } catch (error) {
        console.error("Booking failed:", error.message);
        alert("Failed to book consultation.");
    }
});

// Admin dashboard logic
adminDoctorForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = adminDoctorName.value.trim();
    const email = adminDoctorEmail.value.trim();
    const password = adminDoctorPassword.value.trim();
    const specialty = adminDoctorSpecialty.value;
    if (!name || !email || !password) return alert("All fields are required");

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const doctorId = userCredential.user.uid;
        await updateProfile(userCredential.user, { displayName: name });
        await setDoc(doc(db, "users", doctorId), {
            uid: doctorId,
            name,
            email,
            role: "doctor",
            specialty,
            availability: []
        });
        alert("Doctor added successfully. Please log out and re-login as admin if you were logged out.");
        adminDoctorForm.reset();
        await signOut(auth);
    } catch (error) {
        alert(error.message);
    }
});

async function renderAdminDashboard() {
    doctorsList.innerHTML = "";
    adminConsultationsList.innerHTML = "";

    const usersSnap = await getDocs(collection(db, "users"));
    const consultSnap = await getDocs(collection(db, "consultations"));

    const doctors = [], users = {};
    usersSnap.forEach(docSnap => {
        const user = docSnap.data();
        users[user.uid] = user;
        if (user.role === "doctor") doctors.push(user);
    });

    // Populate doctor cards
    doctors.forEach(doctor => {
        doctorsList.innerHTML += `
      <div class="col-md-4 mb-3">
        <div class="card consultation-card h-100 doctor-card">
          <button class="btn btn-sm btn-danger remove-doctor-btn" data-id="${doctor.uid}">
            <i class="bi bi-trash"></i>
          </button>
          <div class="card-body">
            <h5 class="card-title">${doctor.name}</h5>
            <p class="card-text text-muted">${doctor.email}</p>
            <p class="card-text"><strong>Specialty:</strong> ${doctor.specialty}</p>
            <p class="card-text"><small>Availability: ${doctor.availability?.length || 0} days</small></p>
          </div>
        </div>
      </div>
    `;
    });

    const adminBookingDoctor = document.getElementById("admin-doctor");
    if (adminBookingDoctor) {
        adminBookingDoctor.innerHTML = `<option value="">Select a doctor</option>`;
        doctors.forEach(doctor => {
            adminBookingDoctor.innerHTML += `<option value="${doctor.uid}">${doctor.name} (${doctor.specialty})</option>`;
        });
    }

    // Handle doctor removal
    document.querySelectorAll(".remove-doctor-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
            const doctorId = btn.dataset.id;

            if (!doctorId) return;

            if (confirm("Remove this doctor and all related consultations?")) {
                try {
                    // First delete all consultations related to this doctor
                    const consultQuery = query(
                        collection(db, "consultations"),
                        where("doctorId", "==", doctorId)
                    );
                    const consultSnap = await getDocs(consultQuery);

                    const batch = writeBatch(db);
                    consultSnap.forEach(docSnap => {
                        batch.delete(doc(db, "consultations", docSnap.id));
                    });
                    await batch.commit();

                    // Then delete the doctor
                    await deleteDoc(doc(db, "users", doctorId));

                    alert("Doctor and related consultations removed successfully.");
                    await renderAdminDashboard(); // Refresh the admin view
                } catch (err) {
                    console.error("Error removing doctor:", err.message);
                    alert("Failed to remove doctor. Please try again.");
                }
            }
        });
    });


    // Populate consultation list
    consultSnap.forEach(consult => {
        const data = consult.data();
        const doctor = users[data.doctorId];
        const patient = users[data.patientId];
        adminConsultationsList.innerHTML += `
            <div class="card consultation-card mb-3">
                <div class="card-body">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                    <h5 class="card-title">${doctor?.name || "Doctor"} with ${patient?.name || data.patientName}</h5>
                    <p class="card-text text-muted">
                        <i class="bi bi-calendar-event me-1"></i>${data.day} 
                        <i class="bi bi-clock ms-2 me-1"></i>${data.time}
                    </p>
                    </div>
                    <div>
                    <span class="badge ${data.status === 'cancelled' ? 'bg-secondary' : 'bg-primary'} me-2">${data.status}</span>
                    ${data.status !== "cancelled"
                ? `<button class="btn btn-sm btn-outline-danger cancel-consultation" data-id="${consult.id}">Cancel</button>`
                : ""
            }
                    </div>
                </div>
                </div>
            </div>
            `;
    });

    // Handle consultation cancellation
    document.querySelectorAll(".cancel-consultation").forEach(btn => {
        btn.addEventListener("click", async () => {
            const id = btn.dataset.id;
            if (confirm("Cancel this consultation?")) {
                try {
                    await updateDoc(doc(db, "consultations", id), { status: "cancelled" });
                    await renderAdminDashboard(); // refresh UI
                    adminBookingDoctor?.dispatchEvent(new Event("change")); // ✅ refresh admin form
                } catch (err) {
                    console.error("Error cancelling consultation:", err.message);
                    alert("Failed to cancel consultation.");
                }
            }
        });
    });

}

adminBookingDoctor?.addEventListener("change", async () => {
    const doctorId = adminBookingDoctor.value;

    adminBookingDay.innerHTML = '<option value="">Select a day</option>';
    adminBookingTime.innerHTML = '<option value="">Select a time</option>';
    adminBookingDay.disabled = true;
    adminBookingTime.disabled = true;

    if (!doctorId) return;

    const docRef = await getDoc(doc(db, "users", doctorId));
    const doctor = docRef.data();

    const days = [...new Set(doctor.availability.map(a => a.day))];
    days.forEach(day => {
        adminBookingDay.innerHTML += `<option value="${day}">${day}</option>`;
    });

    if (days.length > 0) {
        adminBookingDay.disabled = false;
    }
});

adminBookingDay?.addEventListener("change", async () => {
    const doctorId = adminBookingDoctor.value;
    const selectedDay = adminBookingDay.value;

    adminBookingTime.innerHTML = '<option value="">Select a time</option>';
    adminBookingTime.disabled = true;

    if (!doctorId || !selectedDay) return;

    try {
        const docRef = await getDoc(doc(db, "users", doctorId));
        const doctor = docRef.data();
        const availability = doctor.availability.find(a => a.day === selectedDay);
        if (!availability) return;

        const consultSnap = await getDocs(collection(db, "consultations"));
        const booked = [];

        consultSnap.forEach(docSnap => {
            const data = docSnap.data();
            if (
                data.doctorId === doctorId &&
                data.day === selectedDay &&
                data.status !== "cancelled"
            ) {
                booked.push(data.time);
            }
        });

        const availableTimes = availability.times.filter(time => !booked.includes(time));

        if (availableTimes.length === 0) {
            adminBookingTime.innerHTML = '<option value="">No available slots for now</option>';
            adminBookingTime.disabled = true;
        } else {
            availableTimes.forEach(time => {
                adminBookingTime.innerHTML += `<option value="${time}">${time}</option>`;
            });
            adminBookingTime.disabled = false;
        }

    } catch (error) {
        console.error("Error loading admin available times:", error.message);
        adminBookingTime.innerHTML = '<option value="">Error loading times</option>';
        adminBookingTime.disabled = true;
    }
});

const adminBookingForm = document.getElementById("admin-booking-form");

adminBookingForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const patientName = document.getElementById("admin-patient-name").value.trim();
    const doctorId = adminBookingDoctor.value;
    const day = adminBookingDay.value;
    const time = adminBookingTime.value;

    if (!patientName || !doctorId || !day || !time) {
        alert("Please fill in all fields.");
        return;
    }

    try {

        let doctorName = "Doctor";
        const doctorSnap = await getDoc(doc(db, "users", doctorId));
        if (doctorSnap.exists()) {
            const docData = doctorSnap.data();
            doctorName = docData.name || "Doctor";
        }

        const newConsultation = {
            doctorId,
            doctorName,
            patientId: "admin-booked",
            patientName,
            day,
            time,
            status: "upcoming",
            timestamp: Date.now()
        };

        await addDoc(collection(db, "consultations"), newConsultation);

        alert("Consultation booked successfully!");
        adminBookingForm.reset();
        adminBookingDay.innerHTML = '<option value="">Select a day</option>';
        adminBookingTime.innerHTML = '<option value="">Select a time</option>';
        adminBookingDay.disabled = true;
        adminBookingTime.disabled = true;
        await renderAdminDashboard(); // refresh list
    } catch (error) {
        console.error("Booking error:", error);
        alert("Failed to book consultation.");
    }
});



