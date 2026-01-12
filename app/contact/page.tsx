"use client";

import { useState } from "react";
import PageShell from "@/components/PageShell";

export default function ContactPage() {
  const [reportPublicId, setReportPublicId] = useState("");
  const [reportMessage, setReportMessage] = useState("");

  const [deleteContact, setDeleteContact] = useState("");
  const [deletePublicId, setDeletePublicId] = useState("");
  const [deleteMessage, setDeleteMessage] = useState("");

  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [subscribeEmail, setSubscribeEmail] = useState("");

  function mailto(to: string, subject: string, body: string) {
    const url =
      `mailto:${to}` +
      `?subject=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(body)}`;
    window.location.href = url;
  }

  return (
    <PageShell title="Contact Us">
      <div className="space-y-6">

        {/* REPORT USER */}
        <div className="app-card rounded-2xl p-4 space-y-3">
          <h2 className="text-base font-semibold">🚩 Report a User</h2>
          <p className="text-sm app-text">
            Report fake profiles, abuse, scams, or inappropriate behavior.
            Use the <strong>Public ID</strong> shown on the profile (example: <strong>#000123</strong>).
            Do not share passwords or verification codes.
          </p>

          <input
            value={reportPublicId}
            onChange={(e) => setReportPublicId(e.target.value)}
            placeholder="Public ID (e.g. #000123)"
            className="w-full app-input"
          />

          <textarea
            value={reportMessage}
            onChange={(e) => setReportMessage(e.target.value)}
            placeholder="Describe the issue clearly"
            rows={4}
            className="w-full app-input"
          />

          <button
            onClick={() =>
              mailto(
                "support@datecambodia.app",
                "User Report",
                `Public ID: ${reportPublicId}\n\nIssue:\n${reportMessage}`
              )
            }
            className="w-full app-primary rounded-xl py-2 font-semibold"
          >
            Send Report
          </button>
        </div>

        {/* ACCOUNT / DATA DELETION */}
        <div className="app-card rounded-2xl p-4 space-y-3">
          <h2 className="text-base font-semibold">🔐 Account or Data Deletion</h2>
          <p className="text-sm app-text">
            Request account deletion or personal data removal.
            Requests are reviewed manually for security reasons.
          </p>

          <input
            value={deleteContact}
            onChange={(e) => setDeleteContact(e.target.value)}
            placeholder="Registered email or phone number"
            className="w-full app-input"
          />

          <input
            value={deletePublicId}
            onChange={(e) => setDeletePublicId(e.target.value)}
            placeholder="Public ID (optional)"
            className="w-full app-input"
          />

          <textarea
            value={deleteMessage}
            onChange={(e) => setDeleteMessage(e.target.value)}
            placeholder="Additional details (optional)"
            rows={4}
            className="w-full app-input"
          />

          <button
            onClick={() =>
              mailto(
                "support@datecambodia.app",
                "Account / Data Deletion Request",
                `Contact: ${deleteContact}\nPublic ID: ${deletePublicId}\n\nMessage:\n${deleteMessage}`
              )
            }
            className="w-full app-primary rounded-xl py-2 font-semibold"
          >
            Send Request
          </button>
        </div>

        {/* FEEDBACK */}
        <div className="app-card rounded-2xl p-4 space-y-3">
          <h2 className="text-base font-semibold">💬 Feedback, Bugs & Reviews</h2>
          <p className="text-sm app-text">
            Share feedback, report bugs, or suggest improvements.
          </p>

          <textarea
            value={feedbackMessage}
            onChange={(e) => setFeedbackMessage(e.target.value)}
            placeholder="Write your message here"
            rows={4}
            className="w-full app-input"
          />

          <button
            onClick={() =>
              mailto(
                "help@datecambodia.app",
                "Feedback / Review",
                feedbackMessage
              )
            }
            className="w-full app-primary rounded-xl py-2 font-semibold"
          >
            Send Feedback
          </button>
        </div>

        {/* SUBSCRIBE */}
        <div className="app-card rounded-2xl p-4 space-y-3">
          <h2 className="text-base font-semibold">📬 Stay Updated</h2>
          <p className="text-sm app-text">
            Receive important product updates. No spam. Unsubscribe anytime.
          </p>

          <input
            value={subscribeEmail}
            onChange={(e) => setSubscribeEmail(e.target.value)}
            placeholder="Your email address"
            className="w-full app-input"
          />

          <button
            onClick={() =>
              mailto(
                "subscribe@datecambodia.app",
                "Subscribe",
                `Please add this email to product updates:\n${subscribeEmail}`
              )
            }
            className="w-full app-primary rounded-xl py-2 font-semibold"
          >
            Subscribe
          </button>
        </div>

      </div>
    </PageShell>
  );
}
