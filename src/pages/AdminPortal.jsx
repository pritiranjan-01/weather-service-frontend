import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/admin.css";

const WEATHER_OPTIONS = [
  "RAINY",
  "sunny",
  "cloudy",
  "MEDIUM",
  "HOT",
  "COLD",
  "SNOWY",
  "STORM",
  "SMOG",
];

async function parseResponse(response) {
  try {
    const data = await response.json();
    if (
      Object.prototype.hasOwnProperty.call(data, "statusCode") &&
      Object.prototype.hasOwnProperty.call(data, "status")
    ) {
      if (data.status === false) {
        return {
          success: false,
          message: data.payload || "Operation Failed",
          payload: null,
        };
      }
      return {
        success: true,
        message:
          typeof data.payload === "string"
            ? data.payload
            : data.type || "Success",
        payload: data.payload,
      };
    }
    return {
      success: response.ok,
      message: response.statusText,
      payload: data,
    };
  } catch (error) {
    return {
      success: false,
      message: "Invalid JSON response",
      payload: null,
    };
  }
}

export default function AdminPortal() {
  const apiBase = import.meta.env.VITE_API_BASE_URL;
  const navigate = useNavigate();

  const [theme, setTheme] = useState("light");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");

  const [stats, setStats] = useState({
    active: "-",
    inactive: "-",
    local: "-",
    global: "15",
  });

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [weatherRows, setWeatherRows] = useState([]);
  const [weatherMessage, setWeatherMessage] = useState(
    "Loading reports...",
  );
  const [searchId, setSearchId] = useState("");
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [weatherForm, setWeatherForm] = useState({
    id: "",
    city: "",
    temp: "",
    condition: "RAINY",
  });

  const [clientFilterStatus, setClientFilterStatus] =
    useState("true");
  const [clientSearchInput, setClientSearchInput] = useState("");
  const [allFetchedClients, setAllFetchedClients] = useState([]);
  const [clientsMessage, setClientsMessage] = useState(
    "Click Refresh to load clients",
  );

  const [auditCurrentPage, setAuditCurrentPage] = useState(0);
  const auditPageSize = 10;
  const [auditRows, setAuditRows] = useState([]);
  const [auditMessage, setAuditMessage] = useState(
    "Loading audit logs...",
  );

  const isEditingWeather = Boolean(weatherForm.id);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (activeTab === "dashboard") {
      loadDashboardStats();
    }
    if (activeTab === "weather") {
      loadWeatherReports(1);
    }
    if (activeTab === "clients") {
      loadClients();
    }
    if (activeTab === "audit") {
      loadAuditReports(auditCurrentPage);
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "clients") {
      loadClients();
    }
  }, [clientFilterStatus]);

  const filteredClients = useMemo(() => {
    const query = clientSearchInput.toLowerCase();
    return allFetchedClients.filter(
      (client) =>
        client.name && client.name.toLowerCase().includes(query),
    );
  }, [allFetchedClients, clientSearchInput]);

  function toggleTheme() {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }

  function handleLogout() {
    sessionStorage.removeItem("adminAuthenticated");
    navigate("/admin/login", { replace: true });
  }

  function switchToTab(tabName) {
    setActiveTab(tabName);
    setSidebarOpen(false);
  }

  async function loadDashboardStats() {
    try {
      const [activeRes, inactiveRes, localRes] = await Promise.all([
        fetch(`${apiBase}/client/count/true`),
        fetch(`${apiBase}/client/count/false`),
        fetch(`${apiBase}/weather/count`),
      ]);

      const activeData = await parseResponse(activeRes);
      const inactiveData = await parseResponse(inactiveRes);
      const localData = await parseResponse(localRes);

      setStats({
        active: activeData.success ? activeData.payload.count : "-",
        inactive: inactiveData.success
          ? inactiveData.payload.count
          : "-",
        local: localData.success ? localData.payload.count : "-",
        global: "15",
      });
    } catch (error) {
      console.error("Failed to load dashboard stats", error);
    }
  }

  async function loadWeatherReports(page) {
    const nextPage = page < 1 ? 1 : page;
    const apiPageNumber = nextPage - 1;
    setCurrentPage(nextPage);
    setIsSearchMode(false);
    setWeatherMessage("Loading...");

    try {
      const response = await fetch(
        `${apiBase}/weather/page?pageNumber=${apiPageNumber}&pageSize=${pageSize}`,
      );
      const result = await parseResponse(response);

      if (result.success && Array.isArray(result.payload)) {
        setWeatherRows(result.payload);
      } else {
        setWeatherRows([]);
        setWeatherMessage(`Failed: ${result.message}`);
      }
    } catch (error) {
      setWeatherRows([]);
      setWeatherMessage("Server Offline");
    }
  }

  async function searchWeatherById() {
    if (!searchId) {
      window.alert("Please enter an ID");
      return;
    }

    setWeatherMessage("Searching...");

    try {
      const response = await fetch(`${apiBase}/weather/${searchId}`);
      const result = await parseResponse(response);

      if (result.success && result.payload) {
        const item = {
          ...result.payload,
          id: result.payload.id || searchId,
        };
        setWeatherRows([item]);
        setIsSearchMode(true);
      } else {
        setWeatherRows([]);
        setWeatherMessage(`Report #${searchId} not found`);
      }
    } catch (error) {
      setWeatherRows([]);
      setWeatherMessage("Error fetching ID");
      window.alert(`Error: ${error.message}`);
    }
  }

  function clearSearch() {
    setSearchId("");
    setIsSearchMode(false);
    loadWeatherReports(currentPage);
  }

  async function handleWeatherSubmit(event) {
    event.preventDefault();

    const isEdit = Boolean(weatherForm.id);

    try {
      const url = isEdit
        ? `${apiBase}/weather/${weatherForm.id}`
        : `${apiBase}/weather`;
      const method = isEdit ? "PUT" : "POST";
      const payload = isEdit
        ? {
            description: weatherForm.condition,
            temp: Number.parseFloat(weatherForm.temp),
          }
        : {
            city: weatherForm.city,
            temp: Number.parseFloat(weatherForm.temp),
            weatherType: weatherForm.condition,
          };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await parseResponse(response);
      if (result.success) {
        window.alert(
          isEdit
            ? "Report Updated Successfully"
            : "Report Created Successfully",
        );
        resetWeatherForm();
        if (searchId) {
          searchWeatherById();
        } else {
          loadWeatherReports(currentPage);
        }
      } else {
        window.alert(`Error: ${result.message}`);
      }
    } catch (error) {
      window.alert(`Server Error: ${error.message}`);
    }
  }

  function editWeather(id, city, temp, weatherType) {
    setWeatherForm({
      id: String(id),
      city,
      temp: String(temp),
      condition: weatherType,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetWeatherForm() {
    setWeatherForm({
      id: "",
      city: "",
      temp: "",
      condition: "RAINY",
    });
  }

  async function deleteWeather(id) {
    if (!window.confirm(`Delete Report #${id}?`)) return;

    try {
      const response = await fetch(`${apiBase}/weather/${id}`, {
        method: "DELETE",
      });
      const result = await parseResponse(response);

      if (result.success) {
        if (searchId) {
          setWeatherRows([]);
          setWeatherMessage("Deleted.");
        } else {
          loadWeatherReports(currentPage);
        }
      } else {
        window.alert(result.message);
      }
    } catch (error) {
      window.alert("Error connecting to server");
    }
  }

  async function loadClients() {
    setClientsMessage("Loading...");

    try {
      const response = await fetch(
        `${apiBase}/client?isActive=${clientFilterStatus}`,
        { method: "GET" },
      );
      const result = await parseResponse(response);

      if (result.success && Array.isArray(result.payload)) {
        setAllFetchedClients(result.payload);
      } else {
        setAllFetchedClients([]);
        setClientsMessage(`Failed: ${result.message}`);
      }
    } catch (error) {
      setAllFetchedClients([]);
      setClientsMessage("Server Offline");
    }
  }

  async function updateClientStatus(email, newStatus) {
    const action = newStatus ? "Activate" : "Deactivate";
    if (
      !window.confirm(
        `Are you sure you want to ${action} this client?`,
      )
    )
      return;

    try {
      const encodedEmail = encodeURIComponent(email);
      const response = await fetch(
        `${apiBase}/client/${encodedEmail}/status?status=${newStatus}`,
        {
          method: "PATCH",
          headers: { accept: "*/*" },
        },
      );

      const result = await parseResponse(response);
      if (result.success) {
        loadClients();
      } else {
        window.alert(`Error: ${result.message}`);
      }
    } catch (error) {
      window.alert(`Server error: ${error.message}`);
    }
  }

  async function loadAuditReports(page) {
    const validPage = page < 0 ? 0 : page;
    setAuditCurrentPage(validPage);
    setAuditMessage("Loading audit logs...");

    try {
      const response = await fetch(
        `${apiBase}/audit/report?pageSize=${auditPageSize}&pageNumber=${validPage}`,
        {
          method: "GET",
          headers: { accept: "*/*" },
        },
      );

      const result = await parseResponse(response);
      if (result.success && Array.isArray(result.payload)) {
        setAuditRows(result.payload);
      } else {
        setAuditRows([]);
        setAuditMessage(`Failed to load: ${result.message}`);
      }
    } catch (error) {
      setAuditRows([]);
      setAuditMessage("Server Offline");
    }
  }

  function changeAuditPage(delta) {
    const nextPage = auditCurrentPage + delta;
    if (nextPage >= 0) {
      loadAuditReports(nextPage);
    }
  }

  const isViewingActiveClients = clientFilterStatus === "true";

  return (
    <div className="admin-page">
      <nav className="navbar navbar-expand-lg fixed-top">
        <div className="container-fluid px-4">
          <button
            className="btn btn-link text-primary d-lg-none me-2"
            onClick={() => setSidebarOpen((prev) => !prev)}
          >
            <i className="fas fa-bars fa-lg" />
          </button>

          <span className="navbar-brand">
            <i className="fas fa-sun me-2" />
            Global Weather{" "}
            <span className="badge bg-danger fs-6 align-top ms-1">
              ADMIN
            </span>
          </span>

          <div className="d-flex align-items-center ms-auto">
            <button
              className="theme-toggle-btn me-3"
              onClick={toggleTheme}
            >
              <i
                className={`fas ${theme === "dark" ? "fa-sun" : "fa-moon"}`}
              />
            </button>
            <div className="d-flex gap-2">
              <button
                className="btn btn-outline-danger btn-sm rounded-pill"
                onClick={handleLogout}
              >
                Logout
              </button>
              <Link
                className="btn btn-outline-primary btn-sm rounded-pill"
                to="/"
              >
                Client Portal
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="container-fluid admin-container">
        <div className={`sidebar ${sidebarOpen ? "show" : ""}`}>
          <div className="d-lg-none text-end px-3 mb-2">
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={() => setSidebarOpen(false)}
            >
              <i className="fas fa-times" /> Close
            </button>
          </div>

          <div className="nav flex-column nav-pills" role="tablist">
            <button
              className={`nav-link ${activeTab === "dashboard" ? "active" : ""}`}
              type="button"
              onClick={() => switchToTab("dashboard")}
            >
              <i className="fas fa-chart-pie me-2" /> Dashboard
            </button>
            <button
              className={`nav-link ${activeTab === "weather" ? "active" : ""}`}
              type="button"
              onClick={() => switchToTab("weather")}
            >
              <i className="fas fa-cloud-sun me-2" /> Weather Data
            </button>
            <button
              className={`nav-link ${activeTab === "clients" ? "active" : ""}`}
              type="button"
              onClick={() => switchToTab("clients")}
            >
              <i className="fas fa-users me-2" /> Client List
            </button>
            <button
              className={`nav-link ${activeTab === "audit" ? "active" : ""}`}
              type="button"
              onClick={() => switchToTab("audit")}
            >
              <i className="fas fa-file-contract me-2" /> Audit Report
            </button>
          </div>
        </div>

        <div className="main-content">
          {activeTab === "dashboard" && (
            <div>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h3>
                  <i className="fas fa-tachometer-alt me-2 text-primary" />
                  System Overview
                </h3>
                <span className="badge bg-light text-muted border">
                  Live Data
                </span>
              </div>

              <div className="row g-4 mb-5">
                <div className="col-md-3">
                  <div className="dashboard-card stat-card h-100">
                    <div>
                      <h6 className="text-muted text-uppercase small fw-bold">
                        Active Clients
                      </h6>
                      <h2 className="fw-bold mb-0 text-success">
                        {stats.active}
                      </h2>
                    </div>
                    <div className="stat-icon bg-success bg-opacity-10 text-success">
                      <i className="fas fa-user-check" />
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="dashboard-card stat-card h-100">
                    <div>
                      <h6 className="text-muted text-uppercase small fw-bold">
                        Inactive Clients
                      </h6>
                      <h2 className="fw-bold mb-0 text-danger">
                        {stats.inactive}
                      </h2>
                    </div>
                    <div className="stat-icon bg-danger bg-opacity-10 text-danger">
                      <i className="fas fa-user-slash" />
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="dashboard-card stat-card h-100">
                    <div>
                      <h6 className="text-muted text-uppercase small fw-bold">
                        Local Reports
                      </h6>
                      <h2 className="fw-bold mb-0 text-primary">
                        {stats.local}
                      </h2>
                    </div>
                    <div className="stat-icon bg-primary bg-opacity-10 text-primary">
                      <i className="fas fa-map-marker-alt" />
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="dashboard-card stat-card h-100">
                    <div>
                      <h6 className="text-muted text-uppercase small fw-bold">
                        Global Reports
                      </h6>
                      <h2 className="fw-bold mb-0 text-info">
                        {stats.global}
                      </h2>
                    </div>
                    <div className="stat-icon bg-info bg-opacity-10 text-info">
                      <i className="fas fa-globe" />
                    </div>
                  </div>
                </div>
              </div>

              <h5 className="fw-bold mb-3 text-muted">
                Quick Actions
              </h5>
              <div className="row g-4">
                <div className="col-md-6">
                  <div
                    className="dashboard-card quick-link-card h-100 d-flex align-items-center"
                    onClick={() => switchToTab("weather")}
                  >
                    <div className="stat-icon bg-primary text-white me-3">
                      <i className="fas fa-plus" />
                    </div>
                    <div>
                      <h5 className="fw-bold mb-1">Manage Weather</h5>
                      <p className="text-muted small mb-0">
                        Create new reports or update existing weather
                        data.
                      </p>
                    </div>
                    <i className="fas fa-chevron-right ms-auto text-muted" />
                  </div>
                </div>
                <div className="col-md-6">
                  <div
                    className="dashboard-card quick-link-card h-100 d-flex align-items-center"
                    onClick={() => switchToTab("clients")}
                  >
                    <div className="stat-icon bg-secondary text-white me-3">
                      <i className="fas fa-users-cog" />
                    </div>
                    <div>
                      <h5 className="fw-bold mb-1">Manage Clients</h5>
                      <p className="text-muted small mb-0">
                        View subscriber list and manage user status.
                      </p>
                    </div>
                    <i className="fas fa-chevron-right ms-auto text-muted" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "weather" && (
            <div>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h3>
                  <i className="fas fa-edit me-2 text-primary" />
                  Weather Manager
                </h3>
              </div>

              <div className="dashboard-card mb-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="fw-bold mb-0">
                    {isEditingWeather
                      ? `Edit Report #${weatherForm.id}`
                      : "Create Daily Report"}
                  </h5>
                  <button
                    className={`btn btn-sm btn-secondary ${isEditingWeather ? "" : "d-none"}`}
                    onClick={resetWeatherForm}
                  >
                    Cancel Edit
                  </button>
                </div>

                <form onSubmit={handleWeatherSubmit}>
                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="form-label">City Name</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Bhubaneswar"
                        required
                        disabled={isEditingWeather}
                        value={weatherForm.city}
                        onChange={(event) =>
                          setWeatherForm((prev) => ({
                            ...prev,
                            city: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Temp (°C)</label>
                      <input
                        type="number"
                        className="form-control"
                        step="0.1"
                        required
                        value={weatherForm.temp}
                        onChange={(event) =>
                          setWeatherForm((prev) => ({
                            ...prev,
                            temp: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">
                        Weather Type
                      </label>
                      <select
                        className="form-select"
                        required
                        value={weatherForm.condition}
                        onChange={(event) =>
                          setWeatherForm((prev) => ({
                            ...prev,
                            condition: event.target.value,
                          }))
                        }
                      >
                        {WEATHER_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="mt-3 text-end">
                    <button
                      type="submit"
                      className={`btn ${isEditingWeather ? "btn-warning" : "btn-primary-custom"}`}
                    >
                      <i
                        className={`fas ${isEditingWeather ? "fa-save" : "fa-plus-circle"} me-2`}
                      />
                      {isEditingWeather
                        ? "Update Report"
                        : "Publish Report"}
                    </button>
                  </div>
                </form>
              </div>

              <div className="dashboard-card">
                <div className="row g-2 align-items-center mb-3">
                  <div className="col-md-6">
                    <h5 className="fw-bold m-0">Recent Reports</h5>
                  </div>
                  <div className="col-md-6 text-end">
                    <div className="input-group w-auto d-inline-flex">
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        placeholder="Search ID..."
                        value={searchId}
                        onChange={(event) =>
                          setSearchId(event.target.value)
                        }
                      />
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={searchWeatherById}
                      >
                        <i className="fas fa-search" />
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={clearSearch}
                      >
                        <i className="fas fa-times" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="table-responsive">
                  <table className="table table-hover align-middle">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>City</th>
                        <th>Temperature</th>
                        <th>Condition</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {weatherRows.length === 0 && (
                        <tr>
                          <td
                            colSpan={5}
                            className="text-center py-4 text-muted"
                          >
                            {weatherMessage}
                          </td>
                        </tr>
                      )}
                      {weatherRows.map((item) => (
                        <tr key={`${item.id}-${item.city}`}>
                          <td>
                            <small className="text-muted">
                              #{item.id}
                            </small>
                          </td>
                          <td className="fw-bold">{item.city}</td>
                          <td>{item.temp}°C</td>
                          <td>
                            <span className="badge bg-info text-dark">
                              {item.weatherType || item.description}
                            </span>
                          </td>
                          <td className="text-end">
                            <button
                              className="btn btn-sm btn-outline-primary me-1"
                              onClick={() =>
                                editWeather(
                                  item.id,
                                  item.city,
                                  item.temp,
                                  item.weatherType ||
                                    item.description,
                                )
                              }
                            >
                              <i className="fas fa-edit" />
                            </button>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => deleteWeather(item.id)}
                            >
                              <i className="fas fa-trash-alt" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="d-flex justify-content-end mt-3">
                  <div
                    className={`btn-group ${isSearchMode ? "opacity-50 pe-none" : ""}`}
                  >
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() =>
                        loadWeatherReports(currentPage - 1)
                      }
                    >
                      Previous
                    </button>
                    <button className="btn btn-sm btn-outline-secondary disabled">
                      Page {currentPage}
                    </button>
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() =>
                        loadWeatherReports(currentPage + 1)
                      }
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "clients" && (
            <div>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h3>
                  <i className="fas fa-users-cog me-2 text-primary" />
                  Client Database
                </h3>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={loadClients}
                >
                  <i className="fas fa-sync-alt me-1" /> Refresh
                </button>
              </div>

              <div className="dashboard-card">
                <div className="row g-3 mb-4">
                  <div className="col-md-4">
                    <label className="form-label small text-muted fw-bold">
                      FILTER STATUS
                    </label>
                    <select
                      className="form-select form-select-sm"
                      value={clientFilterStatus}
                      onChange={(event) =>
                        setClientFilterStatus(event.target.value)
                      }
                    >
                      <option value="true">Active Clients</option>
                      <option value="false">Inactive Clients</option>
                    </select>
                  </div>
                  <div className="col-md-8">
                    <label className="form-label small text-muted fw-bold">
                      SEARCH BY NAME
                    </label>
                    <div className="input-group input-group-sm">
                      <span className="input-group-text bg-transparent border-end-0">
                        <i className="fas fa-search text-muted" />
                      </span>
                      <input
                        type="text"
                        className="form-control border-start-0"
                        placeholder="Type name to filter..."
                        value={clientSearchInput}
                        onChange={(event) =>
                          setClientSearchInput(event.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="table-responsive">
                  <table className="table table-hover align-middle">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Plan</th>
                        <th>Status</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredClients.length === 0 && (
                        <tr>
                          <td
                            colSpan={7}
                            className="text-center py-4 text-muted"
                          >
                            {allFetchedClients.length === 0
                              ? clientsMessage
                              : "No clients found."}
                          </td>
                        </tr>
                      )}
                      {filteredClients.map((user) => {
                        let badgeClass = "badge-go";
                        let planName = "GO";

                        if (
                          String(
                            user.subscriptionType,
                          ).toUpperCase() === "PRO"
                        ) {
                          badgeClass = "badge-pro";
                          planName = "PRO";
                        }
                        if (
                          String(
                            user.subscriptionType,
                          ).toUpperCase() === "MAX"
                        ) {
                          badgeClass = "badge-max";
                          planName = "MAX";
                        }

                        const statusBadge = isViewingActiveClients ? (
                          <span className="badge bg-success bg-opacity-25 text-success rounded-pill">
                            Active
                          </span>
                        ) : (
                          <span className="badge bg-secondary bg-opacity-25 text-secondary rounded-pill">
                            Inactive
                          </span>
                        );

                        return (
                          <tr key={user.email}>
                            <td>
                              <small className="text-muted">
                                #{user.id || "?"}
                              </small>
                            </td>
                            <td className="fw-bold">{user.name}</td>
                            <td>{user.email}</td>
                            <td>{user.phoneNumber || "-"}</td>
                            <td>
                              <span
                                className={`badge ${badgeClass} rounded-pill px-3`}
                              >
                                {planName}
                              </span>
                            </td>
                            <td>{statusBadge}</td>
                            <td className="text-end">
                              {isViewingActiveClients ? (
                                <button
                                  className="btn btn-sm btn-outline-warning me-1"
                                  title="Deactivate"
                                  onClick={() =>
                                    updateClientStatus(
                                      user.email,
                                      false,
                                    )
                                  }
                                >
                                  <i className="fas fa-user-slash" />{" "}
                                  Deactivate
                                </button>
                              ) : (
                                <button
                                  className="btn btn-sm btn-outline-success me-1"
                                  title="Activate"
                                  onClick={() =>
                                    updateClientStatus(
                                      user.email,
                                      true,
                                    )
                                  }
                                >
                                  <i className="fas fa-user-check" />{" "}
                                  Activate
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "audit" && (
            <div>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h3>
                  <i className="fas fa-file-contract me-2 text-primary" />
                  Audit Log
                </h3>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => loadAuditReports(auditCurrentPage)}
                >
                  <i className="fas fa-sync-alt me-1" /> Refresh
                </button>
              </div>

              <div className="dashboard-card">
                <div className="table-responsive">
                  <table className="table table-hover align-middle">
                    <thead>
                      <tr>
                        <th>Date and Time</th>
                        <th>Action</th>
                        <th>User Email</th>
                        <th>Audit ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditRows.length === 0 && (
                        <tr>
                          <td
                            colSpan={4}
                            className="text-center py-4 text-muted"
                          >
                            {auditMessage}
                          </td>
                        </tr>
                      )}
                      {auditRows.map((log) => {
                        const dateObj = new Date(log.createdDateTime);
                        return (
                          <tr key={log.auditId}>
                            <td>
                              <div className="fw-bold">
                                {dateObj.toLocaleDateString()}
                              </div>
                              <div className="small text-muted">
                                {dateObj.toLocaleTimeString()}
                              </div>
                            </td>
                            <td>
                              <span className="badge bg-light text-dark border">
                                {log.action}
                              </span>
                            </td>
                            <td>{log.userEmail}</td>
                            <td>
                              <small className="text-muted font-monospace">
                                {log.auditId}
                              </small>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="d-flex justify-content-end mt-3">
                  <div className="btn-group">
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => changeAuditPage(-1)}
                    >
                      Previous
                    </button>
                    <button className="btn btn-sm btn-outline-secondary disabled">
                      Page {auditCurrentPage + 1}
                    </button>
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => changeAuditPage(1)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
