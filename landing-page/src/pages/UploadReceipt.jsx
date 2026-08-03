import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import jsPDF from "jspdf";
import {
  HiOutlineEnvelope,
  HiOutlineCloudArrowUp,
  HiOutlineDocumentText,
  HiOutlineXMark,
  HiOutlineSparkles,
  HiOutlineCheckCircle,
} from "react-icons/hi2";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { useClaims } from "../hooks/useClaims";
import { useEmployees } from "../hooks/useEmployees";
import { getSessionClaims, addSessionClaim } from "../utils/sessionClaims";
import { formatUsd, formatDate } from "../utils/format";

// No OCR or model call runs here - this is a simulated extraction for the
// demo. Categories match the ones the real policy engine actually supports.
const MOCK_EXTRACTIONS = [
  { vendor: "Olive Garden", category: "meals", amountRange: [18, 72] },
  { vendor: "The Capital Grille", category: "meals", amountRange: [35, 75] },
  { vendor: "Compass Cafe", category: "meals", amountRange: [12, 45] },
  { vendor: "Marriott Downtown", category: "lodging", amountRange: [180, 250] },
  { vendor: "Hilton Garden Inn", category: "lodging", amountRange: [150, 240] },
  { vendor: "Yellow Cab Co.", category: "ground_transport", amountRange: [15, 65] },
  { vendor: "Uber", category: "ground_transport", amountRange: [12, 55] },
  { vendor: "Staples", category: "office_supplies", amountRange: [25, 180] },
  { vendor: "Office Depot", category: "office_supplies", amountRange: [30, 190] },
];

const CATEGORY_LABELS = {
  meals: "Meals",
  lodging: "Lodging",
  ground_transport: "Ground Transport",
  office_supplies: "Office Supplies",
};

const PROCESSING_STEPS = [
  "Reading your receipt...",
  "Extracting vendor and amount...",
  "Classifying expense category...",
  "Finalizing claim record...",
];

const STEP_DURATION = 450;

export default function UploadReceipt() {
  const currentUser = useCurrentUser();
  const claims = useClaims();
  const employees = useEmployees();
  const navigate = useNavigate();

  const [stage, setStage] = useState("idle"); // idle | processing | done
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [processingStepIndex, setProcessingStepIndex] = useState(0);
  const [result, setResult] = useState(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    if (stage !== "processing") return undefined;

    setProcessingStepIndex(0);
    const stepInterval = setInterval(() => {
      setProcessingStepIndex((i) => Math.min(i + 1, PROCESSING_STEPS.length - 1));
    }, STEP_DURATION);

    const finishTimeout = setTimeout(() => {
      clearInterval(stepInterval);
      finalizeClaim();
    }, STEP_DURATION * PROCESSING_STEPS.length + 200);

    return () => {
      clearInterval(stepInterval);
      clearTimeout(finishTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  if (!currentUser) {
    return null;
  }

  function validateAndSetFile(candidate) {
    if (!candidate) return;
    const isPdf =
      candidate.type === "application/pdf" || candidate.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setFileError("Please upload a PDF file.");
      return;
    }
    setFileError("");
    setFile(candidate);
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    validateAndSetFile(e.dataTransfer.files?.[0]);
  }

  function handleFileChange(e) {
    validateAndSetFile(e.target.files?.[0]);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!file) {
      setFileError("Choose a receipt PDF first.");
      return;
    }
    setStage("processing");
  }

  function finalizeClaim() {
    const picked = MOCK_EXTRACTIONS[Math.floor(Math.random() * MOCK_EXTRACTIONS.length)];
    const amount = Number(
      (picked.amountRange[0] + Math.random() * (picked.amountRange[1] - picked.amountRange[0])).toFixed(2)
    );
    const today = new Date().toISOString().slice(0, 10);
    const nextNumber = claims.length + getSessionClaims().length + 1;
    const receiptId = `RCPT-${String(nextNumber).padStart(3, "0")}`;

    const filenameEmployeeMatch = file.name.match(/E\d{3}/);
    const filenameEmployeeId = filenameEmployeeMatch ? filenameEmployeeMatch[0] : null;
    const filenameEmployee = filenameEmployeeId
      ? employees.find((e) => e.employee_id === filenameEmployeeId)
      : null;
    // No match found at all is NOT treated as verified - an unrelated PDF with no
    // employee ID in its filename should still be flagged, not silently pass through.
    const emailVerified =
      !!filenameEmployee &&
      filenameEmployee.email.toLowerCase() === currentUser.email.toLowerCase();

    const newClaim = {
      receipt_id: receiptId,
      vendor: picked.vendor,
      date: today,
      amount,
      currency: "USD",
      amount_usd: amount,
      category: picked.category,
      employee_id: currentUser.employee_id,
      employee_name: currentUser.name,
      routed_status: "processing",
      decision: null,
      risk_score: null,
      policy_compliant: null,
      summary: "Submitted just now - this claim hasn't reached policy validation or routing yet.",
      file_name: file.name,
      uploaded_at: new Date().toISOString(),
      emailVerified,
    };

    addSessionClaim(newClaim);
    setResult(newClaim);
    setStage("done");
  }

  function resetForm() {
    setFile(null);
    setFileError("");
    setResult(null);
    setStage("idle");
  }

  function handleDownloadStatement() {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Reimbursement Statement", 20, 20);

    doc.setFontSize(11);
    doc.text("AI-Driven Expense Reimbursement Automation — Meridian Corp", 20, 28);

    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString("en-US")}`, 20, 34);

    doc.setFontSize(12);
    doc.text("Employee", 20, 48);
    doc.setFontSize(10);
    doc.text(`Name: ${currentUser.name}`, 20, 55);
    doc.text(`Employee ID: ${currentUser.employee_id}`, 20, 61);
    doc.text(`Department: ${currentUser.department || "Unassigned"}`, 20, 67);

    doc.setFontSize(12);
    doc.text("Claim Details", 20, 81);
    doc.setFontSize(10);
    const fields = [
      ["Receipt ID", result.receipt_id],
      ["Vendor", result.vendor],
      ["Date", formatDate(result.date)],
      ["Category", CATEGORY_LABELS[result.category] || result.category],
      ["Amount", formatUsd(result.amount)],
      ["Status", "Processing"],
    ];
    let y = 88;
    for (const [label, value] of fields) {
      doc.text(`${label}:`, 20, y);
      doc.text(String(value), 70, y);
      y += 7;
    }

    doc.setFontSize(9);
    doc.text(
      doc.splitTextToSize(
        "This claim is newly submitted and has not yet gone through policy validation " +
          "or routing. This statement reflects its status at the time of download.",
        170
      ),
      20,
      y + 8
    );

    doc.save(`Reimbursement_Statement_${result.receipt_id}.pdf`);
  }

  return (
    <div className="upload-page">
      <div className="dashboard-header">
        <h1>Upload Receipt</h1>
        <p className="section-sub">
          Submit a receipt and this pipeline will extract, validate, and route it -
          simulated here for the demo, but the same shape as the real thing.
        </p>
      </div>

      <motion.div
        className="card upload-card"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <AnimatePresence mode="wait">
          {stage === "idle" && (
            <motion.form
              key="idle"
              onSubmit={handleSubmit}
              className="auth-form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <label>
                Official Email
                <div className="input-with-icon">
                  <HiOutlineEnvelope size={18} />
                  <input type="email" value={currentUser.email} readOnly />
                </div>
              </label>

              <label>
                Receipt (PDF)
                <div
                  className={`upload-dropzone${isDragging ? " upload-dropzone-active" : ""}${
                    file ? " upload-dropzone-filled" : ""
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    className="upload-input-hidden"
                    onChange={handleFileChange}
                  />
                  {file ? (
                    <div className="upload-file-preview">
                      <HiOutlineDocumentText size={30} />
                      <div className="upload-file-meta">
                        <span className="upload-file-name">{file.name}</span>
                        <span className="upload-file-size">
                          {(file.size / 1024).toFixed(0)} KB
                        </span>
                      </div>
                      <button
                        type="button"
                        className="chat-icon-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                        }}
                        aria-label="Remove file"
                      >
                        <HiOutlineXMark size={16} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <HiOutlineCloudArrowUp size={34} />
                      <p>Drag and drop your receipt PDF here, or click to browse.</p>
                      <span className="upload-dropzone-hint">PDF only</span>
                    </>
                  )}
                </div>
              </label>

              {fileError && <p className="auth-error">{fileError}</p>}

              <button type="submit" className="btn btn-primary auth-submit">
                Process Receipt
              </button>
            </motion.form>
          )}

          {stage === "processing" && (
            <motion.div
              key="processing"
              className="upload-processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <motion.div
                className="upload-spinner"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <HiOutlineSparkles size={30} />
              </motion.div>
              <h2>Processing your receipt&hellip;</h2>
              <p className="section-sub">{PROCESSING_STEPS[processingStepIndex]}</p>
            </motion.div>
          )}

          {stage === "done" && result && (
            <motion.div
              key="done"
              className="upload-result"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                className="upload-result-icon"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
              >
                <HiOutlineCheckCircle size={40} />
              </motion.div>
              <h2>Claim submitted</h2>
              <p className="section-sub">
                Added to your claims as <strong>{result.receipt_id}</strong> with status{" "}
                <span className="badge badge-neutral">Processing</span>
              </p>

              {!result.emailVerified && <p className="fake-invoice-alert">FAKE INVOICE</p>}

              {result.emailVerified && (
                <div className="upload-extracted-grid">
                  <div className="upload-extracted-item">
                    <span className="upload-extracted-label">Vendor</span>
                    <span className="upload-extracted-value">{result.vendor}</span>
                  </div>
                  <div className="upload-extracted-item">
                    <span className="upload-extracted-label">Amount</span>
                    <span className="upload-extracted-value">{formatUsd(result.amount)}</span>
                  </div>
                  <div className="upload-extracted-item">
                    <span className="upload-extracted-label">Category</span>
                    <span className="upload-extracted-value">
                      {CATEGORY_LABELS[result.category]}
                    </span>
                  </div>
                  <div className="upload-extracted-item">
                    <span className="upload-extracted-label">Date</span>
                    <span className="upload-extracted-value">{formatDate(result.date)}</span>
                  </div>
                </div>
              )}

              <p className="auth-note">
                This is a simulated extraction for the demo - no OCR or model call
                actually ran against your file. It's tagged to employee{" "}
                {currentUser.employee_id} and will appear in your personal claims view
                once that's built.
              </p>

              <div className="auth-actions-row">
                <button type="button" className="btn btn-primary auth-submit" onClick={resetForm}>
                  Upload another
                </button>
                <Link to="/dashboard" className="btn btn-ghost auth-submit">
                  Back to dashboard
                </Link>
                {result.emailVerified && (
                  <button
                    type="button"
                    className="btn btn-ghost auth-submit"
                    onClick={handleDownloadStatement}
                  >
                    Download Reimbursement Statement
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
