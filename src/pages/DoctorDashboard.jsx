import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import "../doctor-dashboard.css";

function Icon({ name, size = 20 }) {
  const icons = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),

    patients: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20c0-3.5 2.5-6 6-6s6 2.5 6 6" />
        <path d="M16 4a3 3 0 0 1 0 6" />
        <path d="M18 14c2 .7 3 2.2 3 4" />
      </>
    ),

    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),

    file: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M8 13h8" />
        <path d="M8 17h5" />
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

    activity: (
      <>
        <path d="M3 12h4l3-8 4 16 3-8h4" />
      </>
    ),

    ai: (
      <>
        <path d="M12 3v3" />
        <path d="M12 18v3" />
        <path d="M3 12h3" />
        <path d="M18 12h3" />
        <path d="m5.6 5.6 2.1 2.1" />
        <path d="m16.3 16.3 2.1 2.1" />
        <path d="m18.4 5.6-2.1 2.1" />
        <path d="m7.7 16.3-2.1 2.1" />
        <circle cx="12" cy="12" r="4" />
      </>
    ),

    shield: (
      <>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),

    logout: (
      <>
        <path d="M10 17l5-5-5-5" />
        <path d="M15 12H3" />
        <path d="M21 19V5a2 2 0 0 0-2-2h-6" />
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
      {icons[name]}
    </svg>
  );
}

function DoctorDashboard() {
  const navigate = useNavigate();

  const [patientCode, setPatientCode] = useState("");

  const [doctor, setDoctor] = useState(null);
  const [patient, setPatient] = useState(null);
  const [submissions, setSubmissions] = useState([]);

  const [selectedSubmission, setSelectedSubmission] =
    useState(null);

  const [aiResult, setAiResult] = useState(null);

  const [searching, setSearching] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const getDoctor = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      navigate("/");
      return null;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, user_code, role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "doctor") {
      navigate("/");
      return null;
    }

    setDoctor(profile);

    return profile;
  };

  const searchPatient = async () => {
    setError("");
    setMessage("");
    setPatient(null);
    setSubmissions([]);
    setSelectedSubmission(null);
    setAiResult(null);

    const code = patientCode.trim().toUpperCase();

    if (!code) {
      setError("Enter a patient ID.");
      return;
    }

    try {
      setSearching(true);

      const currentDoctor = doctor || await getDoctor();

      if (!currentDoctor) return;

      const {
        data,
        error: searchError,
      } = await supabase.rpc(
        "doctor_find_patient",
        {
          search_patient_code: code,
        }
      );

      if (searchError) {
        throw searchError;
      }

      if (!data || data.length === 0) {
        setError(
          "No patient was found with this Patient ID."
        );
        return;
      }

      const foundPatient = data[0];

      setPatient(foundPatient);

      const {
        data: patientSubmissions,
        error: submissionError,
      } = await supabase.rpc(
        "doctor_get_patient_submissions",
        {
          target_patient_id: foundPatient.id,
        }
      );

      if (submissionError) {
        throw submissionError;
      }

      setSubmissions(patientSubmissions || []);

      setMessage(
        `${foundPatient.full_name}'s records loaded successfully.`
      );
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setSearching(false);
    }
  };

  const openSubmission = (submission) => {
    setSelectedSubmission(submission);
    setAiResult(null);
    setError("");
    setMessage("");
  };

  const generateAIReport = async () => {
    if (!selectedSubmission || !patient) {
      return;
    }

    setError("");
    setMessage("");
    setAiResult(null);

    try {
      setGenerating(true);

      /*
       * IMPORTANT:
       *
       * React does NOT directly run your Keras models.
       *
       * It sends the submission to your Python AI backend.
       */

      const response = await fetch(
        "http://localhost:8000/api/ai/predict",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            submission_id: selectedSubmission.id,
            patient_id: patient.id,
            submission_type:
              selectedSubmission.submission_type,
            file_path:
              selectedSubmission.file_path,
            description:
              selectedSubmission.description,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          "AI server could not process the submission."
        );
      }

      const result = await response.json();

      setAiResult(result);

      setMessage(
        "AI report generated successfully."
      );

    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Unable to generate AI report."
      );
    } finally {
      setGenerating(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const getSubmissionTitle = (type) => {
    if (type === "symptoms") return "Symptoms";
    if (type === "skin_image") return "Skin Image";
    return "Chest X-Ray";
  };

  const getSubmissionIcon = (type) => {
    if (type === "symptoms") return "activity";
    if (type === "skin_image") return "image";
    return "lungs";
  };

  return (
    <div className="doctor-app">

      {/* SIDEBAR */}

      <aside className="doctor-sidebar">

        <div>

          <div className="doctor-logo">

            <div className="doctor-logo-mark">
              +
            </div>

            <div>
              <strong>CLINICAL</strong>
              <span>CDS PLATFORM</span>
            </div>

          </div>

          <div className="doctor-nav-label">
            CLINICAL WORKSPACE
          </div>

          <nav>

            <button className="doctor-nav active">
              <Icon name="grid" />
              Dashboard
            </button>

            <button className="doctor-nav">
              <Icon name="patients" />
              Patients
            </button>

            <button className="doctor-nav">
              <Icon name="file" />
              Medical Records
            </button>

            <button className="doctor-nav">
              <Icon name="ai" />
              AI Reports
            </button>

          </nav>

        </div>

        <div className="doctor-sidebar-bottom">

          <div className="doctor-security">
            <Icon name="shield" size={16} />

            <div>
              <strong>Clinical workspace</strong>
              <span>Secure access enabled</span>
            </div>
          </div>

          <button
            className="doctor-signout"
            onClick={logout}
          >
            <Icon name="logout" size={17} />
            Sign out
          </button>

        </div>

      </aside>


      {/* MAIN */}

      <main className="doctor-main">

        {/* TOPBAR */}

        <header className="doctor-topbar">

          <div>
            <span>Clinical workspace</span>
            <strong>Doctor Dashboard</strong>
          </div>

          <div className="doctor-account">

            <div className="doctor-avatar">
              {doctor?.full_name
                ?.charAt(0)
                ?.toUpperCase() || "D"}
            </div>

            <div>
              <strong>
                {doctor?.full_name || "Doctor"}
              </strong>

              <span>
                Physician
              </span>
            </div>

          </div>

        </header>


        {/* HERO */}

        <section className="doctor-hero">

          <div>

            <span className="doctor-eyebrow">
              PATIENT RECORDS
            </span>

            <h1>
              Clinical overview
            </h1>

            <p>
              Search a patient using their unique Patient ID
              to review submitted health information and
              generate AI-assisted reports.
            </p>

          </div>

          <div className="doctor-ai-status">

            <div className="ai-status-dot" />

            <div>
              <strong>
                AI Analysis Available
              </strong>

              <span>
                3 clinical models connected
              </span>
            </div>

          </div>

        </section>


        {/* SEARCH */}

        <section className="patient-search-card">

          <div className="search-card-heading">

            <div className="search-icon">
              <Icon name="search" size={21} />
            </div>

            <div>
              <span>
                PATIENT LOOKUP
              </span>

              <h2>
                Find patient records
              </h2>
            </div>

          </div>

          <div className="patient-search-form">

            <div className="search-input">

              <span>
                Patient ID
              </span>

              <input
                value={patientCode}
                onChange={(e) =>
                  setPatientCode(e.target.value)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    searchPatient();
                  }
                }}
                placeholder="e.g. PAT-A81F92C3"
              />

            </div>

            <button
              className="search-patient-button"
              onClick={searchPatient}
              disabled={searching}
            >
              <Icon name="search" size={17} />

              {searching
                ? "Searching..."
                : "Search patient"}
            </button>

          </div>

          <p className="search-hint">
            Enter the unique Patient ID provided by the patient.
          </p>

        </section>


        {/* MESSAGES */}

        {message && (
          <div className="doctor-message success">
            ✓ {message}
          </div>
        )}

        {error && (
          <div className="doctor-message error">
            ! {error}
          </div>
        )}


        {/* PATIENT */}

        {patient && (

          <section className="patient-record-section">

            <div className="patient-record-header">

              <div className="patient-record-identity">

                <div className="patient-large-avatar">
                  {patient.full_name
                    ?.charAt(0)
                    ?.toUpperCase()}
                </div>

                <div>

                  <span>
                    PATIENT RECORD
                  </span>

                  <h2>
                    {patient.full_name}
                  </h2>

                  <p>
                    Patient ID:{" "}
                    <strong>
                      {patient.user_code}
                    </strong>
                  </p>

                </div>

              </div>

              <div className="patient-verified">
                <Icon name="shield" size={14} />
                Verified patient
              </div>

            </div>


            {/* SUBMISSIONS */}

            <div className="record-section-title">

              <div>
                <span>
                  MEDICAL SUBMISSIONS
                </span>

                <h3>
                  Submitted health information
                </h3>
              </div>

              <strong>
                {submissions.length} records
              </strong>

            </div>


            <div className="doctor-submissions">

              {submissions.length === 0 ? (

                <div className="no-records">
                  No medical submissions found for this patient.
                </div>

              ) : (

                submissions.map((submission) => (

                  <button
                    className={`doctor-submission ${
                      selectedSubmission?.id ===
                      submission.id
                        ? "selected"
                        : ""
                    }`}
                    key={submission.id}
                    onClick={() =>
                      openSubmission(submission)
                    }
                  >

                    <div className="submission-type-icon">
                      <Icon
                        name={getSubmissionIcon(
                          submission.submission_type
                        )}
                        size={20}
                      />
                    </div>

                    <div className="submission-info">

                      <strong>
                        {getSubmissionTitle(
                          submission.submission_type
                        )}
                      </strong>

                      <span>
                        {submission.file_name ||
                          submission.description ||
                          "Medical submission"}
                      </span>

                    </div>

                    <div className="submission-date">

                      <span>
                        Submitted
                      </span>

                      <time>
                        {new Date(
                          submission.created_at
                        ).toLocaleDateString()}
                      </time>

                    </div>

                    <div className="submission-arrow">
                      →
                    </div>

                  </button>

                ))

              )}

            </div>

          </section>

        )}


        {/* SELECTED SUBMISSION */}

        {selectedSubmission && (

          <section className="clinical-review">

            <div className="review-header">

              <div>

                <span>
                  CLINICAL REVIEW
                </span>

                <h2>
                  {getSubmissionTitle(
                    selectedSubmission.submission_type
                  )}
                </h2>

              </div>

              <div className="review-model">

                <Icon name="ai" size={15} />

                Model ready
              </div>

            </div>


            <div className="review-body">

              {/* SYMPTOMS */}

              {selectedSubmission.submission_type ===
                "symptoms" && (

                <div className="symptom-review">

                  <span>
                    PATIENT DESCRIPTION
                  </span>

                  <div className="symptom-text">
                    {selectedSubmission.description}
                  </div>

                </div>

              )}


              {/* IMAGE */}

              {selectedSubmission.file_path && (

                <div className="image-review">

                  <div className="image-placeholder">

                    <Icon
                      name={getSubmissionIcon(
                        selectedSubmission.submission_type
                      )}
                      size={42}
                    />

                    <span>
                      Medical image selected
                    </span>

                    <small>
                      {selectedSubmission.file_name}
                    </small>

                  </div>

                </div>

              )}


              {/* AI */}

              <div className="ai-action-panel">

                <div className="ai-action-icon">
                  <Icon name="ai" size={22} />
                </div>

                <div className="ai-action-text">

                  <strong>
                    Generate AI clinical report
                  </strong>

                  <span>
                    Run the appropriate trained model against
                    this patient's submission.
                  </span>

                </div>

                <button
                  className="generate-button"
                  onClick={generateAIReport}
                  disabled={generating}
                >

                  <Icon name="ai" size={17} />

                  {generating
                    ? "Analyzing..."
                    : "Generate AI report"}

                </button>

              </div>

            </div>

          </section>

        )}


        {/* AI RESULT */}

        {aiResult && (

          <section className="ai-result-section">

            <div className="ai-result-header">

              <div>

                <span>
                  AI ANALYSIS
                </span>

                <h2>
                  Clinical model result
                </h2>

              </div>

              <div className="ai-generated">
                <Icon name="shield" size={13} />
                AI-assisted
              </div>

            </div>


            <div className="ai-result-content">

              <div className="prediction-main">

                <span>
                  PREDICTED CONDITION
                </span>

                <h1>
                  {aiResult.predicted_disease ||
                    aiResult.prediction ||
                    "Result unavailable"}
                </h1>

                {aiResult.confidence !== undefined && (

                  <div className="confidence">

                    <div className="confidence-top">

                      <span>
                        Model confidence
                      </span>

                      <strong>
                        {(
                          Number(
                            aiResult.confidence
                          ) * 100
                        ).toFixed(1)}
                        %
                      </strong>

                    </div>

                    <div className="confidence-bar">
                      <div
                        style={{
                          width: `${
                            Number(
                              aiResult.confidence
                            ) * 100
                          }%`,
                        }}
                      />
                    </div>

                  </div>

                )}

              </div>


              <div className="model-info">

                <span>
                  MODEL
                </span>

                <strong>
                  {aiResult.model ||
                    aiResult.model_type ||
                    "Clinical AI Model"}
                </strong>

                <small>
                  This result is AI-assisted and should
                  be reviewed by a qualified clinician.
                </small>

              </div>

            </div>

          </section>

        )}


        <footer className="doctor-footer">
          <span>
            Clinical CDS · Physician Workspace
          </span>

          <span>
            AI results are decision-support only.
          </span>
        </footer>

      </main>

    </div>
  );
}

export default DoctorDashboard;