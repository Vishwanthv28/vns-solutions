import { useEffect, useState } from "react";
import { brand, faqs, services, work } from "./siteData";

const Icon = ({ name }) => <span aria-hidden="true" className={`icon icon-${name}`} />;

function ThemeButton({ theme, onClick }) {
  return <button className="theme-toggle" type="button" onClick={onClick} aria-label="Toggle colour theme">
    <span className="theme-track"><span className="theme-knob">{theme === "dark" ? "☾" : "☀"}</span></span>
    <span className="theme-label">{theme === "dark" ? "Dark" : "Light"}</span>
  </button>;
}

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem("vns-theme") || "light");
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const [sent, setSent] = useState(false);

  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem("vns-theme", theme); }, [theme]);
  const messageLink = brand.whatsapp ? `https://wa.me/${brand.whatsapp}?text=${encodeURIComponent("Hi VNS Solutions, I would like to discuss a project.")}` : `mailto:${brand.email}?subject=${encodeURIComponent("Project enquiry for VNS Solutions")}`;

  function handleSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const subject = `New website enquiry from ${form.get("name")}`;
    const body = `Name: ${form.get("name")}\nEmail: ${form.get("email")}\nMobile / WhatsApp: ${form.get("phone")}\nBusiness: ${form.get("business")}\n\nProject details:\n${form.get("message")}`;
    const gmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(brand.email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = gmailComposeUrl;
    setSent(true);
  }

  return <>
    <header className="nav-shell">
      <nav className="nav page-width" aria-label="Main navigation">
        <a className="logo" href="#top" aria-label="VNS Solutions home"><span>V</span>NS<span className="dot">.</span><small className="logo-by">— Vishwanth</small></a>
        <div className={`nav-links ${menuOpen ? "open" : ""}`}>
          <a href="#work" onClick={() => setMenuOpen(false)}>Work</a><a href="#process" onClick={() => setMenuOpen(false)}>Process</a><a href="#services" onClick={() => setMenuOpen(false)}>Services</a><a href="#industries" onClick={() => setMenuOpen(false)}>Industries</a><a href="#faq" onClick={() => setMenuOpen(false)}>FAQ</a>
        </div>
        <div className="nav-actions"><ThemeButton theme={theme} onClick={() => setTheme(theme === "light" ? "dark" : "light")} /><a className="button button-small" href="#contact">Book a discovery <span>→</span></a><button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Open navigation">{menuOpen ? "×" : "☰"}</button></div>
      </nav>
    </header>

    <main id="top">
      <section className="hero page-width">
        <div className="hero-copy">
          <p className="eyebrow"><span className="live-dot" /> Digital growth studio · India</p>
          <h1>A digital presence that feels <em>like your business.</em></h1>
          <p className="hero-text">VNS Solutions creates thoughtful websites and practical automations for businesses that want to be trusted before the first conversation.</p>
          <div className="hero-actions"><a className="button" href="#contact">Start a conversation <span>→</span></a><a className="text-link" href="#work">See selected work <span>↘</span></a></div>
          <p className="hero-proof">Direct communication · Clear scope · Your website stays yours</p>
          <p className="hero-human"><b>Small studio. Focused attention.</b> I work directly with each business—from the first conversation to the final launch.</p>
          <a className="scroll-cue" href="#services"><span aria-hidden="true" /> Scroll to explore</a>
        </div>
        <div className="hero-art editorial-hero" aria-label="VNS Solutions brand statement" role="img">
          <div className="hero-wordmark" aria-hidden="true"><span>VNS</span><span>VNS</span><span>VNS</span></div>
          <div className="hero-stamp"><span className="mini-label">VNS SOLUTIONS · VISHWANTH</span><b>Quietly distinct.<br />Built to be useful.</b></div>
          <div className="hero-note"><span>01</span><p>Strategy, design and build—made for the people you want to reach.</p></div>
        </div>
      </section>

      <section className="marquee" aria-label="Industries VNS Solutions serves"><div className="marquee-track"><div className="marquee-group"><span>Restaurants</span><i>✦</i><span>Clinics</span><i>✦</i><span>Gyms</span><i>✦</i><span>Salons</span><i>✦</i><span>Real estate</span><i>✦</i><span>Boutiques</span><i>✦</i><span>Builders</span><i>✦</i><span>Hotels</span><i>✦</i></div><div className="marquee-group" aria-hidden="true"><span>Restaurants</span><i>✦</i><span>Clinics</span><i>✦</i><span>Gyms</span><i>✦</i><span>Salons</span><i>✦</i><span>Real estate</span><i>✦</i><span>Boutiques</span><i>✦</i><span>Builders</span><i>✦</i><span>Hotels</span><i>✦</i></div></div></section>

      <section className="section industries-section page-width" id="industries"><p className="eyebrow">Industries</p><div className="section-heading"><h2>Made for businesses that want to look <em>as good online</em> as they do in person.</h2><p>We tailor the message, booking or enquiry path and follow-up around how your customers actually choose.</p></div><div className="industry-grid">{[["01", "Restaurants", "Menus, reservations, catering enquiries and Google-first discovery."], ["02", "Clinics", "Clear services, appointments and credibility for every first-time visitor."], ["03", "Gyms", "Membership, consultation and enquiry journeys that are easy on mobile."], ["04", "Salons", "Service menus, stylist profiles and friction-free booking paths."], ["05", "Real estate", "Project showcases and qualified enquiries without missed follow-up."], ["06", "Boutiques", "A distinctive brand presence that moves visitors towards an order or visit."], ["07", "Builders", "Project details, location highlights and quote requests for serious buyers."], ["08", "Hotels", "Stay enquiries, room highlights and a more confident first impression."], ["09", "Studios", "Portfolio-led websites for photographers, architects, consultants and creators."]].map(([number, title, text]) => <article className="industry-card" key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></article>)}</div></section>

      <section className="section page-width solve"><p className="eyebrow">What we solve</p><div className="section-heading"><h2>Your website should make the next step <em>obvious.</em></h2><p>Local businesses do not need more features. They need a clear online presence that answers questions and makes it easy to enquire, book, or order.</p></div><div className="solve-grid"><article><span>01</span><h3>Hard to find online</h3><p>Clear pages and local-search foundations help nearby customers discover your business.</p></article><article><span>02</span><h3>Looks like everyone else</h3><p>A tailored visual system makes your business feel distinct, credible and ready to choose.</p></article><article><span>03</span><h3>Enquiries get missed</h3><p>Simple forms, email routing and optional automation keep important conversations moving.</p></article><article><span>04</span><h3>No clear next step</h3><p>Every page is built around a useful action: enquire, book, order or request a quote.</p></article></div></section>

      <section className="section page-width" id="services"><p className="eyebrow">What we do</p><div className="section-heading"><h2>Digital work with a <em>human point of view.</em></h2><p>Each project starts with the customer action that matters to you. Then we build only what supports it.</p></div>
        <div className="service-grid">{services.map((service) => <article className="service-card" key={service.number}><span className="service-number">{service.number}</span><h3>{service.title}</h3><p>{service.text}</p><div className="tag-row">{service.tags.map(tag => <span key={tag}>{tag}</span>)}</div></article>)}</div>
      </section>

      <section className="section surface-section" id="work"><div className="page-width"><p className="eyebrow">Selected capabilities</p><div className="section-heading"><h2>Useful technology, built around real work.</h2><p>Show only completed projects or demos you can confidently explain. Add live links and outcomes as your portfolio grows.</p></div>
        <div className="work-grid">{work.map((project, index) => <article className={`work-card work-${index + 1}`} key={project.title}><div className="work-visual"><span>{String(index + 1).padStart(2, "0")}</span><div className="visual-line" /><div className="visual-orb" /></div><p className="work-type">{project.type}</p><h3>{project.title}</h3><p>{project.text}</p><div className="tag-row">{project.tags.map(tag => <span key={tag}>{tag}</span>)}</div><a href="#contact" className="work-link">Discuss a similar project <span>→</span></a></article>)}</div></div>
      </section>

      <section className="section page-width" id="process"><p className="eyebrow">How we work</p><div className="section-heading"><h2>A simple, visible process.</h2><p>No confusing handoff. You know what is happening, what you need to approve and what comes next.</p></div><div className="process-grid">{[["01", "Discover", "We discuss your business, your customers and the one result the project should achieve."], ["02", "Plan", "You receive a written scope, a clear quote and a design direction before building starts."], ["03", "Build", "We create, test and refine the experience across phone, tablet and desktop."], ["04", "Launch", "The final website is launched in your name, with a handover and support plan."]].map(([n,t,p]) => <div className="process-step" key={n}><span>{n}</span><h3>{t}</h3><p>{p}</p></div>)}</div></section>

      <section className="section page-width promise"><div><p className="eyebrow">Why VNS</p><h2>Clarity builds trust.</h2></div><div className="promise-list"><p><b>Written scope.</b> You know what is included before work starts.</p><p><b>Client ownership.</b> Your domain, hosting and final code remain yours.</p><p><b>Practical AI.</b> We automate a defined task, never AI just for a trend.</p><p><b>Direct communication.</b> You work with the people building your project.</p></div></section>

      <section className="section surface-section" id="faq"><div className="page-width faq-layout"><div><p className="eyebrow">Questions</p><h2>Before we start.</h2><p>Good projects begin with a shared understanding. Here are the essentials.</p></div><div className="faq-list">{faqs.map(([question, answer], index) => <div className="faq-item" key={question}><button onClick={() => setOpenFaq(index === openFaq ? -1 : index)} aria-expanded={index === openFaq}>{question}<span>{index === openFaq ? "−" : "+"}</span></button>{index === openFaq && <p>{answer}</p>}</div>)}</div></div></section>

      <section className="contact-section" id="contact"><div className="page-width contact-layout"><div><p className="eyebrow"><span className="live-dot" /> Open for new projects</p><h2>Let’s build something that earns its place in your business.</h2><p>Tell us what you need. You’ll get a clear reply with the right next step—not a sales script.</p><div className="next-steps" aria-label="What happens next"><p className="mini-label">WHAT HAPPENS NEXT</p><ol><li><span>01</span>Tell us about your business</li><li><span>02</span>Get clear next steps</li><li><span>03</span>Build and refine together</li></ol></div><a className="contact-email" href={`mailto:${brand.email}`}>{brand.email} <span>↗</span></a><p className="small-note">{brand.location} · Reply within one business day</p></div><form className="contact-form" onSubmit={handleSubmit}><label>Your name<input required name="name" placeholder="Your name" /></label><label>Email address<input required type="email" name="email" placeholder="you@business.com" /></label><label>Mobile / WhatsApp number<input required type="tel" name="phone" inputMode="tel" autoComplete="tel" placeholder="+91 98765 43210" /></label><label>Business / project type<input name="business" placeholder="Restaurant, studio, startup…" /></label><label>What should this project achieve?<textarea required name="message" placeholder="More enquiries, bookings, direct orders, better follow-up…" rows="4" /></label><p className="form-privacy">Your details are used only to respond to your enquiry.</p><button className="button" type="submit">Open Gmail draft <span>→</span></button>{sent && <p className="form-success">A Gmail draft is opening with your enquiry ready. Review it, then press Send in Gmail.</p>}</form></div></section>
    </main>
    <footer><div className="page-width footer-grid"><div><a className="logo" href="#top"><span>V</span>NS<span className="dot">.</span></a><p className="footer-note">Thoughtful websites and practical automation for growing Indian businesses.</p></div><div><p className="footer-label">Studio</p><a href="#work">Work</a><a href="#process">Process</a><a href="#services">Services</a><a href="#faq">FAQ</a></div><div><p className="footer-label">Industries</p><a href="#industries">Restaurants & cafés</a><a href="#industries">Clinics & wellness</a><a href="#industries">Gyms & salons</a><a href="#industries">Real estate</a></div><div><p className="footer-label">Contact</p><a href={messageLink} target={brand.whatsapp ? "_blank" : undefined} rel="noreferrer">{brand.whatsapp ? "WhatsApp us ↗" : "Email us ↗"}</a><p className="footer-location">India · Working with local businesses</p></div></div><div className="page-width footer-bottom"><p>© {new Date().getFullYear()} VNS Solutions. All rights reserved.</p><a href="#top">Back to top ↑</a></div></footer>
  </>;
}
