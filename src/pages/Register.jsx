import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { supabase } from "../lib/supabase";

// Generate unique-looking patient ID
const generatePatientId = () => {
  const characters =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let code = "";

  for (let i = 0; i < 8; i++) {
    code += characters.charAt(
      Math.floor(Math.random() * characters.length)
    );
  }

  return `PAT-${code}`;
};

function Register() {
  const navigate = useNavigate();

  const [role, setRole] = useState("patient");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [qualification, setQualification] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");

    // Check passwords
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    // Register user with Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,

      options: {
        data: {
          full_name: fullName,
          role: role,
          qualification:
            role === "doctor" ? qualification : null,
          license_number:
            role === "doctor" ? licenseNumber : null,
        },
      },
    });

    // Handle signup error
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Make sure Supabase returned a user
    if (!data.user) {
      setError("Registration failed. Please try again.");
      setLoading(false);
      return;
    }

    /*
      Generate user code only for patients.

      Patient:
      user_code = PAT-XXXXXXXX

      Doctor:
      user_code = null
    */
    const userCode =
      role === "patient"
        ? generatePatientId()
        : null;

    // Insert user profile
    const { error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: data.user.id,
        full_name: fullName,
        role: role,
        user_code: userCode,
      },
    {
      onConflict: ["id"], // Avoid duplicate entries
    });

    // Handle profile insertion error
    if (profileError) {
      setError(
        `Account created, but profile creation failed: ${profileError.message}`
      );
      setLoading(false);
      return;
    }

    /*
      If email confirmation is disabled,
      user session will be available immediately.
    */

    if (data.session) {
      if (role === "doctor") {
        navigate("/doctor");
      } else {
        navigate("/patient");
      }
    } else {
      setMessage(
        "Registration successful. Please check your email to verify your account."
      );
    }

    setLoading(false);
  };

  return (
    <div className="auth-container">

      <section className="auth-panel">

        <div className="auth-brand">
          <div className="auth-mark">+</div>

          <div>
            <strong>Clinical CDS</strong>
            <span>Secure care collaboration</span>
          </div>
        </div>

        <div className="auth-copy">
          <span>CREATE YOUR ACCOUNT</span>
          <h1>Join the Clinical CDS platform.</h1>
          <p>
            Patients can submit medical information and doctors
            can review AI-assisted reports from one workspace.
          </p>
        </div>

      </section>

      <div className="auth-card">

        <div className="auth-card-heading">
          <span>NEW ACCOUNT</span>
          <h2>Create account</h2>
        </div>

        {error && (
          <p className="error">
            {error}
          </p>
        )}

        {message && (
          <p className="success">
            {message}
          </p>
        )}

        <form onSubmit={handleRegister}>
          <input
            type="text"
            placeholder="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <div className="role-selection">
            <label>
              <input
                type="radio"
                value="patient"
                checked={role === "patient"}
                onChange={(e) => setRole(e.target.value)}
              />
              Patient
            </label>

            <label>
              <input
                type="radio"
                value="doctor"
                checked={role === "doctor"}
                onChange={(e) => setRole(e.target.value)}
              />
              Doctor
            </label>
          </div>

          {role === "doctor" && (
            <>
              <input
                type="text"
                placeholder="Qualification"
                value={qualification}
                onChange={(e) =>
                  setQualification(e.target.value)
                }
                required
              />

              <input
                type="text"
                placeholder="Medical License Number"
                value={licenseNumber}
                onChange={(e) =>
                  setLicenseNumber(e.target.value)
                }
                required
              />
            </>
          )}

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) =>
              setConfirmPassword(e.target.value)
            }
            required
          />

          <button type="submit" disabled={loading}>
            {loading
              ? "Creating Account..."
              : "Register"}
          </button>
        </form>

        <p>
          Already have an account?{" "}
          <Link to="/">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
