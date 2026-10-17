import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import "./index.css";
import App from "./App";
import Admin from "./Admin";
import "./emoji.css";
import "./photo.css";
import "./theme.css";
import "./hero.css";

const SECRET = ".footer strong";
const TAPS_NEEDED = 5;
const TAP_WINDOW_MS = 1500;

function Root() {
  const [isAdmin, setIsAdmin] = useState(window.location.hash === "#admin");

  useEffect(() => {
    const onHash = () => setIsAdmin(window.location.hash === "#admin");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    let taps = 0;
    let timer = null;

    const onMouseDown = (e) => {
      if (e.target.closest && e.target.closest(SECRET)) e.preventDefault();
    };

    const onClick = (e) => {
      if (!(e.target.closest && e.target.closest(SECRET))) return;
      taps += 1;
      clearTimeout(timer);
      timer = setTimeout(() => {
        taps = 0;
      }, TAP_WINDOW_MS);
      if (taps >= TAPS_NEEDED) {
        taps = 0;
        window.location.hash = "admin";
      }
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("click", onClick);
      clearTimeout(timer);
    };
  }, []);

  return isAdmin ? <Admin /> : <App />;
}

const node = (
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
const container = document.getElementById("root");

if (ReactDOM.createRoot) ReactDOM.createRoot(container).render(node);
else ReactDOM.render(node, container);