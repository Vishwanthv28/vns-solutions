import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./App.css";
import Concepts from "./Concepts";
import OwnerDashboard from "./components/OwnerDashboard/OwnerDashboard.jsx";

const isConcept = window.location.pathname.startsWith("/concepts/");
const isOwner = /^\/owner\/?$/.test(window.location.pathname);

createRoot(document.getElementById("root")).render(
  <StrictMode>{isOwner ? <OwnerDashboard /> : isConcept ? <Concepts /> : <App />}</StrictMode>
);
