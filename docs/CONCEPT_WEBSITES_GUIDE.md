# VNS Concept Websites — Beginner Editing Guide

This guide explains how the three concept websites are built and how to edit them safely.

## Where the code lives

| File | What it controls |
| --- | --- |
| `src/Concepts.jsx` | Page structure (React JSX, which is HTML-like) and demo interactions |
| `src/Concepts.css` | Colours, spacing, typography, layouts, mobile rules and animations |
| `src/siteData.js` | Preview cards on the main VNS website |
| `public/concepts/` | Preview screenshots used by those cards |

The routes are selected at the bottom of `Concepts.jsx`:

```jsx
if (path === "/concepts/restaurant") return <RestaurantConcept />;
if (path === "/concepts/clinic-assistant") return <ClinicConcept />;
if (path === "/concepts/lead-automation") return <AutomationConcept />;
```

JSX looks like HTML but uses `className` instead of `class`:

```jsx
<section className="clinic-services" id="care">
  <h2>Everything important, easy to find.</h2>
</section>
```

The CSS targets that class:

```css
.clinic-services {
  padding: 120px;
}
```

## The three concepts

### Restaurant

- Component: `RestaurantConcept`
- CSS prefix: `.restaurant-`
- Route: `/concepts/restaurant`
- Style: warm, editorial and food-focused
- Main colour variables: `--rust`, `--cream`, `--wine`

### Clinic assistant

- Component: `ClinicConcept`
- CSS prefixes: `.clinic-`, `.care-`, `.assistant-`, `.chat-`
- Route: `/concepts/clinic-assistant`
- Style: calm, trustworthy, accessible and human
- Main colour variables: `--blue`, `--blue-dark`, `--mint`, `--clinic-paper`

### Lead automation

- Component: `AutomationConcept`
- CSS prefixes: `.automation-`, `.ops-`, `.workflow`, `.lead-`
- Route: `/concepts/lead-automation`
- Style: focused operations dashboard
- Main colour variables: `--ops`, `--ops-panel`, `--green`

## How the CSS works

### Colours

Change a CSS variable once and every selector using it updates:

```css
.clinic-concept {
  --blue: #0f5262;
}

.clinic-button {
  background: var(--blue);
}
```

### Spacing

`padding` creates space inside an element. `margin` creates space outside it.

```css
.clinic-services {
  padding: 100px 40px; /* top/bottom, then left/right */
}

.clinic-services h2 {
  margin-bottom: 24px;
}
```

### Grid and Flexbox

Grid creates page columns:

```css
.clinic-hero {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 80px;
}
```

Flexbox aligns rows such as navigation and buttons:

```css
.clinic-actions {
  display: flex;
  align-items: center;
  gap: 24px;
}
```

### Responsive text

```css
.clinic-hero h1 {
  font-size: clamp(50px, 5.7vw, 82px);
}
```

- `50px`: minimum size
- `5.7vw`: fluid size based on the browser width
- `82px`: maximum size

### Mobile rules

Rules near the bottom of `Concepts.css` change layouts on small screens:

```css
@media (max-width: 800px) {
  .clinic-hero {
    grid-template-columns: 1fr;
  }
}
```

This turns two desktop columns into one mobile column.

## How the clinic assistant works

Approved demonstration responses are stored in one object:

```jsx
const clinicReplies = {
  "Clinic hours": "The sample clinic is open Monday–Saturday...",
  "Services offered": "This concept covers general consultations..."
};
```

React state stores the visible conversation:

```jsx
const [messages, setMessages] = useState([
  { from: "bot", text: "Hello..." }
]);
```

Clicking a question calls `ask()`, which adds the question and response:

```jsx
function ask(question) {
  setMessages(current => [
    ...current,
    { from: "user", text: question },
    { from: "bot", text: clinicReplies[question] }
  ]);
}
```

This is a scripted demonstration. It does not diagnose, store medical information or pretend to be a real clinic service.

## Safe changes you can make

### Change text

Find the sentence in `src/Concepts.jsx` and replace only the text between the tags.

```jsx
<h2>Everything important, easy to find.</h2>
```

### Change a concept colour

Edit its variable instead of editing every button:

```css
.clinic-concept {
  --blue: #145f70;
}
```

### Change section spacing

Adjust the section's `padding` gradually, usually by 8–16 pixels:

```css
.clinic-services {
  padding: 100px 40px;
}
```

### Add an assistant question

Add one line inside `clinicReplies`:

```jsx
"Location": "This sample clinic is shown in Bengaluru."
```

The interface creates the new button automatically.

## UI/UX rules used

1. Give each section one main action.
2. Show useful information before decoration.
3. Use short lines and plain language.
4. Give every interactive control a clear label.
5. Change multi-column layouts to one column on mobile.
6. Maintain readable text contrast.
7. Show keyboard focus.
8. Respect reduced-motion preferences.
9. Clearly state the assistant's safety limitations.
10. Label every sample as a concept, not client work.

## Test before publishing

From the project folder:

```powershell
npm install
npm run dev
```

Open the local URL, check all three routes, then run:

```powershell
npm run build
git status
```

Test desktop and mobile widths, every navigation link, every demo button and confirm no text is cut off.

## Beginner workflow

1. Change only one small thing.
2. Save the file.
3. Refresh the local website.
4. Check desktop and mobile.
5. Undo immediately if the result is wrong.
6. Commit only after the build passes.

Never put real patient data, private client information, API keys or passwords in these files.
