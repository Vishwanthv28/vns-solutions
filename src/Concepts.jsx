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
  const [requestType, setRequestType] = useState("centre");
  const [requestState, setRequestState] = useState("idle");
  const services = [
    ["Imaging & radiology","Ask about available scans and the preparation required before your visit.","Scan enquiry"],
    ["2D echocardiography","Check appointment availability and what records or referral documents to carry.","Heart imaging"],
    ["3D & 4D Doppler imaging","Get clear scheduling and preparation information directly from the centre.","Doppler imaging"],
    ["Renal Doppler","Confirm availability, preparation instructions and appointment timing before arrival.","Specialised scan"],
    ["Prenatal screening","Speak with the centre for considerate guidance about scheduling and preparation.","Screening enquiry"],
    ["Laboratory tests","Public listings mention tests such as CBC, thyroid profile and malaria testing.","Lab enquiry"]
  ];
  const clinicalImages = [
    ["/concepts/sonic-clinical/radiology.webp","Illustrative torso and radiology scan slices"],
    ["/concepts/sonic-clinical/echocardiography.webp","Illustrative heart and echocardiography screen"],
    ["/concepts/sonic-clinical/doppler-imaging.webp","Illustrative heart and Doppler blood-flow visualization"],
    ["/concepts/sonic-clinical/renal-doppler.webp","Illustrative kidneys and renal blood-flow visualization"],
    ["/concepts/sonic-clinical/prenatal-screening.webp","Illustrative prenatal ultrasound visualization"],
    ["/concepts/sonic-clinical/laboratory-tests.webp","Illustrative laboratory sample and microscope"]
  ];
  const faqs = [
    ["Do I need an appointment?","Calling or sending a request before visiting is recommended. The centre can confirm availability and the appropriate time for your test."],
    ["Is fasting required?","Requirements depend on the test. Follow your doctor’s advice and confirm the exact preparation with the centre before your appointment."],
    ["What should I bring?","Ask the centre whether you should carry a prescription, previous reports, identification or any other documents for your selected service."],
    ["Is home sample collection available?","This proposal demonstrates a home-collection request feature. Sonic Diagnostics must confirm availability, eligible tests, service area and charges before it is offered publicly."],
    ["How will I receive my report?","Report collection and delivery options must be confirmed directly with Sonic Diagnostics. This concept does not make assumptions about medical-report handling."]
  ];
  const directions = "https://www.google.com/maps/search/?api=1&query=Sonic+Diagnostics+Kolariya+Pride+Towers+Naimnagar+Hanamkonda";
  const today = new Date().toISOString().split("T")[0];
  function handleRequest(event) {
    event.preventDefault();
    setRequestState("sent");
  }
  return <div className="concept sonic-concept">
    <div className="sonic-proposal-bar"><a href="/" aria-label="Return to VNS Solutions">VNS<span>.</span></a><p><b>Independent website concept</b><span>Public information only · For discussion with Sonic Diagnostics</span></p><a href="/#contact">Created by VNS Solutions ↗</a></div>
    <header className="sonic-nav"><a href="#sonic-top" className="sonic-logo"><i aria-hidden="true"><b/></i><span>SONIC <small>DIAGNOSTICS</small></span></a><nav aria-label="Sonic concept navigation"><a href="#sonic-services">Services</a><a href="#sonic-home">Home collection</a><a href="#sonic-guide">Patient guide</a><a href="#sonic-visit">Visit</a></nav><a className="sonic-call" href="tel:+918128613278">Call now <span>→</span></a></header>
    <main id="sonic-top">
      <section className="sonic-hero">
        <div className="sonic-hero-copy"><p className="sonic-eyebrow">Diagnostic services in Hanamkonda</p><h1>Clear answers.<br/><em>Simple appointments.</em></h1><p className="sonic-lead">Find the right diagnostic service, understand the next step and contact the centre—all from one calm, mobile-friendly experience.</p><div className="sonic-actions"><a className="sonic-primary" href="#sonic-book">Request an appointment <span>→</span></a><a className="sonic-secondary" href="tel:+918128613278">Call 08128 613278</a></div><div className="sonic-hero-facts"><span><b>Monday–Saturday</b>9:00 AM–9:00 PM</span><span><b>Convenient location</b>Near Old RTO Office</span></div></div>
        <aside className="sonic-book-card" id="sonic-book" aria-labelledby="sonic-book-title"><div className="sonic-book-head"><p className="sonic-eyebrow">Quick request</p><h2 id="sonic-book-title">How can we help?</h2><p>Choose any future date and preferred time. The centre would contact you to confirm availability.</p></div><div className="sonic-request-tabs" role="group" aria-label="Request type"><button type="button" className={requestType === "centre" ? "active" : ""} onClick={()=>{setRequestType("centre");setRequestState("idle")}}>Centre visit</button><button type="button" className={requestType === "home" ? "active" : ""} onClick={()=>{setRequestType("home");setRequestState("idle")}}>Home collection</button></div><form onSubmit={handleRequest}><label>Full name<input required name="name" autoComplete="name" placeholder="Your name"/></label><label>Mobile number<input required name="phone" type="tel" inputMode="tel" autoComplete="tel" pattern="[0-9+() -]{10,18}" placeholder="+91 98765 43210"/></label><label>Service<select required name="service" defaultValue=""><option value="" disabled>Select a service</option>{services.map(([title])=><option key={title}>{title}</option>)}</select></label><label>Preferred date<input required name="date" type="date" min={today}/></label><label>Preferred time<input required name="time" type="time"/></label><button className="sonic-primary" type="submit">Request a callback <span>→</span></button>{requestState === "sent" && <p className="sonic-form-success" role="status">Demo completed. No information was sent. The official version would securely notify the centre for confirmation.</p>}</form><small className="sonic-form-note">{requestType === "home" ? "Home collection is a proposed feature. Availability, eligible tests, area and charges require centre approval." : "This is a non-functional concept form and does not create an appointment."}</small></aside>
        <figure className="sonic-hero-image"><img src="/concepts/sonic/diagnostic-centre-hero.svg" width="1774" height="887" alt="Diagnostic centre professional discussing a scan appointment with a patient" fetchPriority="high"/><figcaption><span>Patient-first experience</span><b>Clear guidance before every visit</b></figcaption></figure>
      </section>

      <section className="sonic-quick-actions" aria-label="Quick patient actions"><a href="#sonic-services"><span>01</span><div><b>Find a service</b><p>Explore publicly listed options</p></div><i>↓</i></a><a href="tel:+918128613278"><span>02</span><div><b>Speak with the centre</b><p>Confirm price and preparation</p></div><i>↗</i></a><a href={directions} target="_blank" rel="noreferrer"><span>03</span><div><b>Get directions</b><p>Open the location in Maps</p></div><i>↗</i></a></section>

      <section className="sonic-services" id="sonic-services"><div className="sonic-section-head"><div><p className="sonic-eyebrow">Explore services</p><h2>Know where to start.</h2></div><p>Each service is explained in straightforward language, with a direct route to ask about appointments, pricing and preparation. The images are educational illustrations, not patient scans or diagnostic results.</p></div><div className="sonic-service-visuals"><figure><img src="/concepts/sonic/imaging-doppler.svg" width="1200" height="900" loading="lazy" alt="Diagnostic professional explaining Doppler imaging equipment to a patient"/><figcaption><small>Imaging services</small><b>Scan and Doppler enquiries</b><a href="#sonic-book">Request an appointment →</a></figcaption></figure><figure><img src="/concepts/sonic/laboratory-testing.svg" width="1200" height="900" loading="lazy" alt="Laboratory professional preparing routine diagnostic samples"/><figcaption><small>Laboratory services</small><b>Routine test enquiries</b><a href="#sonic-book">Ask about a test →</a></figcaption></figure><figure><img src="/concepts/sonic/home-sample-collection.svg" width="1400" height="934" loading="lazy" alt="Healthcare professional discussing proposed home sample collection with a family"/><figcaption><small>Proposed convenience service</small><b>Home collection requests</b><a href="#sonic-home">See how it could work →</a></figcaption></figure></div><div className="sonic-service-grid">{services.map(([title,text,label],index)=><article className="sonic-illustrated-service" key={title}><figure><img src={clinicalImages[index][0]} width="1536" height="1024" loading="lazy" alt={clinicalImages[index][1]}/><figcaption>Illustrative service visual</figcaption></figure><div className="sonic-service-card-body"><div className="sonic-service-top"><span>{String(index+1).padStart(2,"0")}</span><small>{label}</small></div><h3>{title}</h3><p>{text}</p><a href="#sonic-book" onClick={()=>setRequestState("idle")}>Enquire about this service <span>→</span></a></div></article>)}</div></section>

      <section className="sonic-home" id="sonic-home"><figure className="sonic-home-visual"><img src="/concepts/sonic/home-sample-collection.svg" width="1400" height="934" loading="lazy" alt="Healthcare professional discussing a home sample collection request with an older patient and family member"/><figcaption>Convenience designed around the patient</figcaption></figure><div className="sonic-home-copy"><p className="sonic-eyebrow">Proposed home sample collection</p><h2>A simpler way to request collection from home.</h2><p>For suitable laboratory tests, patients could request a preferred day and receive confirmation from the centre. This is especially helpful for older adults, people with limited mobility and families managing busy schedules.</p><ol><li><span>1</span><div><b>Send a request</b><p>Share only basic contact and scheduling information.</p></div></li><li><span>2</span><div><b>Receive confirmation</b><p>The centre confirms test eligibility, preparation, service area and charges.</p></div></li><li><span>3</span><div><b>Prepare for collection</b><p>Follow only the instructions provided by your doctor or the centre.</p></div></li></ol><a className="sonic-primary" href="#sonic-book" onClick={()=>{setRequestType("home");setRequestState("idle")}}>Request home collection <span>→</span></a><small>Concept feature only. Sonic Diagnostics must approve and operationally support this service before launch.</small></div></section>

      <section className="sonic-process" id="sonic-guide"><div><p className="sonic-eyebrow">Your visit, made clearer</p><h2>Three steps before you arrive.</h2><p className="sonic-process-intro">The website helps patients prepare without making medical assumptions.</p></div><ol><li><span>01</span><div><b>Choose or ask</b><p>Select a service, or call if you are unsure which booking matches your doctor’s advice.</p></div></li><li><span>02</span><div><b>Confirm the details</b><p>Check the appointment time, price, preparation and documents directly with the centre.</p></div></li><li><span>03</span><div><b>Visit with confidence</b><p>Use one-tap directions and arrive with the confirmed instructions and required records.</p></div></li></ol></section>

      <section className="sonic-preparation"><div className="sonic-section-head"><div><p className="sonic-eyebrow">Before your test</p><h2>Prepare with the right information.</h2></div><p>Preparation differs between tests. These reminders help patients ask the right questions; they are not medical instructions.</p></div><div className="sonic-prep-grid"><article><span>01</span><h3>Confirm fasting</h3><p>Ask whether your specific test requires fasting and for how long. Do not assume every test has the same requirement.</p></article><article><span>02</span><h3>Carry your records</h3><p>Confirm whether a prescription, previous reports or identification is required for the appointment.</p></article><article><span>03</span><h3>Share relevant concerns</h3><p>Tell the qualified centre team about relevant medical instructions or concerns when confirming the booking.</p></article></div><p className="sonic-medical-note"><b>Important:</b> Always follow your doctor’s and the diagnostic centre’s confirmed instructions. This website concept does not provide diagnosis or medical advice.</p></section>

      <section className="sonic-faq"><div><p className="sonic-eyebrow">Patient questions</p><h2>Useful answers before you call.</h2></div><div>{faqs.map(([question,answer])=><details key={question}><summary>{question}<span>+</span></summary><p>{answer}</p></details>)}</div></section>

      <section className="sonic-visit" id="sonic-visit"><div className="sonic-location-art" aria-hidden="true"><span>HANAMKONDA</span><i/><b>Near Old RTO Office</b><small>Open in Google Maps</small></div><div><p className="sonic-eyebrow">Visit Sonic Diagnostics</p><h2>Easy to find. Simple to contact.</h2><address>H.No. 5-11-471, Kolariya Pride Towers,<br/>Near Old RTO Office, Naimnagar,<br/>Hanamkonda, Warangal – 506001, Telangana.</address><div className="sonic-hours"><span><b>Monday–Saturday</b>9:00 AM–9:00 PM</span><span><b>Sunday</b>Closed</span></div><div className="sonic-actions"><a className="sonic-primary" href={directions} target="_blank" rel="noreferrer">Open Google Maps <span>↗</span></a><a className="sonic-secondary" href="tel:+918128613278">Call the centre</a></div></div></section>

      <section className="sonic-proposal-note"><p>Independent concept created by VNS Solutions from publicly listed information</p><h2>A professional digital front door for Sonic Diagnostics.</h2><p>The official version can connect real appointment requests, approved home-collection availability, original photography and centre-confirmed report guidance.</p><a href="/#contact">Discuss this proposal with VNS Solutions <span>↗</span></a></section>
    </main>
    <footer className="concept-footer"><span>Independent concept · Not client work · Details require owner approval</span><a href="/">Return to VNS Solutions ↑</a></footer>
  </div>;
}

function SonicDiagnosticsClinicalConcept() {
  const [requestState, setRequestState] = useState("idle");
  const today = new Date().toISOString().split("T")[0];
  const directions = "https://www.google.com/maps/search/?api=1&query=Sonic+Diagnostics+Kolariya+Pride+Towers+Naimnagar+Hanamkonda";
  const services = [
    {title:"Imaging & radiology", label:"Scan enquiry", image:"/concepts/sonic-clinical/radiology.webp", alt:"Illustrative torso and radiology scan slices", text:"Ask which scans are publicly available, how to prepare and which records to bring."},
    {title:"2D echocardiography", label:"Heart imaging", image:"/concepts/sonic-clinical/echocardiography.webp", alt:"Illustrative heart and echocardiography screen", text:"Check appointment availability and confirm the preparation or referral documents required."},
    {title:"3D & 4D Doppler imaging", label:"Doppler imaging", image:"/concepts/sonic-clinical/doppler-imaging.webp", alt:"Illustrative heart and Doppler blood-flow visualization", text:"Ask the centre about scheduling, preparation, price and the right time to arrive."},
    {title:"Renal Doppler", label:"Specialised scan", image:"/concepts/sonic-clinical/renal-doppler.webp", alt:"Illustrative kidneys and renal blood-flow visualization", text:"Confirm availability and follow only the preparation instructions given by your doctor or the centre."},
    {title:"Prenatal screening", label:"Screening enquiry", image:"/concepts/sonic-clinical/prenatal-screening.webp", alt:"Illustrative prenatal ultrasound visualization", text:"Contact the centre for considerate guidance about timing, preparation and documents."},
    {title:"Laboratory tests", label:"Lab enquiry", image:"/concepts/sonic-clinical/laboratory-tests.webp", alt:"Illustrative laboratory sample and microscope", text:"Public listings mention tests such as CBC, thyroid profile and malaria testing; confirm current availability."}
  ];
  function handleRequest(event) {
    event.preventDefault();
    setRequestState("sent");
  }
  return <div className="concept sonic-concept sonic-clinical-concept">
    <div className="sonic-proposal-bar"><a href="/" aria-label="Return to VNS Solutions">VNS<span>.</span></a><p><b>Independent website concept</b><span>Clinical illustration edition · Not client work</span></p><a href="/#contact">Created by VNS Solutions ↗</a></div>
    <header className="sonic-nav"><a href="#clinical-top" className="sonic-logo"><i aria-hidden="true"><b/></i><span>SONIC <small>DIAGNOSTICS</small></span></a><nav aria-label="Sonic clinical concept navigation"><a href="#clinical-services">Services</a><a href="#clinical-book">Appointment</a><a href="#clinical-visit">Location</a></nav><a className="sonic-call" href="tel:+918128613278">Call now <span>→</span></a></header>
    <main id="clinical-top">
      <section className="clinical-hero">
        <div className="clinical-hero-copy"><p className="sonic-eyebrow">Diagnostic services in Hanamkonda</p><h1>See the service.<br/><em>Plan your visit.</em></h1><p>Clear service visuals, practical preparation questions and direct contact details—designed to help patients take the next step confidently.</p><div className="sonic-actions"><a className="sonic-primary" href="#clinical-book">Choose a preferred date <span>→</span></a><a className="sonic-secondary" href="tel:+918128613278">Call 08128 613278</a></div></div>
        <aside className="clinical-info-card"><p className="sonic-eyebrow">Visit information</p><h2>Open six days a week.</h2><div><span><b>Monday–Saturday</b>9:00 AM–9:00 PM</span><span><b>Sunday</b>Closed</span></div><address>H.No. 5-11-471, Kolariya Pride Towers,<br/>Near Old RTO Office, Naimnagar,<br/>Hanamkonda, Warangal – 506001, Telangana.</address><small>Publicly listed details. Please call to confirm before travelling.</small><a href={directions} target="_blank" rel="noreferrer">Open Google Maps <span>↗</span></a></aside>
      </section>

      <section className="clinical-services" id="clinical-services"><div className="sonic-section-head"><div><p className="sonic-eyebrow">Explore diagnostic services</p><h2>Understand what to ask about.</h2></div><p>Every visual is an educational illustration—not a patient scan or medical result. Availability, suitability and preparation must be confirmed with a qualified professional.</p></div><div className="clinical-service-grid">{services.map((service,index)=><article key={service.title}><figure><img src={service.image} width="1536" height="1024" loading={index < 2 ? "eager" : "lazy"} alt={service.alt}/><figcaption>Illustrative service visual</figcaption></figure><div className="clinical-service-body"><div className="sonic-service-top"><span>{String(index+1).padStart(2,"0")}</span><small>{service.label}</small></div><h3>{service.title}</h3><p>{service.text}</p><a href="#clinical-book" onClick={()=>setRequestState("idle")}>Ask about this service <span>→</span></a></div></article>)}</div></section>

      <section className="clinical-book-section" id="clinical-book"><div><p className="sonic-eyebrow">Appointment request concept</p><h2>Choose a date that suits you.</h2><p>Share a preferred date and time, then the centre would confirm availability. This demonstration does not send or store information.</p><div className="clinical-book-facts"><span><b>Call directly</b><a href="tel:+918128613278">08128 613278</a></span><span><b>Visit</b>Near Old RTO Office, Hanamkonda</span></div></div><form className="clinical-book-form" onSubmit={handleRequest}><label>Full name<input required name="name" autoComplete="name" placeholder="Your name"/></label><label>Mobile number<input required name="phone" type="tel" inputMode="tel" autoComplete="tel" pattern="[0-9+() -]{10,18}" placeholder="+91 98765 43210"/></label><label>Service<select required name="service" defaultValue=""><option value="" disabled>Select a service</option>{services.map(({title})=><option key={title}>{title}</option>)}</select></label><label>Preferred date<input required name="date" type="date" min={today}/></label><label>Preferred time<select required name="time" defaultValue=""><option value="" disabled>Select a time</option><option>Morning</option><option>Afternoon</option><option>Evening</option></select></label><label>Visit type<select required name="visit" defaultValue="Centre visit"><option>Centre visit</option><option>Ask about home collection</option></select></label><button className="sonic-primary" type="submit">Review request <span>→</span></button>{requestState === "sent" && <p className="sonic-form-success" role="status">Demo complete. No information was sent. A real appointment still requires centre confirmation.</p>}<small>Do not enter medical history or report details in this concept form.</small></form></section>

      <section className="clinical-visit" id="clinical-visit"><div><p className="sonic-eyebrow">Address and availability</p><h2>Everything needed before you leave.</h2></div><div className="clinical-visit-details"><address><b>Sonic Diagnostics</b>H.No. 5-11-471, Kolariya Pride Towers,<br/>Near Old RTO Office, Naimnagar,<br/>Hanamkonda, Warangal – 506001, Telangana.</address><div className="sonic-hours"><span><b>Monday–Saturday</b>9:00 AM–9:00 PM</span><span><b>Sunday</b>Closed</span></div><div className="sonic-actions"><a className="sonic-primary" href={directions} target="_blank" rel="noreferrer">Open Google Maps <span>↗</span></a><a className="sonic-secondary" href="tel:+918128613278">Call the centre</a></div><small>Hours and services can change. Confirm directly before visiting.</small></div></section>
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
  if (path === "/concepts/sonic-diagnostics-clinical") return <SonicDiagnosticsClinicalConcept/>;
  if (path === "/concepts/lead-automation") return <AutomationConcept/>;
  return null;
}
