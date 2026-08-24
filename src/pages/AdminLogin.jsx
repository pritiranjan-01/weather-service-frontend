import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import "../styles/admin.css";

export default function AdminLogin() {
  const [pin, setPin] = useState("");
  const navigate = useNavigate();

  const isAuthenticated =
    sessionStorage.getItem("adminAuthenticated") === "true";

  function handleLogin(event) {
    event.preventDefault();

    if (pin === "1234") {
      sessionStorage.setItem("adminAuthenticated", "true");
      navigate("/admin", { replace: true });
    } else {
      window.alert("Incorrect PIN");
    }
  }

  if (isAuthenticated) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="admin-page">
      <div id="login-overlay">
        <div className="login-box">
          <i className="fas fa-user-shield fa-4x text-primary mb-4" />
          <h2 className="fw-bold mb-3">Admin Access</h2>
          <p className="text-muted mb-4">
            Please enter your PIN to continue.
          </p>

          <form onSubmit={handleLogin}>
            <input
              type="password"
              className="form-control text-center fs-3 mb-4"
              maxLength={4}
              placeholder="••••"
              value={pin}
              onChange={(event) => setPin(event.target.value)}
            />
            <button
              type="submit"
              className="btn btn-primary-custom w-100"
            >
              Unlock Dashboard
            </button>
          </form>

          <p className="text-muted mt-3 small">Hint: 1234</p>
          <Link
            to="/"
            className="btn btn-link mt-2 text-decoration-none"
          >
            Back to Client Portal
          </Link>
        </div>
      </div>
    </div>
  );
}
