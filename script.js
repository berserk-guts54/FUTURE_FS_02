
const API_URL = "http://localhost:5000/api";

const loginScreen = document.querySelector("#loginScreen");
const loginForm = document.querySelector("#loginForm");
const loginError = document.querySelector("#loginError");
const loginButton = document.querySelector("#loginButton");
const appContainer = document.querySelector("#appContainer");
const logoutButton = document.querySelector("#logoutButton");

const leadForm = document.querySelector("#leadForm");
const leadsTable = document.querySelector("#leadsTable");

const totalLeads = document.querySelector("#totalLeads");
const newLeads = document.querySelector("#newLeads");
const contactedLeads = document.querySelector("#contactedLeads");
const convertedLeads = document.querySelector("#convertedLeads");

const searchInput = document.querySelector("#searchInput");
const leadDetails = document.querySelector("#leadDetails");
const closeDetails = document.querySelector("#closeDetails");

const notesForm = document.querySelector("#notesForm");
const leadSelect = document.querySelector("#leadSelect");
const savedNotes = document.querySelector("#savedNotes");

let leads = [];
let notes = [];
let token = sessionStorage.getItem("crmToken");

function showLogin() {
    token = null;
    sessionStorage.removeItem("crmToken");
    appContainer.hidden = true;
    loginScreen.hidden = false;
    loginForm.reset();
    loginError.textContent = "";
}

function showDashboard() {
    loginScreen.hidden = true;
    appContainer.hidden = false;
}

async function apiRequest(endpoint, options = {}) {
    const headers = {
        "Content-Type": "application/json",
        ...options.headers
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers
    });

    const data = await response.json().catch(() => ({}));

    if (response.status === 401 && endpoint !== "/auth/login") {
        showLogin();
        throw new Error("Your session expired. Please log in again.");
    }

    if (!response.ok) {
        throw new Error(data.message || `Request failed: ${response.status}`);
    }

    return data;
}

// Admin login
loginForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    loginError.textContent = "";
    loginButton.disabled = true;
    loginButton.textContent = "Logging in...";

    const email = document.querySelector("#adminEmail").value.trim();
    const password = document.querySelector("#adminPassword").value;

    try {
        // Login endpoint is public; no token is needed here.
        const response = await fetch(`${API_URL}/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.message || "Login failed");
        }

        token = data.token;
        sessionStorage.setItem("crmToken", token);

        showDashboard();
        await loadCRM();
    } catch (error) {
        token = null;
        sessionStorage.removeItem("crmToken");
        loginError.textContent =
            error.message === "Failed to fetch"
                ? "Cannot connect to the server. Check that the backend is running."
                : error.message;
    } finally {
        loginButton.disabled = false;
        loginButton.textContent = "Login";
    }
});

// Logout
logoutButton.addEventListener("click", function() {
    showLogin();
    leads = [];
    notes = [];
    renderLeads();
    renderSavedNotes();
});

// Format status for display
function displayStatus(status) {
    const statuses = {
        new: "New",
        contacted: "Contacted",
        converted: "Converted"
    };

    return statuses[status] || "New";
}

function makeCell(value) {
    const cell = document.createElement("td");
    cell.textContent = value ?? "";
    return cell;
}

// Render leads from MySQL
function renderLeads() {
    leadsTable.replaceChildren();

    leads.forEach(function(lead) {
        const row = document.createElement("tr");
        row.dataset.leadId = String(lead.id);

        row.append(
            makeCell(lead.name),
            makeCell(lead.email),
            makeCell(lead.phone),
            makeCell(lead.enquiry || lead.source || "Website")
        );

        const statusCell = document.createElement("td");
        const statusSelect = document.createElement("select");
        statusSelect.className = "status";
        statusSelect.setAttribute(
            "aria-label",
            `${lead.name} lead status`
        );

        ["new", "contacted", "converted"].forEach(function(status) {
            const option = document.createElement("option");
            option.value = displayStatus(status);
            option.textContent = displayStatus(status);
            statusSelect.appendChild(option);
        });

        statusSelect.value = displayStatus(lead.status);
        statusCell.appendChild(statusSelect);
        row.appendChild(statusCell);

        const actions = document.createElement("td");

        const viewButton = document.createElement("button");
        viewButton.type = "button";
        viewButton.className = "viewBtn";
        viewButton.textContent = "View";

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "deleteBtn";
        deleteButton.textContent = "Delete";

        actions.append(viewButton, deleteButton);
        row.appendChild(actions);
        leadsTable.appendChild(row);
    });

    updateDashboard();
    updateLeadOptions();
    filterLeads();
}

function updateDashboard() {
    totalLeads.textContent = leads.length;
    newLeads.textContent =
        leads.filter(lead => lead.status === "new").length;
    contactedLeads.textContent =
        leads.filter(lead => lead.status === "contacted").length;
    convertedLeads.textContent =
        leads.filter(lead => lead.status === "converted").length;
}

function updateLeadOptions() {
    const previousSelection = leadSelect.value;
    leadSelect.replaceChildren();

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Choose a customer";
    leadSelect.appendChild(placeholder);

    leads.forEach(function(lead) {
        const option = document.createElement("option");
        option.value = String(lead.id);
        option.textContent = lead.name;
        leadSelect.appendChild(option);
    });

    if (leads.some(lead => String(lead.id) === previousSelection)) {
        leadSelect.value = previousSelection;
    }
}

function filterLeads() {
    const query = searchInput.value.toLowerCase().trim();

    leadsTable.querySelectorAll("tr").forEach(function(row) {
        row.style.display = row.textContent.toLowerCase().includes(query)
            ? ""
            : "none";
    });
}

searchInput.addEventListener("input", filterLeads);

// Load persistent data
async function loadCRM() {
    try {
        const [loadedLeads, loadedNotes] = await Promise.all([
            apiRequest("/leads"),
            apiRequest("/notes")
        ]);

        leads = loadedLeads;
        notes = loadedNotes;
        renderLeads();
        renderSavedNotes();
    } catch (error) {
        console.error("Could not load CRM:", error);
        alert(`Could not load CRM: ${error.message}`);
    }
}

// Add a lead
leadForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const name = document.querySelector("#name").value.trim();
    const email = document.querySelector("#email").value.trim();
    const phone = document.querySelector("#phone").value.trim();
    const enquiry = document.querySelector("#enquiry").value.trim();

    if (!name || !email || !phone || !enquiry) {
        alert("Please fill in all fields.");
        return;
    }

    try {
        const lead = await apiRequest("/leads", {
            method: "POST",
            body: JSON.stringify({
                name,
                email,
                phone,
                enquiry,
                source: "Website"
            })
        });

        leads.unshift(lead);
        renderLeads();
        leadForm.reset();
        alert("Lead saved successfully!");
    } catch (error) {
        console.error("Lead save failed:", error);
        alert(`Could not save lead: ${error.message}`);
    }
});

// Update lead status
leadsTable.addEventListener("change", async function(event) {
    if (!event.target.classList.contains("status")) return;

    const row = event.target.closest("tr");
    const id = row.dataset.leadId;
    const lead = leads.find(item => String(item.id) === id);

    if (!lead) return;

    const previousStatus = lead.status;
    const newStatus = event.target.value.toLowerCase();

    try {
        await apiRequest(`/leads/${id}/status`, {
            method: "PATCH",
            body: JSON.stringify({ status: newStatus })
        });

        lead.status = newStatus;
        updateDashboard();
    } catch (error) {
        event.target.value = displayStatus(previousStatus);
        alert(`Could not update status: ${error.message}`);
    }
});

// View or delete a lead
leadsTable.addEventListener("click", async function(event) {
    const row = event.target.closest("tr");
    if (!row) return;

    const id = row.dataset.leadId;
    const lead = leads.find(item => String(item.id) === id);
    if (!lead) return;

    if (event.target.classList.contains("viewBtn")) {
        document.querySelector("#detailName").textContent = lead.name;
        document.querySelector("#detailEmail").textContent = lead.email;
        document.querySelector("#detailPhone").textContent = lead.phone || "";
        document.querySelector("#detailEnquiry").textContent =
            lead.enquiry || lead.source || "";
        document.querySelector("#detailStatus").textContent =
            `Status: ${displayStatus(lead.status)}`;

        leadDetails.style.display = "block";
        leadDetails.scrollIntoView({ behavior: "smooth" });
    }

    if (event.target.classList.contains("deleteBtn")) {
        if (!confirm(`Delete ${lead.name}?`)) return;

        try {
            await apiRequest(`/leads/${id}`, { method: "DELETE" });

            leads = leads.filter(item => String(item.id) !== id);
            notes = notes.filter(item => String(item.lead_id) !== id);

            renderLeads();
            renderSavedNotes();
            leadDetails.style.display = "none";
        } catch (error) {
            alert(`Could not delete lead: ${error.message}`);
        }
    }
});

closeDetails.addEventListener("click", function() {
    leadDetails.style.display = "none";
});

// Render saved follow-up notes
function renderSavedNotes() {
    savedNotes.replaceChildren();

    if (notes.length === 0) {
        const empty = document.createElement("p");
        empty.textContent = "No notes added yet.";
        savedNotes.appendChild(empty);
        return;
    }

    notes.forEach(function(note) {
        const item = document.createElement("div");
        item.className = "note-item";

        const heading = document.createElement("h4");
        heading.textContent = note.lead_name || "Lead";

        const paragraph = document.createElement("p");
        paragraph.textContent = note.note;

        item.append(heading, paragraph);

        if (note.follow_up_date) {
            const date = document.createElement("small");
            date.textContent =
                `Follow-up: ${String(note.follow_up_date).slice(0, 10)}`;
            item.appendChild(date);
        }

        savedNotes.appendChild(item);
    });
}

// Save follow-up notes
notesForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const leadId = leadSelect.value;
    const noteText = document.querySelector("#notes").value.trim();

    if (!leadId) {
        alert("Please select a customer.");
        return;
    }

    if (!noteText) {
        alert("Please enter a follow-up note.");
        return;
    }

    try {
        const note = await apiRequest("/notes", {
            method: "POST",
            body: JSON.stringify({
                lead_id: Number(leadId),
                note: noteText
            })
        });

        notes.unshift(note);
        renderSavedNotes();
        notesForm.reset();
        alert("Follow-up note saved!");
    } catch (error) {
        alert(`Could not save note: ${error.message}`);
    }
});

// Restore a valid session, otherwise show login
if (token) {
    showDashboard();
    loadCRM();
} else {
    showLogin();
}
