import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import Concepts from "./Concepts";
import "./App.css";

const isConcept = window.location.pathname.startsWith("/concepts/");

createRoot(document.getElementById("root")).render(
  <StrictMode>{isConcept ? <Concepts /> : <App />}</StrictMode>
);
