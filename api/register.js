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
const technologyFocuses = new Set([
  "Aerospace",
  "Bioengineering",
  "Communication, Networking and Broadcasting",
  "Components, Circuits, Devices and Systems",
  "Computing and Processing (Hardware/Software)",
  "Engineered Materials, Dielectrics and Plasmas",
  "Fields, Waves and Electromagnetics",
  "General Topics for Engineers (Math, Science and Engineering)",
  "Geoscience",
  "Nuclear Engineering",
  "Photonics and Electro-Optics",
  "Power, Energy and Industry Applications",
  "Robotics and Control Systems",
  "Signal Processing and Analysis",
  "Transportation",
  "Engineering Profession",
  "Other",
]);

function send(res, status, body) {
  res.setHeader("Cache-Control", "no-store");
  return res.status(status).json(body);
}

function getRegistration(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  if (typeof body.referredByMember !== "boolean") return null;

  const values = {
    ieee_account_email: body.ieeeAccountEmail,
    ieee_member_id: body.memberId,
    first_name: body.firstName,
    last_name: body.lastName,
    full_name: `${body.firstName ?? ""} ${body.lastName ?? ""}`.trim(),
    primary_email: body.primaryEmail,
    country_region: body.countryRegion,
    address_line_1: body.addressLine1,
    address_line_2: body.addressLine2,
    address_line_3: body.addressLine3,
    city: body.city,
    state_province: body.stateProvince,
    zip_postal_code: body.zipPostalCode,
    mobile_phone: body.mobilePhone,
    referred_by_member: String(body.referredByMember),
    school_country: body.schoolCountry,
    school_city: body.schoolCity,
    school_name: body.schoolName,
    graduation_date: body.graduationDate,
    technology_focus: body.technologyFocus,
    undergraduate_program_accredited: body.undergradAccredited,
    ulab_id: body.ulabId,
    department: body.department,
    semester: body.semester,
    ulab_mail: body.ulabMail,
    whatsapp: body.whatsapp,
    facebook_url: typeof body.facebook === "string" ? body.facebook : "",
    transaction_id: body.transactionId,
  };

  for (const [key, value] of Object.entries(values)) {
    if (typeof value !== "string") return null;
    values[key] = value.trim();
  }

  const allowedAddressTypes = new Set(["Home", "Work", "University", "Other"]);
  if (
    !Array.isArray(body.addressTypes) ||
    body.addressTypes.length === 0 ||
    body.addressTypes.some((type) => !allowedAddressTypes.has(type))
  ) return null;
  values.address_types = body.addressTypes;

  const normalizedWhatsapp = values.whatsapp.replace(/[\s-]/g, "");
  const normalizedMobilePhone = values.mobile_phone.replace(/[\s()-]/g, "");
  const valid =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.ieee_account_email) &&
    values.ieee_account_email.length <= 254 &&
    /^\S{5,50}$/.test(values.ieee_member_id) &&
    values.first_name.length > 0 && values.first_name.length <= 80 &&
    values.last_name.length > 0 && values.last_name.length <= 80 &&
    values.full_name.length > 1 &&
    values.full_name.length <= 120 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.primary_email) &&
    values.primary_email.length <= 254 &&
    values.country_region.length > 0 && values.country_region.length <= 100 &&
    values.address_line_1.length > 0 && values.address_line_1.length <= 200 &&
    values.address_line_2.length <= 200 && values.address_line_3.length <= 200 &&
    values.city.length > 0 && values.city.length <= 100 &&
    values.state_province.length <= 100 && values.zip_postal_code.length <= 30 &&
    /^\+?\d{10,15}$/.test(normalizedMobilePhone) &&
    typeof values.referred_by_member === "string" &&
    ["true", "false"].includes(values.referred_by_member) &&
    values.school_country.length > 0 && values.school_country.length <= 100 &&
    values.school_city.length > 0 && values.school_city.length <= 100 &&
    values.school_name.length > 0 && values.school_name.length <= 200 &&
    /^\d{4}$/.test(values.graduation_date) &&
    technologyFocuses.has(values.technology_focus) &&
    ["Yes", "No"].includes(values.undergraduate_program_accredited) &&
    /^\d{6,12}$/.test(values.ulab_id) &&
    departments.has(values.department) &&
    semesters.has(values.semester) &&
    /^[^\s@]+@([a-z0-9-]+\.)*ulab\.edu\.bd$/i.test(values.ulab_mail) &&
    /^\+?\d{10,15}$/.test(normalizedWhatsapp) &&
    (!values.facebook_url || /^https?:\/\/(www\.|m\.|web\.)?(facebook|fb)\.com\/.+/i.test(values.facebook_url)) &&
    values.transaction_id.length > 3 &&
    values.transaction_id.length <= 120;

  if (!valid) return null;
  values.whatsapp = normalizedWhatsapp;
  values.mobile_phone = normalizedMobilePhone;
  values.facebook_url = values.facebook_url || null;
  values.referred_by_member = values.referred_by_member === "true";
  values.undergraduate_program_accredited = values.undergraduate_program_accredited === "Yes";
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