import { NavLink, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage.jsx";
import DataPage from "./pages/DataPage.jsx";

export default function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Basketball Drill Scores</p>
          <h1>Drill Tracker</h1>
        </div>
        <nav className="top-nav" aria-label="Primary">
          <NavLink to="/" end className={({ isActive }) => navClassName(isActive)}>
            Entry
          </NavLink>
          <NavLink to="/data" className={({ isActive }) => navClassName(isActive)}>
            Data
          </NavLink>
        </nav>
      </header>
      <main className="page-shell">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/data" element={<DataPage />} />
        </Routes>
      </main>
    </div>
  );
}

function navClassName(isActive) {
  return isActive ? "nav-chip nav-chip-active" : "nav-chip";
}
