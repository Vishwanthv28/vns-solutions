import { useMemo, useState } from "react";
import "./Concepts.css";

const conceptNotice = "Concept Project · Sample business · Not client work";

function ConceptBar({ title }) {
  return <div className="concept-bar">
    <a href="/" className="concept-vns" aria-label="Return to VNS Solutions">VNS<span>.</span></a>
    <p><b>{title}</b><span>{conceptNotice}</span></p>
    <a href="/#contact">Discuss a project <span>↗</span></a>
  </div>;
}

function RestaurantConcept() {
  const [bookingState, setBookingState] = useState("idle");
  function handleBooking(event) {
    event.preventDefault();
    setBookingState("sent");
  }
  return <div className="concept restaurant-concept">
    <ConceptBar title="Restaurant website" />
    <header className="restaurant-nav"><a href="#restaurant-top" className="restaurant-logo">SAFFRON<span>&</span>STONE</a><nav><a href="#menu">Menu</a><a href="#story">Story</a><a href="#visit">Visit</a></nav><a href="#reserve" className="restaurant-pill">Reserve</a></header>
    <main id="restaurant-top">
      <section className="restaurant-hero"><div><p className="concept-kicker">Seasonal Indian kitchen · Bengaluru</p><h1>Food with roots.<br/><em>Made for now.</em></h1><p>A warm neighbourhood dining concept shaped around regional ingredients, open-fire cooking and unhurried evenings.</p><div className="restaurant-actions"><a href="#menu">Explore the menu</a><a href="#reserve">Book a table</a></div></div><div className="restaurant-art" role="img" aria-label="Abstract plated food illustration"><span className="plate"><i/><b/></span><p>Tonight’s plate<br/><strong>Charred pumpkin · sesame · chilli</strong></p></div></section>
      <section className="restaurant-marquee" aria-label="Restaurant qualities"><span>Seasonal produce</span><i>✦</i><span>Open-fire kitchen</span><i>✦</i><span>Regional flavours</span><i>✦</i><span>Thoughtful hospitality</span></section>
      <section className="restaurant-menu" id="menu"><div><p className="concept-kicker">A short menu</p><h2>Designed around what is best today.</h2></div><div className="dish-list">{[["Small plate","Smoked aubergine, peanut, curry leaf","₹420"],["From the fire","Pepper chicken, pearl onion, lime","₹680"],["For the table","Mushroom biryani, burnt onion, raita","₹620"],["Something sweet","Jaggery custard, coffee caramel","₹320"]].map(([type,dish,price])=><article key={dish}><p>{type}</p><h3>{dish}</h3><span>{price}</span></article>)}</div></section>
      <section className="restaurant-story" id="story"><p>“A digital concept showing how clear storytelling, menu discovery and reservations can work together for a modern restaurant.”</p><span>Designed by VNS Solutions</span></section>
      <section className="restaurant-reserve" id="reserve"><div><p className="concept-kicker">Reservations</p><h2>Your table is waiting.</h2><p>This interaction is a portfolio demonstration and does not create a real booking.</p></div><form onSubmit={handleBooking}><label>Date<input required type="date" /></label><label>Time<select required defaultValue=""><option value="" disabled>Select</option><option>7:00 PM</option><option>8:30 PM</option></select></label><label>Guests<select required defaultValue="2"><option>2</option><option>3</option><option>4</option><option>5+</option></select></label><button>Check availability</button>{bookingState === "sent" && <p role="status">Demo complete — this is where a real booking confirmation would appear.</p>}</form></section>
    </main>
    <footer className="concept-footer"><span>{conceptNotice}</span><a href="/">Return to VNS Solutions ↑</a></footer>
  </div>;
}

const clinicReplies = {
  "Clinic hours": "The sample clinic is open Monday–Saturday, 9:00 AM–7:00 PM.",
  "Request an appointment": "Choose a preferred day and visit type. In a real clinic, the request would be sent securely to the care team for confirmation.",
  "Services offered": "This concept covers general consultations, preventive check-ins and routine follow-up care.",
  "Talk to the team": "I can hand this conversation to a person with the visitor’s permission. This assistant never provides a diagnosis."
};

function ClinicConcept() {
  const [messages, setMessages] = useState([{from:"bot",text:"Hello. I’m the Aster Care website assistant. Choose a topic to see how guided support works."}]);
  function ask(question) {
    setMessages(current => [...current,{from:"user",text:question},{from:"bot",text:clinicReplies[question]}]);
  }
  return <div className="concept clinic-concept">
    <ConceptBar title="Customer-support assistant" />
    <header className="clinic-nav"><a href="#clinic-top" className="clinic-logo"><span aria-hidden="true">+</span> Aster Care</a><nav aria-label="Clinic concept navigation"><a href="#care">Services</a><a href="#journey">How it works</a><a href="#assistant">Assistant</a></nav><a href="#assistant" className="clinic-button">Ask Aster <span aria-hidden="true">→</span></a></header>
    <main id="clinic-top">
      <section className="clinic-hero"><div className="clinic-hero-copy"><p className="concept-kicker">Modern care, explained simply</p><h1>Clear guidance before every appointment.</h1><p>A calm clinic experience that helps visitors understand services, request the right appointment and reach a real person when needed.</p><div className="clinic-actions"><a href="#care" className="clinic-button">Explore care <span aria-hidden="true">→</span></a><a href="#assistant" className="clinic-text-link">Try the assistant</a></div><ul className="clinic-trust" aria-label="Clinic concept benefits"><li>Plain-language information</li><li>Mobile-first access</li><li>Human support</li></ul></div><aside className="care-card" aria-label="Sample appointment availability"><div className="care-card-top"><span>Sample availability</span><i><b/> Open today</i></div><h2>Find the right next step.</h2><p className="care-card-intro">Clear visit types make it easier to choose before contacting the clinic.</p><div className="care-options"><a href="#assistant"><span><b>General consultation</b><small>New or ongoing concerns</small></span><em>30 min</em></a><a href="#assistant"><span><b>Preventive check-in</b><small>Routine health planning</small></span><em>25 min</em></a><a href="#assistant"><span><b>Follow-up care</b><small>Continue an existing plan</small></span><em>20 min</em></a></div><a href="#assistant" className="care-card-action">Request an appointment <span aria-hidden="true">→</span></a><small className="care-disclaimer">Fictional information for demonstration only</small></aside></section>

      <section className="clinic-services" id="care"><div className="clinic-section-heading"><p className="concept-kicker">Care without confusion</p><h2>Everything important, easy to find.</h2><p>The concept keeps essential information close and removes the friction that often prevents visitors from taking the next step.</p></div><div className="clinic-values">{[["01","Understand the service","Short, plain-language summaries explain what each visit is for."],["02","Choose a next step","Visitors can move from information to an appointment request without searching."],["03","Reach a real person","Sensitive or uncertain questions are directed to the clinic team."]].map(([n,t,p])=><article key={n}><span>{n}</span><h3>{t}</h3><p>{p}</p><a href="#assistant">See how it works <i aria-hidden="true">↗</i></a></article>)}</div></section>

      <section className="clinic-journey" id="journey"><div><p className="concept-kicker">A considered patient journey</p><h2>From question to confirmed next step.</h2></div><ol><li><span>01</span><div><b>Start with the need</b><p>Services are grouped by the visitor’s goal, not internal clinic terminology.</p></div></li><li><span>02</span><div><b>Get an approved answer</b><p>The assistant responds only with clinic-approved information and clear limitations.</p></div></li><li><span>03</span><div><b>Continue with a person</b><p>Appointment requests and sensitive questions move to the clinic team.</p></div></li></ol></section>

      <section className="assistant-section" id="assistant"><div className="assistant-intro"><p className="concept-kicker">Interactive assistant demo</p><h2>Helpful answers, with clear boundaries.</h2><p>Try the scripted assistant. It demonstrates guided support without collecting personal or medical information.</p><div className="assistant-rules"><b>Built-in safeguards</b><span>No diagnosis</span><span>No personal data</span><span>Human escalation</span></div><p className="urgent-note"><b>Need urgent care?</b> A real clinic experience should always display local emergency guidance instead of relying on a chatbot.</p></div><div className="chat-window"><div className="chat-title"><span className="clinic-mark" aria-hidden="true">+</span><p><b>Aster Assistant</b><small><i/> Demonstration mode</small></p></div><div className="chat-messages" aria-live="polite" aria-atomic="false">{messages.slice(-5).map((message,index)=><p className={message.from} key={`${message.text}-${index}`}>{message.text}</p>)}</div><div className="quick-questions" aria-label="Example questions">{Object.keys(clinicReplies).map(question=><button type="button" key={question} onClick={()=>ask(question)}>{question}</button>)}</div></div></section>

      <section className="clinic-cta" id="contact"><div><p className="concept-kicker">Built for trust</p><h2>A clearer website can make care easier to access.</h2></div><div><p>This fictional concept shows how thoughtful content, accessible design and safe automation can support a modern clinic.</p><a href="/#contact" className="clinic-button">Discuss a clinic project <span aria-hidden="true">↗</span></a></div></section>
    </main>
    <footer className="concept-footer"><span>{conceptNotice}</span><a href="/">Return to VNS Solutions ↑</a></footer>
  </div>;
}

function SonicDiagnosticsConcept() {
  const services = [
    ["01","Imaging & radiology","Clear preparation information and direct enquiry for available scans."],
    ["02","2D echocardiography","A focused path for visitors looking for heart-imaging information."],
    ["03","3D & 4D Doppler imaging","A simple overview with appointment and preparation guidance."],
    ["04","Renal Doppler","Easy-to-find service information before contacting the centre."],
    ["05","Prenatal screening","Considerate, plain-language information with a direct human contact option."],
    ["06","Laboratory tests","Public listings mention CBC, thyroid profile and malaria testing."]
  ];
  const directions = "https://www.google.com/maps/search/?api=1&query=Sonic+Diagnostics+Kolariya+Pride+Towers+Naimnagar+Hanamkonda";
  return <div className="concept sonic-concept">
    <div className="sonic-proposal-bar"><a href="/" aria-label="Return to VNS Solutions">VNS<span>.</span></a><p><b>Independent website proposal</b><span>Public information only · Not commissioned by Sonic Diagnostics</span></p><a href="/#contact">Created by VNS Solutions ↗</a></div>
    <header className="sonic-nav"><a href="#sonic-top" className="sonic-logo"><i aria-hidden="true"><b/></i><span>SONIC <small>DIAGNOSTICS</small></span></a><nav aria-label="Sonic concept navigation"><a href="#sonic-services">Services</a><a href="#sonic-process">Patient guide</a><a href="#sonic-visit">Visit</a></nav><a className="sonic-call" href="tel:+918128613278">Call centre <span>→</span></a></header>
    <main id="sonic-top">
      <section className="sonic-hero"><div className="sonic-hero-copy"><p className="sonic-eyebrow">Diagnostic care in Hanamkonda</p><h1>Clear information.<br/><em>Confident next steps.</em></h1><p>A calm digital experience designed to help patients understand available services, find the centre and speak with the team without unnecessary searching.</p><div className="sonic-actions"><a className="sonic-primary" href="tel:+918128613278">Call for an appointment <span>↗</span></a><a className="sonic-secondary" href={directions} target="_blank" rel="noreferrer">Get directions</a></div><ul><li><b>Mon–Sat</b><span>9:00 AM–9:00 PM</span></li><li><b>Location</b><span>Near Old RTO Office</span></li></ul></div><aside className="sonic-visual" aria-label="Abstract diagnostic imaging illustration"><div className="sonic-scan"><i/><b/><span/></div><div className="sonic-availability"><span>Patient information</span><b>Plan your visit</b><p>Confirm the test, preparation and appointment time directly with the centre.</p><a href="tel:+918128613278">08128 613278 <span>→</span></a></div><small>Concept visual · Replace with approved centre photography</small></aside></section>

      <section className="sonic-info-strip" aria-label="Centre information"><article><span>01</span><div><b>Convenient hours</b><p>Open Monday to Saturday</p></div></article><article><span>02</span><div><b>Direct assistance</b><p>Call before your visit</p></div></article><article><span>03</span><div><b>Easy to locate</b><p>Naimnagar, Hanamkonda</p></div></article></section>

      <section className="sonic-services" id="sonic-services"><div className="sonic-section-head"><p className="sonic-eyebrow">Services listed publicly</p><h2>Find the information you need, faster.</h2><p>This proposal organises diagnostic services into a clean, mobile-friendly experience. Every service and preparation instruction should be confirmed by the centre before publication.</p></div><div className="sonic-service-grid">{services.map(([number,title,text])=><article key={number}><span>{number}</span><div><h3>{title}</h3><p>{text}</p></div><a href="tel:+918128613278" aria-label={`Call about ${title}`}>Ask about this service ↗</a></article>)}</div></section>

      <section className="sonic-process" id="sonic-process"><div><p className="sonic-eyebrow">A simpler patient journey</p><h2>From search to visit, without confusion.</h2></div><ol><li><span>01</span><div><b>Choose the service</b><p>Read a short description and any centre-approved preparation guidance.</p></div></li><li><span>02</span><div><b>Confirm by phone</b><p>Ask about availability, preparation, pricing and the documents to bring.</p></div></li><li><span>03</span><div><b>Reach the centre</b><p>Use one-tap directions and clearly displayed opening hours.</p></div></li></ol></section>

      <section className="sonic-visit" id="sonic-visit"><div className="sonic-location-art" aria-hidden="true"><span>HANAMKONDA</span><i/><b>Old RTO Office</b></div><div><p className="sonic-eyebrow">Visit the centre</p><h2>Simple directions. Direct contact.</h2><address>H.No. 5-11-471, Kolariya Pride Towers,<br/>Near Old RTO Office, Naimnagar,<br/>Hanamkonda, Warangal – 506001, Telangana.</address><p><b>Hours</b> Monday–Saturday, 9:00 AM–9:00 PM<br/><b>Sunday</b> Closed</p><div className="sonic-actions"><a className="sonic-primary" href={directions} target="_blank" rel="noreferrer">Open in Google Maps ↗</a><a className="sonic-secondary" href="tel:+918128613278">Call 08128 613278</a></div></div></section>

      <section className="sonic-proposal-note"><p>Independent concept created by VNS Solutions using publicly listed information.</p><h2>Ready to turn this direction into an official website?</h2><p>Before launch, the centre can confirm services, supply original photography and approve every medical and business detail.</p><a href="/#contact">Discuss this proposal with VNS Solutions <span>↗</span></a></section>
    </main>
    <footer className="concept-footer"><span>Independent concept · Not client work · Details require owner approval</span><a href="/">Return to VNS Solutions ↑</a></footer>
  </div>;
}

const sampleLeads = [
  {name:"Priya",source:"Website enquiry",intent:"Website redesign",status:"New",time:"2m"},
  {name:"Kiran",source:"WhatsApp",intent:"Automation enquiry",status:"Qualified",time:"18m"},
  {name:"Aarav",source:"Contact form",intent:"Landing page",status:"Replied",time:"1h"},
  {name:"Meera",source:"Referral",intent:"Support assistant",status:"Qualified",time:"3h"}
];

function AutomationConcept() {
  const [filter,setFilter] = useState("All");
  const [eventActive,setEventActive] = useState(false);
  const leads = useMemo(()=>filter === "All" ? sampleLeads : sampleLeads.filter(lead=>lead.status===filter),[filter]);
  function runDemo(){setEventActive(true);window.setTimeout(()=>setEventActive(false),2800)}
  return <div className="concept automation-concept">
    <ConceptBar title="Notification workflow" />
    <header className="ops-nav"><a href="#ops-top" className="ops-logo"><i/> SIGNALDESK</a><div><span>Demo workspace</span><a href="/">Exit concept</a></div></header>
    <main id="ops-top" className="ops-shell"><aside><p>Workspace</p><a className="active" href="#overview">Overview</a><a href="#workflow">Workflow</a><a href="#leads">Leads</a><a href="#activity">Activity</a><div><small>System status</small><b><i/> All demo systems ready</b></div></aside><section className="ops-main" id="overview"><div className="ops-heading"><div><p className="concept-kicker">Operations overview</p><h1>Important leads,<br/>routed without delay.</h1></div><button onClick={runDemo}>Run demo event <span>→</span></button></div>
      <section className="workflow" id="workflow"><div className={eventActive?"pulse active":"pulse"}><span>1</span><b>New enquiry</b><small>Website form</small></div><i>→</i><div className={eventActive?"pulse active delay-one":"pulse"}><span>2</span><b>Validate & qualify</b><small>Rules engine</small></div><i>→</i><div className={eventActive?"pulse active delay-two":"pulse"}><span>3</span><b>Notify owner</b><small>Email + WhatsApp</small></div>{eventActive&&<p role="status">Sample event processed successfully</p>}</section>
      <section className="lead-panel" id="leads"><div className="panel-head"><div><p className="concept-kicker">Sample lead queue</p><h2>Recent enquiries</h2></div><div>{["All","New","Qualified","Replied"].map(option=><button className={filter===option?"active":""} key={option} onClick={()=>setFilter(option)}>{option}</button>)}</div></div><div className="lead-table"><div className="lead-row labels"><span>Name</span><span>Source</span><span>Intent</span><span>Status</span><span>Age</span></div>{leads.map(lead=><div className="lead-row" key={lead.name}><b>{lead.name}</b><span>{lead.source}</span><span>{lead.intent}</span><span><i className={`status ${lead.status.toLowerCase()}`}/>{lead.status}</span><span>{lead.time}</span></div>)}</div><p className="sample-note">All names and records shown here are fictional sample data.</p></section>
    </section></main>
    <footer className="concept-footer"><span>{conceptNotice}</span><a href="/">Return to VNS Solutions ↑</a></footer>
  </div>;
}

export default function Concepts() {
  const path = window.location.pathname.replace(/\/$/, "");
  if (path === "/concepts/restaurant") return <RestaurantConcept/>;
  if (path === "/concepts/clinic-assistant") return <ClinicConcept/>;
  if (path === "/concepts/sonic-diagnostics") return <SonicDiagnosticsConcept/>;
  if (path === "/concepts/lead-automation") return <AutomationConcept/>;
  return null;
}
