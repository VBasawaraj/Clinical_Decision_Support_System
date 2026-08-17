import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { loadPatientReports } from "../lib/aiReports";
import { useNavigate } from "react-router-dom";
import "../patient-dashboard.css";

function Icon({ name, size = 20 }) {
  const paths = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    upload: (
      <>
        <path d="M12 16V4" />
        <path d="m7 9 5-5 5 5" />
        <path d="M5 20h14" />
      </>
    ),
    file: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M8 13h8" />
        <path d="M8 17h6" />
      </>
    ),
    report: (
      <>
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="m7 15 3-4 3 2 4-6" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    logout: (
      <>
        <path d="M10 17l5-5-5-5" />
        <path d="M15 12H3" />
        <path d="M21 19V5a2 2 0 0 0-2-2h-6" />
      </>
    ),
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </>
    ),
    shield: (
      <>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    activity: (
      <>
        <path d="M3 12h4l3-8 4 16 3-8h4" />
      </>
    ),
    heart: (
      <>
        <path d="M20.8 8.6c0 5.4-8.8 11.4-8.8 11.4S3.2 14 3.2 8.6A4.6 4.6 0 0 1 12 6a4.6 4.6 0 0 1 8.8 2.6z" />
      </>
    ),
    image: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <circle cx="8.5" cy="9" r="1.5" />
        <path d="m21 15-5-5L5 20" />
      </>
    ),
    lungs: (
      <>
        <path d="M12 5v15" />
        <path d="M12 11c-2-4-5-7-7-7-1 4-2 9 0 12 1 2 4 2 7-1" />
        <path d="M12 11c2-4 5-7 7-7 1 4 2 9 0 12-1 2-4 2-7-1" />
      </>
    ),
    copy: (
      <>
        <rect x="9" y="9" width="12" height="12" rx="2" />
        <path d="M15 9V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h4" />
      </>
    ),
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

function PatientDashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [activeSection, setActiveSection] = useState("overview");
  const [symptoms, setSymptoms] = useState("");
  const [profileName, setProfileName] = useState("");

  const [skinFile, setSkinFile] = useState(null);
  const [xrayFile, setXrayFile] = useState(null);

  const [submissions, setSubmissions] = useState([]);
  const [reports, setReports] = useState([]);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadPatient();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPatient = async () => {
    try {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        navigate("/");
        return;
      }

      setUser(user);

      const { data: profileData, error: profileError } =
        await supabase
          .from("profiles")
          .select("full_name, user_code, role")
          .eq("id", user.id)
          .single();

      if (profileError) {
        console.error(profileError);
        setError("Unable to load patient profile.");
        return;
      }

      if (profileData.role !== "patient") {
        navigate("/");
        return;
      }

      setProfile(profileData);
      setProfileName(profileData.full_name || "");

      await loadSubmissions(user.id);
      await loadReports(user.id);
    } catch (err) {
      console.error(err);
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const loadReports = async (patientId) => {
    try {
      setReports(await loadPatientReports(patientId));
    } catch (err) {
      console.error(err);
    }
  };

  const loadSubmissions = async (patientId) => {
    const { data, error } = await supabase
      .from("medical_submissions")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    setSubmissions(data || []);
  };

  const clearMessages = () => {
    setMessage("");
    setError("");
  };

  const updateProfile = async (e) => {
    e.preventDefault();
    clearMessages();

    const nextName = profileName.trim();

    if (!nextName) {
      setError("Full name is required.");
      return;
    }

    try {
      setSavingProfile(true);

      const { error } = await supabase
        .from("profiles")
        .update({ full_name: nextName })
        .eq("id", user.id);

      if (error) throw error;

      setProfile((current) => ({
        ...current,
        full_name: nextName,
      }));

      setMessage("Profile updated successfully.");
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const submitSymptoms = async () => {
    clearMessages();

    if (!symptoms.trim()) {
      setError("Please describe your symptoms before submitting.");
      return;
    }

    try {
      setUploading(true);

      const { error } = await supabase
        .from("medical_submissions")
        .insert({
          patient_id: user.id,
          submission_type: "symptoms",
          description: symptoms.trim(),
        });

      if (error) throw error;

      setSymptoms("");
      setMessage("Your symptoms have been securely submitted.");

      await loadSubmissions(user.id);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const uploadMedicalImage = async (file, type) => {
    clearMessages();

    if (!file) {
      setError("Please select an image first.");
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/jpg",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError("Please upload a JPG, PNG, or WEBP image.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10 MB.");
      return;
    }

    try {
      setUploading(true);

      const folder =
        type === "skin_image" ? "skin" : "chest-xray";

      const extension = file.name.split(".").pop();

      const fileName = `${Date.now()}-${crypto.randomUUID()}.${extension}`;

      const filePath = `${user.id}/${folder}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("medical-files")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: databaseError } = await supabase
        .from("medical_submissions")
        .insert({
          patient_id: user.id,
          submission_type: type,
          file_path: filePath,
          file_name: file.name,
        });

      if (databaseError) throw databaseError;

      if (type === "skin_image") {
        setSkinFile(null);
      } else {
        setXrayFile(null);
      }

      setMessage(
        type === "skin_image"
          ? "Skin image uploaded securely."
          : "Chest X-ray uploaded securely."
      );

      await loadSubmissions(user.id);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getSubmissionName = (type) => {
    if (type === "symptoms") return "Symptom report";
    if (type === "skin_image") return "Skin image";
    return "Chest X-ray";
  };

  const getSubmissionIcon = (type) => {
    if (type === "symptoms") return "activity";
    if (type === "skin_image") return "image";
    return "lungs";
  };

  if (loading) {
    return (
      <div className="clinical-loading">
        <div className="loading-brand">
          <div className="brand-mark">+</div>
          <span>CLINICAL CDS</span>
        </div>

        <div className="loading-line" />

        <p>Preparing your secure patient portal...</p>
      </div>
    );
  }

  const patientInitial =
    profile?.full_name?.charAt(0)?.toUpperCase() || "P";

  return (
    <div className="clinical-app">

      {/* SIDEBAR */}

      <aside className="clinical-sidebar">

        <div className="sidebar-top">

          <div className="clinical-logo">
            <div className="logo-mark">
              +
            </div>

            <div>
              <strong>CLINICAL</strong>
              <span>CDS PLATFORM</span>
            </div>
          </div>

          <div className="workspace-label">
            PATIENT PORTAL
          </div>

          <nav>

            <button
              className={`side-link ${
                activeSection === "overview"
                  ? "active"
                  : ""
              }`}
              onClick={() => setActiveSection("overview")}
            >
              <Icon name="grid" />
              <span>Overview</span>
            </button>

            <button
              className={`side-link ${
                activeSection === "submissions"
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setActiveSection("submissions")
              }
            >
              <Icon name="upload" />
              <span>Submissions</span>
            </button>

            <button
              className={`side-link ${
                activeSection === "reports"
                  ? "active"
                  : ""
              }`}
              onClick={() => setActiveSection("reports")}
            >
              <Icon name="report" />
              <span>AI Reports</span>
            </button>

            <button
              className={`side-link ${
                activeSection === "profile"
                  ? "active"
                  : ""
              }`}
              onClick={() => setActiveSection("profile")}
            >
              <Icon name="user" />
              <span>Profile</span>
            </button>

          </nav>

        </div>

        <div className="sidebar-bottom">

          <div className="security-note">
            <div className="security-icon">
              <Icon name="shield" size={16} />
            </div>

            <div>
              <strong>Secure portal</strong>
              <span>Your data is protected</span>
            </div>
          </div>

          <button
            className="signout-button"
            onClick={logout}
          >
            <Icon name="logout" size={18} />
            Sign out
          </button>

          <div className="sidebar-version">
            Clinical CDS · v1.0
          </div>

        </div>

      </aside>


      {/* CONTENT */}

      <main className="clinical-content">

        {/* TOP BAR */}

        <header className="topbar">

          <div className="breadcrumb">
            Patient Portal
            <span>/</span>
            <strong>
              {activeSection === "overview" && "Overview"}
              {activeSection === "submissions" && "Submissions"}
              {activeSection === "reports" && "AI Reports"}
              {activeSection === "profile" && "Profile"}
            </strong>
          </div>

          <div className="topbar-actions">

            <button className="notification-button">
              <Icon name="bell" size={19} />
              <span />
            </button>

            <div className="user-menu">

              <div className="user-avatar">
                {patientInitial}
              </div>

              <div className="user-menu-text">
                <strong>{profile?.full_name}</strong>
                <span>Patient</span>
              </div>

            </div>

          </div>

        </header>


        {/* HERO */}

        {activeSection === "overview" && (

        <section className="welcome-section">

          <div>

            <div className="eyebrow">
              <span className="online-dot" />
              PATIENT ACCOUNT
            </div>

            <h1>
              Good morning,{" "}
              <span>{profile?.full_name?.split(" ")[0]}</span>.
            </h1>

            <p>
              Keep your health information organized and
              securely share it with your care team.
            </p>

          </div>

          <div className="date-display">
            <span>Today</span>
            <strong>
              {new Date().toLocaleDateString([], {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </strong>
          </div>

        </section>

        )}


        {/* PROFILE STRIP */}

        {activeSection !== "profile" && (

        <section className="profile-strip">

          <div className="profile-primary">

            <div className="large-avatar">
              {patientInitial}
            </div>

            <div>
              <span className="profile-label">
                PATIENT PROFILE
              </span>

              <h2>
                {profile?.full_name}
              </h2>

              <div className="verified">
                <Icon name="shield" size={13} />
                Identity verified
              </div>
            </div>

          </div>

          <div className="patient-code">

            <span>PATIENT ID</span>

            <div className="code-row">

              <strong>
                {profile?.user_code || user?.id}
              </strong>

              <button
                onClick={() =>
                  navigator.clipboard?.writeText(
                    profile?.user_code || user?.id
                  )
                }
                title="Copy patient ID"
              >
                <Icon name="copy" size={15} />
              </button>

            </div>

          </div>

          <div className="profile-status">

            <span>ACCOUNT STATUS</span>

            <strong>
              <i />
              Active
            </strong>

          </div>

        </section>

        )}


        {/* MESSAGES */}

        {message && (
          <div className="toast-message success">
            <span>✓</span>
            {message}
            <button onClick={clearMessages}>×</button>
          </div>
        )}

        {error && (
          <div className="toast-message error">
            <span>!</span>
            {error}
            <button onClick={clearMessages}>×</button>
          </div>
        )}


        {/* MEDICAL SUBMISSIONS */}

        {(activeSection === "overview" ||
          activeSection === "submissions") && (

        <section className="submission-section">

          <div className="section-header">

            <div>
              <div className="section-kicker">
                HEALTH DATA
              </div>

              <h2>
                Medical submissions
              </h2>

              <p>
                Submit information that can help your
                healthcare team understand your condition.
              </p>
            </div>

            <div className="secure-label">
              <Icon name="shield" size={14} />
              Secure & private
            </div>

          </div>


          <div className="submission-grid">

            {/* SYMPTOMS */}

            <article className="medical-card symptoms-card">

              <div className="card-top">

                <div className="medical-icon">
                  <Icon name="activity" size={22} />
                </div>

                <span className="card-number">
                  01
                </span>

              </div>

              <div className="card-body">

                <span className="medical-category">
                  CLINICAL INFORMATION
                </span>

                <h3>
                  Symptoms
                </h3>

                <p>
                  Tell us how you're feeling and describe
                  any symptoms or health concerns.
                </p>

                <textarea
                  value={symptoms}
                  onChange={(e) =>
                    setSymptoms(e.target.value)
                  }
                  placeholder="Describe your symptoms..."
                />

              </div>

              <button
                className="primary-action"
                onClick={submitSymptoms}
                disabled={uploading}
              >
                {uploading
                  ? "Submitting..."
                  : "Submit symptoms"}
                <span>→</span>
              </button>

            </article>


            {/* SKIN */}

            <article className="medical-card skin-card">

              <div className="card-top">

                <div className="medical-icon">
                  <Icon name="image" size={22} />
                </div>

                <span className="card-number">
                  02
                </span>

              </div>

              <div className="card-body">

                <span className="medical-category">
                  DERMATOLOGY
                </span>

                <h3>
                  Skin image
                </h3>

                <p>
                  Upload a clear photograph of the
                  affected skin area.
                </p>

                <label className="modern-upload">

                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) =>
                      setSkinFile(
                        e.target.files?.[0] || null
                      )
                    }
                  />

                  <div className="upload-symbol">
                    <Icon name="upload" size={20} />
                  </div>

                  <strong>
                    {skinFile
                      ? skinFile.name
                      : "Select an image"}
                  </strong>

                  <span>
                    JPG, PNG or WEBP · Up to 10 MB
                  </span>

                </label>

              </div>

              <button
                className="primary-action"
                onClick={() =>
                  uploadMedicalImage(
                    skinFile,
                    "skin_image"
                  )
                }
                disabled={uploading || !skinFile}
              >
                {uploading
                  ? "Uploading..."
                  : "Upload skin image"}
                <span>→</span>
              </button>

            </article>


            {/* X-RAY */}

            <article className="medical-card xray-card">

              <div className="card-top">

                <div className="medical-icon">
                  <Icon name="lungs" size={22} />
                </div>

                <span className="card-number">
                  03
                </span>

              </div>

              <div className="card-body">

                <span className="medical-category">
                  RADIOLOGY
                </span>

                <h3>
                  Chest X-ray
                </h3>

                <p>
                  Upload your chest radiograph for
                  clinical assessment.
                </p>

                <label className="modern-upload">

                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) =>
                      setXrayFile(
                        e.target.files?.[0] || null
                      )
                    }
                  />

                  <div className="upload-symbol">
                    <Icon name="upload" size={20} />
                  </div>

                  <strong>
                    {xrayFile
                      ? xrayFile.name
                      : "Select an X-ray"}
                  </strong>

                  <span>
                    JPG, PNG or WEBP · Up to 10 MB
                  </span>

                </label>

              </div>

              <button
                className="primary-action"
                onClick={() =>
                  uploadMedicalImage(
                    xrayFile,
                    "chest_xray"
                  )
                }
                disabled={uploading || !xrayFile}
              >
                {uploading
                  ? "Uploading..."
                  : "Upload chest X-ray"}
                <span>→</span>
              </button>

            </article>

          </div>

        </section>

        )}


        {/* SAVED REPORTS */}

        {(activeSection === "overview" ||
          activeSection === "reports") && (

        <section className="patient-reports-section">

          <div className="section-header activity-header">

            <div>
              <div className="section-kicker">
                AI REPORTS
              </div>

              <h2>
                Saved reports
              </h2>

            </div>

            <span className="activity-count">
              {reports.length} saved
            </span>

          </div>

          {reports.length === 0 ? (

            <div className="empty-activity">

              <div className="empty-icon">
                <Icon name="report" size={22} />
              </div>

              <div>
                <h3>
                  No saved reports yet
                </h3>

                <p>
                  Doctor-reviewed AI reports will appear
                  here after they are saved.
                </p>
              </div>

            </div>

          ) : (

            <div className="patient-report-list">

              {reports.map((report) => (

                <article
                  className="patient-report-card"
                  key={report.id}
                >

                  <div>
                    <span>
                      {report.model ||
                        "Clinical AI Model"}
                    </span>

                    <h3>
                      {report.prediction}
                    </h3>

                    {report.confidence !== null && (
                      <strong>
                        {(
                          Number(report.confidence) *
                          100
                        ).toFixed(1)}
                        % confidence
                      </strong>
                    )}
                  </div>

                  {report.report?.xai?.about && (
                    <p>
                      {report.report.xai.about}
                    </p>
                  )}

                  <time>
                    {formatDate(report.created_at)}
                  </time>

                </article>

              ))}

            </div>

          )}

        </section>

        )}


        {/* PROFILE */}

        {activeSection === "profile" && (

          <section className="patient-profile-section">

            <div className="section-header">

              <div>
                <div className="section-kicker">
                  PROFILE
                </div>

                <h2>
                  Account details
                </h2>

                <p>
                  Keep your patient identity accurate for
                  clinical review and saved report access.
                </p>
              </div>

              <div className="secure-label">
                <Icon name="shield" size={14} />
                Verified
              </div>

            </div>

            <form
              className="profile-form"
              onSubmit={updateProfile}
            >

              <label>
                <span>Full name</span>
                <input
                  value={profileName}
                  onChange={(e) =>
                    setProfileName(e.target.value)
                  }
                />
              </label>

              <label>
                <span>Email</span>
                <input
                  value={user?.email || ""}
                  disabled
                />
              </label>

              <label>
                <span>Patient ID</span>
                <input
                  value={profile?.user_code || user?.id || ""}
                  disabled
                />
              </label>

              <button
                className="primary-action profile-save"
                disabled={savingProfile}
              >
                {savingProfile
                  ? "Saving..."
                  : "Save profile"}
                <span>→</span>
              </button>

            </form>

          </section>

        )}


        {/* ACTIVITY */}

        {activeSection === "overview" && (

        <section className="activity-section">

          <div className="section-header activity-header">

            <div>
              <div className="section-kicker">
                YOUR ACTIVITY
              </div>

              <h2>
                Recent submissions
              </h2>

            </div>

            <span className="activity-count">
              {submissions.length} total
            </span>

          </div>


          {submissions.length === 0 ? (

            <div className="empty-activity">

              <div className="empty-icon">
                <Icon name="file" size={22} />
              </div>

              <div>
                <h3>
                  No submissions yet
                </h3>

                <p>
                  Your medical submissions will appear
                  here once you upload them.
                </p>
              </div>

            </div>

          ) : (

            <div className="activity-table">

              {submissions.slice(0, 6).map(
                (submission) => (

                  <div
                    className="activity-row"
                    key={submission.id}
                  >

                    <div className="activity-type-icon">
                      <Icon
                        name={getSubmissionIcon(
                          submission.submission_type
                        )}
                        size={18}
                      />
                    </div>

                    <div className="activity-details">

                      <strong>
                        {getSubmissionName(
                          submission.submission_type
                        )}
                      </strong>

                      <span>
                        {submission.file_name ||
                          submission.description ||
                          "Medical submission"}
                      </span>

                    </div>

                    <div className="activity-status">
                      <span>
                        Submitted
                      </span>
                    </div>

                    <time>
                      {formatDate(
                        submission.created_at
                      )}
                    </time>

                  </div>

                )
              )}

            </div>

          )}

        </section>

        )}


        {/* FOOTER */}

        <footer className="clinical-footer">

          <span>
            © 2026 Clinical CDS
          </span>

          <div>
            <span>Privacy</span>
            <span>Security</span>
            <span>Help</span>
          </div>

        </footer>

      </main>

    </div>
  );
}

export default PatientDashboard;
