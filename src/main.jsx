import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./App.css";
import Concepts from "./Concepts";
import OwnerDashboard from "./components/OwnerDashboard/OwnerDashboard.jsx";
import CallingPlatformDemo from "./components/CallingPlatform/CallingPlatformDemo.jsx";

const isConcept = window.location.pathname.startsWith("/concepts/");
const isOwner = /^\/owner\/?$/.test(window.location.pathname);
const isCallingPlatformDemo = window.location.pathname === "/platform/demo";

createRoot(document.getElementById("root")).render(
  <StrictMode>{isCallingPlatformDemo ? <CallingPlatformDemo /> : isOwner ? <OwnerDashboard /> : isConcept ? <Concepts /> : <App />}</StrictMode>
);
