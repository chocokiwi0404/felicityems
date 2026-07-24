const nodemailer = require("nodemailer");
const QRCode     = require("qrcode");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER || "46.messenger.64@gmail.com",
    pass: process.env.GMAIL_APP_PASS,
  },
});

// ── Generate QR code as base64 data URL ──────────────────────────────────────
const generateQR = async (text) => {
  try {
    return await QRCode.toDataURL(text, { width: 200, margin: 2 });
  } catch {
    return null;
  }
};

// ── Ticket email (Normal events + Team registration completion) ───────────────
const sendTicketEmail = async ({ registration, user, event }) => {
  const qrData = JSON.stringify({
    ticketId:  registration.ticketId,
    eventId:   event._id,
    userId:    user._id,
  });

  const qrBase64 = await generateQR(qrData);

  // Save QR back to registration (fire and forget, non-blocking)
  try {
    const Registration = require("../models/Registration");
    await Registration.findByIdAndUpdate(registration._id, { qrCode: qrBase64 });
  } catch {}

  const qrImgTag = qrBase64
    ? `<img src="${qrBase64}" alt="QR Code" style="width:160px;height:160px;display:block;margin:16px auto"/>`
    : "";

  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:auto;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:12px">
      <h2 style="color:#6366f1;margin:0 0 8px">🎟 Your Ticket is Confirmed!</h2>
      <p style="color:#94a3b8;margin:0 0 24px">Here are your registration details for <strong style="color:#f1f5f9">${event.eventName}</strong>.</p>

      <div style="background:#1e293b;border-radius:8px;padding:20px;margin-bottom:20px">
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="color:#64748b;padding:6px 0;font-size:13px">Ticket ID</td>
              <td style="color:#818cf8;font-family:monospace;font-weight:bold">${registration.ticketId}</td></tr>
          <tr><td style="color:#64748b;padding:6px 0;font-size:13px">Name</td>
              <td style="color:#f1f5f9">${user.firstName} ${user.lastName}</td></tr>
          <tr><td style="color:#64748b;padding:6px 0;font-size:13px">Email</td>
              <td style="color:#f1f5f9">${user.email}</td></tr>
          <tr><td style="color:#64748b;padding:6px 0;font-size:13px">Event</td>
              <td style="color:#f1f5f9">${event.eventName}</td></tr>
          <tr><td style="color:#64748b;padding:6px 0;font-size:13px">Start Date</td>
              <td style="color:#f1f5f9">${new Date(event.eventStartDate).toLocaleDateString("en-IN", { day:"numeric", month:"long", year:"numeric" })}</td></tr>
          <tr><td style="color:#64748b;padding:6px 0;font-size:13px">Status</td>
              <td style="color:#4ade80;font-weight:bold">✓ Confirmed</td></tr>
        </table>
      </div>

      <p style="color:#94a3b8;font-size:13px;text-align:center">Scan this QR code at the venue for entry:</p>
      ${qrImgTag}
      <p style="color:#475569;font-size:12px;text-align:center;margin-top:24px">
        You can also view this ticket in your Participation History on Felicity.
      </p>
    </div>
  `;

  await transporter.sendMail({
    from:    `"Felicity Events" <${process.env.GMAIL_USER || "46.messenger.64@gmail.com"}>`,
    to:      user.email,
    subject: `🎟 Your ticket for ${event.eventName} — ${registration.ticketId}`,
    html,
  });
};

// ── Merchandise approval email ────────────────────────────────────────────────
const sendMerchandiseApprovedEmail = async ({ registration, user, event }) => {
  const qrData = JSON.stringify({
    ticketId:  registration.ticketId,
    eventId:   event._id,
    userId:    user._id,
    type:      "merchandise",
  });

  const qrBase64 = await generateQR(qrData);

  try {
    const Registration = require("../models/Registration");
    await Registration.findByIdAndUpdate(registration._id, { qrCode: qrBase64 });
  } catch {}

  const variantText = registration.selectedVariant
    ? `${registration.selectedVariant.size || ""} / ${registration.selectedVariant.color || ""}`.trim().replace(/^\/|\/$/g, "")
    : "";

  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:auto;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:12px">
      <h2 style="color:#4ade80;margin:0 0 8px">✅ Payment Approved!</h2>
      <p style="color:#94a3b8;margin:0 0 24px">Your order for <strong style="color:#f1f5f9">${event.eventName}</strong> has been confirmed.</p>

      <div style="background:#1e293b;border-radius:8px;padding:20px;margin-bottom:20px">
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="color:#64748b;padding:6px 0;font-size:13px">Ticket ID</td>
              <td style="color:#818cf8;font-family:monospace;font-weight:bold">${registration.ticketId}</td></tr>
          <tr><td style="color:#64748b;padding:6px 0;font-size:13px">Item</td>
              <td style="color:#f1f5f9">${event.eventName}</td></tr>
          ${variantText ? `<tr><td style="color:#64748b;padding:6px 0;font-size:13px">Variant</td>
              <td style="color:#f1f5f9">${variantText}</td></tr>` : ""}
          <tr><td style="color:#64748b;padding:6px 0;font-size:13px">Qty</td>
              <td style="color:#f1f5f9">${registration.quantity}</td></tr>
          <tr><td style="color:#64748b;padding:6px 0;font-size:13px">Amount</td>
              <td style="color:#f1f5f9">₹${(event.registrationFee || 0) * (registration.quantity || 1)}</td></tr>
          <tr><td style="color:#64748b;padding:6px 0;font-size:13px">Status</td>
              <td style="color:#4ade80;font-weight:bold">✓ Approved</td></tr>
        </table>
      </div>

      <p style="color:#94a3b8;font-size:13px;text-align:center">Show this QR at pickup:</p>
      ${qrBase64 ? `<img src="${qrBase64}" alt="QR Code" style="width:160px;height:160px;display:block;margin:16px auto"/>` : ""}
    </div>
  `;

  await transporter.sendMail({
    from:    `"Felicity Events" <${process.env.GMAIL_USER || "46.messenger.64@gmail.com"}>`,
    to:      user.email,
    subject: `✅ Order confirmed — ${event.eventName} (${registration.ticketId})`,
    html,
  });
};

// ── Team invite email ─────────────────────────────────────────────────────────
const sendTeamInviteEmail = async ({ to, inviteeName, leaderName, teamName, eventName, inviteCode, inviteLink }) => {
  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:auto;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:12px">
      <h2 style="color:#6366f1;margin:0 0 8px">👥 Team Invite</h2>
      <p style="color:#94a3b8;margin:0 0 16px">Hi ${inviteeName}, <strong style="color:#f1f5f9">${leaderName}</strong> has invited you to join their team for <strong style="color:#f1f5f9">${eventName}</strong>.</p>

      <div style="background:#1e293b;border-radius:8px;padding:20px;margin-bottom:20px;text-align:center">
        <p style="color:#64748b;font-size:13px;margin:0 0 8px">Team Name</p>
        <p style="color:#f1f5f9;font-size:1.2rem;font-weight:bold;margin:0 0 16px">${teamName}</p>
        <p style="color:#64748b;font-size:13px;margin:0 0 8px">Invite Code</p>
        <p style="color:#818cf8;font-family:monospace;font-size:1.5rem;font-weight:bold;letter-spacing:4px;margin:0">${inviteCode}</p>
      </div>

      <div style="text-align:center">
        <a href="${inviteLink}" style="display:inline-block;padding:12px 28px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold">
          Accept Invite
        </a>
      </div>
      <p style="color:#475569;font-size:12px;text-align:center;margin-top:16px">
        Or use the invite code on the Teams page in Felicity.
      </p>
    </div>
  `;

  await transporter.sendMail({
    from:    `"Felicity Events" <${process.env.GMAIL_USER || "46.messenger.64@gmail.com"}>`,
    to,
    subject: `👥 You're invited to join team "${teamName}" for ${eventName}`,
    html,
  });
};

module.exports = { sendTicketEmail, sendMerchandiseApprovedEmail, sendTeamInviteEmail, generateQR };