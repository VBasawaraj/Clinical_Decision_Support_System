import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    const user = data.user;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError) {
      setError(profileError.message);
      setLoading(false);
      return;
    }

    if (profile.role === "doctor") {
      navigate("/doctor");
    } else {
      navigate("/patient");
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
            <span>Secure decision-support workspace</span>
          </div>
        </div>

        <div className="auth-copy">
          <span>CLINICIAN AND PATIENT ACCESS</span>
          <h1>Sign in to your clinical workspace.</h1>
          <p>
            Review submissions, manage care information, and
            continue AI-assisted clinical workflows securely.
          </p>
        </div>

      </section>

      <div className="auth-card">

        <div className="auth-card-heading">
          <span>WELCOME BACK</span>
          <h2>Login</h2>
        </div>

        {error && (
          <p className="error">
            {error}
          </p>
        )}

        <form onSubmit={handleLogin}>

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>

        </form>

        <div className="auth-links">
          <Link to="/forgot-password">
            Forgot password?
          </Link>

          <p>
            Don't have an account?{" "}
            <Link to="/register">
              Register
            </Link>
          </p>
        </div>

      </div>

    </div>
  );
}

export default Login;
