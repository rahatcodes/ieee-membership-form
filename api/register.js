const departments = new Set([
  "CSE",
  "EEE",
  "BBA",
  "Bangla",
  "English",
  "Environmental Science",
  "International Relations",
]);
const semesters = new Set([
  "1st",
  "2nd",
  "3rd",
  "4th",
  "5th",
  "6th",
  "7th",
  "8th",
  "9th",
  "10th",
  "11th",
  "12th",
]);

function send(res, status, body) {
  res.setHeader("Cache-Control", "no-store");
  return res.status(status).json(body);
}

function getRegistration(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;

  const values = {
    ieee_account_email: body.ieeeAccountEmail,
    ieee_member_id: body.memberId,
    full_name: body.fullName,
    ulab_id: body.ulabId,
    department: body.department,
    semester: body.semester,
    ulab_mail: body.ulabMail,
    whatsapp: body.whatsapp,
    facebook_url: body.facebook,
    transaction_id: body.transactionId,
  };

  for (const [key, value] of Object.entries(values)) {
    if (typeof value !== "string") return null;
    values[key] = value.trim();
  }

  const normalizedWhatsapp = values.whatsapp.replace(/[\s-]/g, "");
  const valid =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.ieee_account_email) &&
    values.ieee_account_email.length <= 254 &&
    /^[A-Za-z0-9]{5,15}$/.test(values.ieee_member_id) &&
    values.full_name.length > 1 &&
    values.full_name.length <= 120 &&
    /^\d{6,12}$/.test(values.ulab_id) &&
    departments.has(values.department) &&
    semesters.has(values.semester) &&
    /^[^\s@]+@([a-z0-9-]+\.)*ulab\.edu\.bd$/i.test(values.ulab_mail) &&
    /^\+?\d{10,15}$/.test(normalizedWhatsapp) &&
    /^https?:\/\/(www\.|m\.|web\.)?(facebook|fb)\.com\/.+/i.test(values.facebook_url) &&
    values.transaction_id.length > 3 &&
    values.transaction_id.length <= 120;

  if (!valid) return null;
  values.whatsapp = normalizedWhatsapp;
  return values;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return send(res, 405, { error: "Method not allowed." });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return send(res, 400, { error: "Invalid request body." });
    }
  }

  const registration = getRegistration(body);
  if (!registration) return send(res, 400, { error: "Please check the registration details and try again." });

  const supabaseUrl = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !secretKey) {
    return send(res, 500, { error: "Registration is not configured yet. Please contact the branch." });
  }

  try {
    const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/ieee_member_registrations`, {
      method: "POST",
      headers: {
        apikey: secretKey,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(registration),
    });

    if (response.status === 409) {
      return send(res, 409, { error: "This IEEE member ID is already registered." });
    }
    if (!response.ok) {
      return send(res, 502, { error: "We could not save your registration. Please try again." });
    }

    return send(res, 201, { ok: true });
  } catch {
    return send(res, 502, { error: "We could not reach the registration service. Please try again." });
  }
}