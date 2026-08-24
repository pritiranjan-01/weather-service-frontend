import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "../styles/client.css";

const PLAN_OPTIONS = [
  { value: 0, label: "GO" },
  { value: 1, label: "PRO" },
  { value: 2, label: "MAX" }
];

function planValueFromPayload(subscriptionType) {
  if (typeof subscriptionType === "number") return subscriptionType;
  if (typeof subscriptionType === "string") {
    const type = subscriptionType.toUpperCase();
    if (type === "PRO") return 1;
    if (type === "MAX") return 2;
    return 0;
  }
  return 0;
}

async function parseResponse(response) {
  try {
    const data = await response.json();

    if (Object.prototype.hasOwnProperty.call(data, "statusCode") && Object.prototype.hasOwnProperty.call(data, "status")) {
      if (data.status === false) {
        return {
          success: false,
          message: typeof data.payload === "string" ? data.payload : "Operation Failed",
          payload: null
        };
      }

      return {
        success: true,
        message: typeof data.payload === "string" ? data.payload : data.type || "Operation Completed",
        payload: data.payload,
        raw: data
      };
    }

    const keys = Object.keys(data);
    if (keys.length > 0 && !Object.prototype.hasOwnProperty.call(data, "statusCode")) {
      const errorMessages = keys.map((key) => `${key}: ${data[key]}`).join("\n");
      return {
        success: false,
        message: `Validation Error:\n${errorMessages}`,
        payload: null
      };
    }

    return {
      success: response.ok,
      message: response.statusText,
      payload: null,
      raw: data
    };
  } catch (error) {
    return {
      success: false,
      message: "Server Error (Invalid JSON response)",
      payload: null
    };
  }
}

export default function ClientPortal() {
  const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/client`;

  const [theme, setTheme] = useState("light");
  const [activeSection, setActiveSection] = useState("landing-page");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [registration, setRegistration] = useState({
    name: "",
    email: "",
    phone: "",
    subscriptionType: 0,
    planName: "GO"
  });
  const [registrationLoading, setRegistrationLoading] = useState(false);

  const [tempEmail, setTempEmail] = useState("");
  const [otp, setOtp] = useState("");

  const [contactForm, setContactForm] = useState({ name: "", email: "", message: "" });
  const [contactLoading, setContactLoading] = useState(false);

  const [manageEmailInput, setManageEmailInput] = useState("");
  const [currentManageEmail, setCurrentManageEmail] = useState("");
  const [manageProfile, setManageProfile] = useState({ name: "", phoneNumber: "" });
  const [currentPlanValue, setCurrentPlanValue] = useState(0);
  const [selectedPlanValue, setSelectedPlanValue] = useState(0);
  const [manageTab, setManageTab] = useState("profile");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "light";
    setTheme(savedTheme);
    document.documentElement.setAttribute("data-theme", savedTheme);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const displayedPlans = useMemo(
    () =>
      PLAN_OPTIONS.map((plan) => ({
        ...plan,
        label: plan.value === Number(currentPlanValue) ? `${plan.label} (Current)` : plan.label
      })),
    [currentPlanValue]
  );

  function toggleTheme() {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }

  function showSection(id) {
    setMobileMenuOpen(false);
    setActiveSection(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleNavClick(sectionId) {
    showSection("landing-page");
    if (sectionId === "landing-page") return;
    setTimeout(() => {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }, 50);
  }

  function startRegister(planValue, planName) {
    setRegistration((prev) => ({ ...prev, subscriptionType: planValue, planName }));
    showSection("register-section");
  }

  async function handleContactSubmit(event) {
    event.preventDefault();
    setContactLoading(true);

    try {
      const res = await fetch("https://formspree.io/f/mldpdyev", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contactForm)
      });

      if (res.ok) {
        window.alert("Thank you for your message! We will get back to you shortly.");
        setContactForm({ name: "", email: "", message: "" });
      } else {
        window.alert("Something went wrong. Please try again.");
      }
    } catch (error) {
      window.alert("Network error! Please check your connection.");
    } finally {
      setContactLoading(false);
    }
  }

  async function handleRegistration(event) {
    event.preventDefault();
    setRegistrationLoading(true);

    const payload = {
      name: registration.name,
      email: registration.email,
      subscriptionType: Number(registration.subscriptionType),
      phoneNumber: registration.phone
    };

    try {
      const response = await fetch(`${apiUrl}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const result = await parseResponse(response);
      if (result.success) {
        setTempEmail(registration.email);
        showSection("otp-section");
        window.alert(result.message);
      } else {
        window.alert(result.message);
      }
    } catch (error) {
      window.alert("Server connection failed. Is the API running?");
    } finally {
      setRegistrationLoading(false);
    }
  }

  async function verifyOtp() {
    try {
      const response = await fetch(`${apiUrl}/verify-otp?email=${encodeURIComponent(tempEmail)}&otp=${otp}`, {
        method: "POST"
      });

      const result = await parseResponse(response);
      if (result.success) {
        window.alert(result.message);
        window.location.reload();
      } else {
        window.alert(`Verification Failed: ${result.message}`);
        setOtp("");
      }
    } catch (error) {
      window.alert("Verification failed. Check connection.");
    }
  }

  async function authenticateManager() {
    if (!manageEmailInput || !manageEmailInput.includes("@")) {
      window.alert("Please enter a valid email address.");
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/${encodeURIComponent(manageEmailInput)}`, { method: "GET" });
      const result = await parseResponse(response);

      if (!result.success) {
        window.alert(`Error fetching Client: ${result.message}`);
        return;
      }

      const planValue = planValueFromPayload(result.payload.subscriptionType);
      setCurrentManageEmail(manageEmailInput);
      setCurrentPlanValue(planValue);
      setSelectedPlanValue(planValue);
      setManageProfile({
        name: result.payload.name || "",
        phoneNumber: result.payload.phoneNumber || ""
      });
      setManageTab("profile");
      showSection("manage-dashboard");
    } catch (error) {
      window.alert("Error connecting to server");
    }
  }

  async function handleProfileUpdate(event) {
    event.preventDefault();

    const payload = {
      name: manageProfile.name,
      mobileNumber: manageProfile.phoneNumber
    };

    try {
      const response = await fetch(`${apiUrl}/${encodeURIComponent(currentManageEmail)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const result = await parseResponse(response);
      if (result.success) {
        window.alert("Profile Updated Successfully!");
      } else {
        window.alert(`Update failed: ${result.message}`);
      }
    } catch (error) {
      window.alert(`Error connecting to server ${error.message}`);
    }
  }

  async function handlePatchSubscription() {
    try {
      const response = await fetch(
        `${apiUrl}/${encodeURIComponent(currentManageEmail)}/subscription?subscriptionId=${selectedPlanValue}`,
        { method: "PATCH" }
      );

      const result = await parseResponse(response);
      if (result.success) {
        window.alert("Plan Updated Successfully");
        setCurrentPlanValue(Number(selectedPlanValue));
        await authenticateManager();
      } else {
        window.alert(`Failed: ${result.message}`);
      }
    } catch (error) {
      window.alert("Error connecting to server");
    }
  }

  async function handleDeleteUser() {
    if (!window.confirm("Are you sure? This will delete your account permanently.")) return;

    try {
      const response = await fetch(`${apiUrl}/${encodeURIComponent(currentManageEmail)}`, { method: "DELETE" });
      const result = await parseResponse(response);

      if (result.success) {
        window.alert(result.message);
        window.location.reload();
      } else {
        window.alert(`Error: ${result.message}`);
      }
    } catch (error) {
      window.alert("Error connecting to server");
    }
  }

  return (
    <div className="client-page">
      <nav className="navbar navbar-expand-lg fixed-top">
        <div className="container">
          <button
            type="button"
            className="navbar-brand border-0 bg-transparent"
            onClick={() => window.location.reload()}
          >
            <i className="fas fa-sun me-2" />
            Global Weather
          </button>

          <button className="navbar-toggler" type="button" onClick={() => setMobileMenuOpen((prev) => !prev)}>
            <span className="navbar-toggler-icon" />
          </button>

          <div className={`collapse navbar-collapse ${mobileMenuOpen ? "show" : ""}`}>
            <ul className="navbar-nav ms-auto align-items-center gap-3">
              <li className="nav-item">
                <button type="button" className="nav-link border-0 bg-transparent" onClick={() => handleNavClick("landing-page")}>
                  Home
                </button>
              </li>
              <li className="nav-item">
                <button type="button" className="nav-link border-0 bg-transparent" onClick={() => handleNavClick("features-scroll")}>
                  Features
                </button>
              </li>
              <li className="nav-item">
                <button type="button" className="nav-link border-0 bg-transparent" onClick={() => handleNavClick("plans-scroll")}>
                  Pricing
                </button>
              </li>
              <li className="nav-item">
                <button type="button" className="nav-link border-0 bg-transparent" onClick={() => handleNavClick("contact-scroll")}>
                  Contact
                </button>
              </li>
              <li className="nav-item">
                <Link to="/admin" className="nav-link text-decoration-underline" onClick={() => setMobileMenuOpen(false)}>
                  Admin Portal
                </Link>
              </li>

              <li className="nav-item">
                <button className="btn btn-primary-custom rounded-pill px-4" onClick={() => showSection("manage-auth")}>
                  Manage
                </button>
              </li>

              <li className="nav-item border-start ps-3 ms-2">
                <button className="theme-toggle-btn" onClick={toggleTheme} title="Toggle Dark Mode">
                  <i className={`fas ${theme === "dark" ? "fa-sun" : "fa-moon"}`} />
                </button>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      <div className="container" style={{ marginTop: "100px" }}>
        {activeSection === "landing-page" && (
          <div id="landing-page">
            <section className="hero-section text-center py-5">
              <div className="row align-items-center">
                <div className="col-lg-8 mx-auto">
                  <i className="fas fa-cloud-sun-rain hero-icon" />
                  <h1 className="display-4 fw-bolder mb-3">Wake Up to the Weather.</h1>
                  <p className="lead mb-5" style={{ maxWidth: "600px", margin: "0 auto" }}>
                    Get automated, precise weather reports delivered to your inbox every morning at 8 AM. Never get
                    caught in the rain again.
                  </p>
                  <div className="d-flex justify-content-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleNavClick("plans-scroll")}
                      className="btn btn-primary-custom rounded-pill py-2 px-4"
                    >
                      Get Started
                    </button>
                    <button
                      type="button"
                      onClick={() => showSection("manage-auth")}
                      className="btn btn-outline-custom rounded-pill py-2 px-4"
                    >
                      Existing User?
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <section id="features-scroll" className="py-5 mb-5">
              <div className="text-center mb-5">
                <h2 className="fw-bold">Why Global Weather?</h2>
                <p className="text-muted">More than just a forecast.</p>
              </div>
              <div className="row g-4">
                <div className="col-md-4">
                  <div className="feature-box p-4 h-100 text-center">
                    <i className="fas fa-globe-americas fa-3x text-accent mb-3" style={{ color: "var(--accent)" }} />
                    <h4 className="fw-bold">Global Coverage</h4>
                    <p className="text-muted">Tracking weather patterns in New York, Tokyo, London, and beyond.</p>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="feature-box p-4 h-100 text-center">
                    <i className="fas fa-file-pdf fa-3x text-primary mb-3" />
                    <h4 className="fw-bold">Detailed Reports</h4>
                    <p className="text-muted">Premium PDF attachments with humidity, wind speed, and weekly outlooks.</p>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="feature-box p-4 h-100 text-center">
                    <i className="fas fa-stopwatch fa-3x text-success mb-3" />
                    <h4 className="fw-bold">Precision Timing</h4>
                    <p className="text-muted">Our intelligent scheduler ensures your report arrives exactly at 8 AM.</p>
                  </div>
                </div>
              </div>
            </section>

            <div id="plans-scroll" className="py-5">
              <div className="text-center mb-5">
                <h2 className="display-6 fw-bold">Simple Pricing</h2>
                <p className="text-muted">Choose the plan that fits your lifestyle.</p>
              </div>

              <div className="row g-4 justify-content-center">
                <div className="col-md-4">
                  <div className="plan-card h-100">
                    <div className="plan-header">
                      <h3 className="fw-bold">GO</h3>
                      <div className="plan-price display-4 fw-bold my-2">Free</div>
                      <span className="badge bg-secondary">Essentials</span>
                    </div>
                    <div className="p-4">
                      <ul className="list-unstyled mb-4">
                        <li className="mb-2">
                          <i className="fas fa-check text-success me-2" />Daily Report
                        </li>
                        <li className="mb-2">
                          <i className="fas fa-check text-success me-2" />Local Weather
                        </li>
                        <li className="mb-2 text-muted">
                          <i className="fas fa-times me-2" />No International
                        </li>
                      </ul>
                      <button className="btn btn-outline-custom w-100 rounded-pill" onClick={() => startRegister(0, "GO")}>
                        Select GO
                      </button>
                    </div>
                  </div>
                </div>

                <div className="col-md-4">
                  <div className="plan-card h-100">
                    <div className="plan-header">
                      <h3 className="fw-bold">PRO</h3>
                      <div className="plan-price display-4 fw-bold my-2">$5</div>
                      <span className="badge bg-info text-dark">Traveler</span>
                    </div>
                    <div className="p-4">
                      <ul className="list-unstyled mb-4">
                        <li className="mb-2">
                          <i className="fas fa-check text-success me-2" />Daily Report
                        </li>
                        <li className="mb-2">
                          <i className="fas fa-check text-success me-2" />Local + International
                        </li>
                        <li className="mb-2">
                          <i className="fas fa-check text-success me-2" />Priority Delivery
                        </li>
                      </ul>
                      <button className="btn btn-primary-custom w-100 rounded-pill" onClick={() => startRegister(1, "PRO")}>
                        Select PRO
                      </button>
                    </div>
                  </div>
                </div>

                <div className="col-md-4">
                  <div className="plan-card max-plan h-100 position-relative">
                    <div className="badge-popular">POPULAR</div>
                    <div className="plan-header">
                      <h3 className="fw-bold text-primary">MAX</h3>
                      <div className="plan-price display-4 fw-bold my-2">$12</div>
                      <span className="badge bg-warning text-dark">Power User</span>
                    </div>
                    <div className="p-4">
                      <ul className="list-unstyled mb-4">
                        <li className="mb-2">
                          <i className="fas fa-check text-success me-2" />2x Daily Reports
                        </li>
                        <li className="mb-2">
                          <i className="fas fa-check text-success me-2" />Global Access
                        </li>
                        <li className="mb-2">
                          <i className="fas fa-check text-success me-2" />PDF Attachments
                        </li>
                      </ul>
                      <button className="btn btn-primary-custom w-100 rounded-pill" onClick={() => startRegister(2, "MAX")}>
                        Select MAX
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <section id="contact-scroll" className="py-5">
              <div className="row justify-content-center">
                <div className="col-md-8 col-lg-6">
                  <div id="contact-section">
                    <div className="text-center mb-4">
                      <h2 className="fw-bold">Contact Us</h2>
                      <p className="text-muted">Have questions? We would love to hear from you.</p>
                    </div>
                    <form onSubmit={handleContactSubmit}>
                      <div className="row g-3">
                        <div className="col-md-6">
                          <div className="form-floating">
                            <input
                              type="text"
                              className="form-control"
                              placeholder="Your Name"
                              required
                              value={contactForm.name}
                              onChange={(event) => setContactForm((prev) => ({ ...prev, name: event.target.value }))}
                            />
                            <label>Name</label>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="form-floating">
                            <input
                              type="email"
                              className="form-control"
                              placeholder="name@example.com"
                              required
                              value={contactForm.email}
                              onChange={(event) => setContactForm((prev) => ({ ...prev, email: event.target.value }))}
                            />
                            <label>Email</label>
                          </div>
                        </div>
                        <div className="col-12">
                          <div className="form-floating">
                            <textarea
                              className="form-control"
                              placeholder="Leave a comment here"
                              style={{ height: "100px" }}
                              required
                              value={contactForm.message}
                              onChange={(event) => setContactForm((prev) => ({ ...prev, message: event.target.value }))}
                            />
                            <label>Message</label>
                          </div>
                        </div>
                        <div className="col-12">
                          <button className="btn btn-primary-custom w-100 py-3 rounded-pill" type="submit" disabled={contactLoading}>
                            {contactLoading ? "Sending..." : "Send Message"}
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </section>

            <footer>
              <div className="container text-center">
                <div className="row">
                  <div className="col-md-4 mb-3">
                    <h5 className="fw-bold">Global Weather</h5>
                    <p className="small">Precision weather data for the modern world.</p>
                  </div>
                  <div className="col-md-4 mb-3">
                    <h5 className="fw-bold">Links</h5>
                    <ul className="list-unstyled">
                      <li>
                        <button className="btn btn-link p-0" onClick={() => handleNavClick("features-scroll")}>
                          Features
                        </button>
                      </li>
                      <li>
                        <button className="btn btn-link p-0" onClick={() => handleNavClick("plans-scroll")}>
                          Pricing
                        </button>
                      </li>
                      <li>
                        <button className="btn btn-link p-0" onClick={() => handleNavClick("contact-scroll")}>
                          Contact
                        </button>
                      </li>
                    </ul>
                  </div>
                  <div className="col-md-4 mb-3">
                    <h5 className="fw-bold">Connect</h5>
                    <p className="small">support@globalweather.com<br />1-800-WEATHER</p>
                  </div>
                </div>
                <hr className="border-secondary mt-4" />
                <p className="small mb-0 opacity-50">© 2025 Global Weather Service. All rights reserved.</p>
              </div>
            </footer>
          </div>
        )}

        {activeSection === "register-section" && (
          <div id="register-section" className="form-section">
            <div className="d-flex justify-content-between align-items-center mb-5">
              <h3 className="fw-bold m-0">
                Sign Up for <span className="text-primary">{registration.planName}</span>
              </h3>
              <button type="button" className="btn-close shadow-none" onClick={() => showSection("landing-page")} />
            </div>
            <form onSubmit={handleRegistration}>
              <div className="form-floating mb-3">
                <input
                  type="text"
                  className="form-control rounded-4"
                  placeholder="Full Name"
                  required
                  value={registration.name}
                  onChange={(event) => setRegistration((prev) => ({ ...prev, name: event.target.value }))}
                />
                <label>Full Name</label>
              </div>
              <div className="form-floating mb-3">
                <input
                  type="email"
                  className="form-control rounded-4"
                  placeholder="name@example.com"
                  required
                  value={registration.email}
                  onChange={(event) => setRegistration((prev) => ({ ...prev, email: event.target.value }))}
                />
                <label>Email Address</label>
              </div>
              <div className="form-floating mb-4">
                <input
                  type="tel"
                  className="form-control rounded-4"
                  placeholder="Mobile Number"
                  required
                  value={registration.phone}
                  onChange={(event) => setRegistration((prev) => ({ ...prev, phone: event.target.value }))}
                />
                <label>Mobile Number</label>
              </div>

              <button type="submit" className="btn btn-primary-custom rounded-pill py-3 w-100" disabled={registrationLoading}>
                <span>{registrationLoading ? "Processing..." : "Proceed to Verification"}</span>
                {registrationLoading && <span className="spinner-border spinner-border-sm ms-2" />}
              </button>
            </form>
          </div>
        )}

        {activeSection === "otp-section" && (
          <div id="otp-section" className="form-section text-center">
            <div className="mb-4">
              <span className="fa-stack fa-3x text-primary">
                <i className="fas fa-circle fa-stack-2x opacity-25" />
                <i className="fas fa-shield-alt fa-stack-1x" />
              </span>
            </div>
            <h3 className="fw-bold">Verify Your Email</h3>
            <p className="text-muted mb-5">
              We have sent a 6-digit code to <br />
              <strong>{tempEmail}</strong>
            </p>

            <div className="d-flex justify-content-center mb-5">
              <input
                type="text"
                className="form-control form-control-lg text-center fw-bold text-primary rounded-4"
                style={{ width: "200px", letterSpacing: "8px", fontSize: "1.5rem" }}
                placeholder="••••••"
                maxLength={6}
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
              />
            </div>

            <button onClick={verifyOtp} className="btn btn-primary-custom rounded-pill py-3 w-100 mb-3">
              Verify and Activate
            </button>
            <button onClick={() => showSection("register-section")} className="btn btn-link text-muted text-decoration-none">
              Back to Registration
            </button>
          </div>
        )}

        {activeSection === "manage-auth" && (
          <div id="manage-auth" className="form-section text-center">
            <div className="d-flex justify-content-between align-items-center mb-5">
              <h3 className="fw-bold m-0">Manage Subscription</h3>
              <button type="button" className="btn-close shadow-none" onClick={() => showSection("landing-page")} />
            </div>
            <p className="text-muted mb-5">Enter your registered email address to access your dashboard.</p>

            <div className="form-floating mb-4 text-start">
              <input
                type="email"
                className="form-control rounded-4"
                placeholder="name@example.com"
                required
                value={manageEmailInput}
                onChange={(event) => setManageEmailInput(event.target.value)}
              />
              <label>Registered Email</label>
            </div>
            <button onClick={authenticateManager} className="btn btn-primary-custom rounded-pill py-3 w-100">
              Access Dashboard
            </button>
          </div>
        )}

        {activeSection === "manage-dashboard" && (
          <div id="manage-dashboard" className="form-section" style={{ maxWidth: "600px" }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h3 className="fw-bold m-0">User Dashboard</h3>
              <button type="button" className="btn-close shadow-none" onClick={() => showSection("landing-page")} />
            </div>

            <div className="d-flex align-items-center p-3 bg-primary bg-opacity-10 rounded-4 mb-4">
              <div className="flex-shrink-0">
                <i className="fas fa-user-circle fa-2x text-primary" />
              </div>
              <div className="flex-grow-1 ms-3">
                <h5 className="mb-0">{currentManageEmail}</h5>
                <small className="text-muted">Logged in</small>
              </div>
            </div>

            <ul className="nav nav-pills nav-pills-custom nav-fill mb-4 gap-2">
              <li className="nav-item" role="presentation">
                <button
                  className={`nav-link fw-bold ${manageTab === "profile" ? "active" : ""}`}
                  onClick={() => setManageTab("profile")}
                >
                  Update Details
                </button>
              </li>
              <li className="nav-item" role="presentation">
                <button
                  className={`nav-link fw-bold ${manageTab === "plan" ? "active" : ""}`}
                  onClick={() => setManageTab("plan")}
                >
                  Change Plan
                </button>
              </li>
            </ul>

            {manageTab === "profile" && (
              <form onSubmit={handleProfileUpdate}>
                <div className="form-floating mb-3">
                  <input
                    type="text"
                    className="form-control rounded-4"
                    placeholder="Name"
                    value={manageProfile.name}
                    onChange={(event) => setManageProfile((prev) => ({ ...prev, name: event.target.value }))}
                  />
                  <label>Name</label>
                </div>
                <div className="form-floating mb-4">
                  <input
                    type="tel"
                    className="form-control rounded-4"
                    placeholder="Mobile Number"
                    value={manageProfile.phoneNumber}
                    onChange={(event) => setManageProfile((prev) => ({ ...prev, phoneNumber: event.target.value }))}
                  />
                  <label>Mobile Number</label>
                </div>
                <button type="submit" className="btn btn-primary-custom rounded-pill py-3 w-100">
                  Save Changes
                </button>
              </form>
            )}

            {manageTab === "plan" && (
              <>
                <div className="form-floating mb-4">
                  <select
                    className="form-select rounded-4 fw-bold"
                    value={selectedPlanValue}
                    onChange={(event) => setSelectedPlanValue(Number(event.target.value))}
                  >
                    {displayedPlans.map((plan) => (
                      <option key={plan.value} value={plan.value}>
                        {plan.label}
                      </option>
                    ))}
                  </select>
                  <label>New Plan</label>
                </div>

                <button onClick={handlePatchSubscription} className="btn btn-primary-custom rounded-pill py-3 w-100 mb-4">
                  Update Plan
                </button>

                <hr className="text-muted opacity-25 my-4" />

                <button onClick={handleDeleteUser} className="btn btn-outline-danger rounded-pill py-3 w-100 fw-bold">
                  <i className="fas fa-trash-alt me-2" />
                  Unsubscribe and Delete
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
