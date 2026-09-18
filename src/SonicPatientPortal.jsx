import { useEffect, useMemo, useState } from "react";
import "./SonicPatientPortal.css";

const services = [
  "Imaging & radiology",
  "2D echocardiography",
  "3D & 4D Doppler imaging",
  "Renal Doppler",
  "Prenatal screening",
  "Laboratory tests",
];

const serviceHighlights = [
  {
    eyebrow: "Imaging services",
    title: "Scans and Doppler enquiries",
    text: "Understand what to confirm before your visit, including availability, preparation and records.",
    image: "/concepts/sonic/imaging-doppler.svg",
    alt: "Diagnostic professional explaining imaging equipment to a patient",
  },
  {
    eyebrow: "Laboratory services",
    title: "Routine test enquiries",
    text: "Ask about available laboratory tests and receive centre-confirmed preparation guidance.",
    image: "/concepts/sonic/laboratory-testing.svg",
    alt: "Laboratory professional preparing diagnostic samples",
  },
  {
    eyebrow: "Proposed convenience service",
    title: "Home collection requests",
    text: "Request a preferred date, then let the centre confirm eligibility, area and availability.",
    image: "/concepts/sonic/home-sample-collection.svg",
    alt: "Healthcare professional discussing home sample collection with a family",
  },
];

const directions = "https://www.google.com/maps/search/?api=1&query=Sonic+Diagnostics+Kolariya+Pride+Towers+Naimnagar+Hanamkonda";
const sessionKey = "sonic-portal-demo-session";
const appointmentKey = "sonic-portal-demo-appointment";

function formatDate(value) {
  if (!value) return "Date not selected";
  return new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "long", year: "numeric" }).format(new Date(`${value}T12:00:00`));
}

function Logo() {
  return <span className="portal-logo"><i aria-hidden="true"><b /></i><span>SONIC <small>DIAGNOSTICS</small></span></span>;
}

function Login({ onSignedIn }) {
  const [method, setMethod] = useState("phone");
  const [stage, setStage] = useState("identity");
  const [identity, setIdentity] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  function requestCode(event) {
    event.preventDefault();
    const valid = method === "phone" ? /^[0-9+() -]{10,18}$/.test(identity.trim()) : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identity.trim());
    if (!valid) {
      setError(method === "phone" ? "Enter a valid mobile number." : "Enter a valid email address.");
      return;
    }
    setError("");
    setStage("verify");
  }

  function verifyCode(event) {
    event.preventDefault();
    if (code !== "246810") {
      setError("Use the demonstration code 246810.");
      return;
    }
    const session = { method, identity: identity.trim() };
    localStorage.setItem(sessionKey, JSON.stringify(session));
    onSignedIn(session);
  }

  return <div className="portal-login-page">
    <div className="portal-concept-strip"><a href="/">VNS<span>.</span></a><p><b>New concept · Patient portal edition</b><span>Independent demonstration · Not the official website</span></p><a href="/concepts/sonic-diagnostics">Compare original ↗</a></div>
    <main className="portal-login-shell">
      <section className="portal-login-copy">
        <p className="portal-eyebrow">Sonic Diagnostics · Hanamkonda</p>
        <h1>A calmer way to <em>plan your visit.</em></h1>
        <p>Sign in to request a preferred appointment, keep a simple reminder and find the centre when you need it.</p>
        <ul><li>Choose a future date and time</li><li>Save a printable appointment reminder</li><li>Call or open directions in one tap</li></ul>
      </section>
      <section className="portal-login-card" aria-labelledby="portal-login-title">
        <Logo />
        <div className="portal-login-heading"><p className="portal-eyebrow">Patient access</p><h2 id="portal-login-title">{stage === "identity" ? "Welcome" : "Check your code"}</h2><p>{stage === "identity" ? "Choose a sign-in method to continue." : `A demonstration code is ready for ${identity}.`}</p></div>
        {stage === "identity" ? <form onSubmit={requestCode}>
          <div className="portal-tabs" role="group" aria-label="Sign-in method"><button type="button" className={method === "phone" ? "active" : ""} onClick={() => { setMethod("phone"); setIdentity(""); setError(""); }}>Mobile number</button><button type="button" className={method === "email" ? "active" : ""} onClick={() => { setMethod("email"); setIdentity(""); setError(""); }}>Email</button></div>
          <label>{method === "phone" ? "Mobile number" : "Email address"}<input required value={identity} onChange={event => setIdentity(event.target.value)} type={method === "phone" ? "tel" : "email"} inputMode={method === "phone" ? "tel" : "email"} autoComplete={method === "phone" ? "tel" : "email"} placeholder={method === "phone" ? "+91 98765 43210" : "you@example.com"} /></label>
          {error && <p className="portal-error" role="alert">{error}</p>}
          <button className="portal-primary" type="submit">Continue securely <span>→</span></button>
        </form> : <form onSubmit={verifyCode}>
          <div className="portal-demo-code"><span>Demonstration code</span><strong>246810</strong></div>
          <label>Enter six-digit code<input required value={code} onChange={event => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="••••••" /></label>
          {error && <p className="portal-error" role="alert">{error}</p>}
          <button className="portal-primary" type="submit">Sign in <span>→</span></button>
          <button className="portal-text-button" type="button" onClick={() => { setStage("identity"); setCode(""); setError(""); }}>Use a different {method === "phone" ? "number" : "email"}</button>
        </form>}
        <small>This portfolio demonstration stores data only in this browser. It does not send an SMS, create a medical account or collect reports.</small>
      </section>
    </main>
  </div>;
}

function Menu({ open, onClose, onSignOut }) {
  return <div className={`portal-menu ${open ? "open" : ""}`} aria-hidden={!open}>
    <p>Quick navigation</p>
    <a href="#portal-top" onClick={onClose}><span>⌂</span>Home</a>
    <a href="#portal-services" onClick={onClose}><span>＋</span>Services</a>
    <a href="#portal-book" onClick={onClose}><span>▣</span>Appointment</a>
    <a href="#portal-visit" onClick={onClose}><span>⌖</span>Location</a>
    <button type="button" onClick={onSignOut}><span>↗</span>Sign out</button>
  </div>;
}

function Reminder({ appointment, onClear }) {
  if (!appointment) return null;
  return <section className="portal-reminder" id="portal-reminder" aria-labelledby="portal-reminder-title">
    <div className="portal-reminder-mark" aria-hidden="true">✓</div>
    <div><p className="portal-eyebrow">Saved reminder</p><h2 id="portal-reminder-title">Your visit plan is ready.</h2><p>This is a personal reminder only. The diagnostic centre still needs to confirm availability.</p></div>
    <dl><div><dt>Patient</dt><dd>{appointment.name}</dd></div><div><dt>Service</dt><dd>{appointment.service}</dd></div><div><dt>Date</dt><dd>{formatDate(appointment.date)}</dd></div><div><dt>Preferred time</dt><dd>{appointment.time}</dd></div><div><dt>Visit type</dt><dd>{appointment.visit}</dd></div></dl>
    <div className="portal-reminder-actions"><button className="portal-primary" type="button" onClick={() => window.print()}>Print reminder <span>↗</span></button><a className="portal-secondary" href="tel:+918128613278">Call to confirm</a><button className="portal-text-button" type="button" onClick={onClear}>Remove reminder</button></div>
    <small>Do not use this reminder as proof of a confirmed medical appointment.</small>
  </section>;
}

export default function SonicPatientPortal() {
  const [session, setSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem(sessionKey)); } catch { return null; }
  });
  const [appointment, setAppointment] = useState(() => {
    try { return JSON.parse(localStorage.getItem(appointmentKey)); } catch { return null; }
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  useEffect(() => {
    function closeMenu(event) {
      if (!event.target.closest(".portal-menu-wrap")) setMenuOpen(false);
    }
    document.addEventListener("click", closeMenu);
    return () => document.removeEventListener("click", closeMenu);
  }, []);

  function signOut() {
    localStorage.removeItem(sessionKey);
    setSession(null);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function saveAppointment(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    localStorage.setItem(appointmentKey, JSON.stringify(data));
    setAppointment(data);
    window.setTimeout(() => document.querySelector("#portal-reminder")?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
  }

  function clearAppointment() {
    localStorage.removeItem(appointmentKey);
    setAppointment(null);
  }

  if (!session) return <Login onSignedIn={setSession} />;

  const displayIdentity = session.identity.length > 28 ? `${session.identity.slice(0, 25)}…` : session.identity;

  return <div className="sonic-portal">
    <div className="portal-concept-strip"><a href="/">VNS<span>.</span></a><p><b>New concept · Patient portal edition</b><span>Independent demonstration · Original remains unchanged</span></p><a href="/concepts/sonic-diagnostics">Compare original ↗</a></div>
    <header className="portal-header">
      <a href="#portal-top" aria-label="Sonic Diagnostics portal home"><Logo /></a>
      <div className="portal-header-actions"><span title={session.identity}>{displayIdentity}</span><div className="portal-menu-wrap"><button className="portal-menu-trigger" type="button" aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen(current => !current)}><i /><i /><i /></button><Menu open={menuOpen} onClose={() => setMenuOpen(false)} onSignOut={signOut} /></div></div>
    </header>

    <main id="portal-top">
      <section className="portal-hero">
        <div className="portal-hero-copy"><p className="portal-eyebrow">Patient visit planner</p><h1>Everything for your visit, <em>kept clear.</em></h1><p>Explore services, choose a preferred appointment and keep a simple reminder in one calm, mobile-friendly place.</p><div className="portal-hero-actions"><a className="portal-primary" href="#portal-book">Plan an appointment <span>→</span></a><a className="portal-secondary" href="tel:+918128613278">Call 08128 613278</a></div><div className="portal-facts"><span><b>Monday–Saturday</b>9:00 AM–9:00 PM</span><span><b>Convenient location</b>Near Old RTO Office</span></div></div>
        <aside className="portal-book-card" id="portal-book"><div><p className="portal-eyebrow">Appointment reminder</p><h2>Choose a time that suits you.</h2><p>Save a request locally, then call the centre to confirm.</p></div><form onSubmit={saveAppointment}><label>Full name<input required name="name" autoComplete="name" placeholder="Your name" defaultValue={appointment?.name || ""} /></label><label>Mobile number<input required name="phone" type="tel" inputMode="tel" autoComplete="tel" pattern="[0-9+() -]{10,18}" placeholder="+91 98765 43210" defaultValue={appointment?.phone || (session.method === "phone" ? session.identity : "")} /></label><label>Service<select required name="service" defaultValue={appointment?.service || ""}><option value="" disabled>Select a service</option>{services.map(service => <option key={service}>{service}</option>)}</select></label><label>Preferred date<input required name="date" type="date" min={today} defaultValue={appointment?.date || ""} /></label><label>Preferred time<input required name="time" type="time" defaultValue={appointment?.time || ""} /></label><label>Visit type<select required name="visit" defaultValue={appointment?.visit || "Centre visit"}><option>Centre visit</option><option>Ask about home collection</option></select></label><button className="portal-primary" type="submit">Save reminder <span>→</span></button><small>No information is sent. This demonstration saves the reminder only in your browser.</small></form></aside>
      </section>

      <Reminder appointment={appointment} onClear={clearAppointment} />

      <section className="portal-services" id="portal-services"><div className="portal-section-heading"><div><p className="portal-eyebrow">Explore services</p><h2>Know where to start.</h2></div><p>Clear, patient-friendly explanations with a direct path to request a preferred visit or contact the centre.</p></div><div className="portal-service-grid">{serviceHighlights.map(item => <article key={item.title}><figure><img src={item.image} alt={item.alt} width="1200" height="900" loading="lazy" /></figure><div><p className="portal-eyebrow">{item.eyebrow}</p><h3>{item.title}</h3><p>{item.text}</p><a href="#portal-book">Plan a visit <span>→</span></a></div></article>)}</div></section>

      <section className="portal-home"><figure><img src="/concepts/sonic/home-sample-collection.svg" alt="Healthcare professional discussing home collection with a patient and family member" width="1400" height="934" loading="lazy" /><figcaption>Proposed home collection service</figcaption></figure><div><p className="portal-eyebrow">Care beyond the centre</p><h2>Request collection from home.</h2><p>For suitable laboratory tests, patients could share a preferred date and receive confirmation about eligibility, preparation and service area.</p><ol><li><span>01</span><div><b>Send a request</b><p>Choose a test, date and preferred time.</p></div></li><li><span>02</span><div><b>Receive confirmation</b><p>The centre confirms whether home collection is available.</p></div></li><li><span>03</span><div><b>Keep your reminder</b><p>Print or save the visit information for easy reference.</p></div></li></ol><a className="portal-primary" href="#portal-book">Request home collection <span>→</span></a><small>Concept feature only. The centre must approve and operate this service before launch.</small></div></section>

      <section className="portal-visit" id="portal-visit"><div><p className="portal-eyebrow">Visit Sonic Diagnostics</p><h2>Easy to find.<br />Simple to call.</h2></div><div><address>H.No. 5-11-471, Kolariya Pride Towers,<br />Near Old RTO Office, Naimnagar,<br />Hanamkonda, Warangal – 506001, Telangana.</address><div className="portal-hours"><span><b>Monday–Saturday</b>9:00 AM–9:00 PM</span><span><b>Sunday</b>Closed</span></div><div className="portal-visit-actions"><a className="portal-light-button" href={directions} target="_blank" rel="noreferrer">Open Google Maps <span>↗</span></a><a className="portal-outline-light" href="tel:+918128613278">Call the centre</a></div></div></section>

      <section className="portal-disclaimer"><p className="portal-eyebrow">Independent concept project</p><h2>A patient portal designed for clarity—not medical advice.</h2><p>This VNS Solutions demonstration uses publicly listed information and fictional sign-in behaviour. Services, appointments, home collection and patient authentication require Sonic Diagnostics’ approval and a secure production backend before official use.</p></section>
    </main>
    <footer className="portal-footer"><span>Concept Project · Not client work · No real patient account is created</span><a href="/">Return to VNS Solutions ↑</a></footer>
  </div>;
}

