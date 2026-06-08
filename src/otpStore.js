const store = new Map();

const EXPIRY_MS = (parseInt(process.env.OTP_EXPIRY, 10) || 300) * 1000;

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function set(email, data) {
  const entry = {
    otp: generateOtp(),
    expiresAt: Date.now() + EXPIRY_MS,
    name: data.name,
    phone: data.phone,
  };
  store.set(email, entry);
  return entry.otp;
}

function get(email) {
  const entry = store.get(email);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(email);
    return null;
  }
  return entry;
}

function remove(email) {
  store.delete(email);
}

setInterval(() => {
  const now = Date.now();
  for (const [email, entry] of store) {
    if (now > entry.expiresAt) store.delete(email);
  }
}, 60000);

export const otpStore = { set, get, remove };
