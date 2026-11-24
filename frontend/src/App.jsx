import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/layout/Navbar";
import Home from "./pages/Home";
import Reunion2026 from "./pages/Reunion2026";
import Batches from "./pages/Batches";
import Directory from "./pages/Directory";
import BloodDonors from "./pages/BloodDonors";
import About from "./pages/About";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";

const App = () => {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-white">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<Navigate to="/homepage" replace />} />
            <Route path="/homepage" element={<Home />} />
            <Route path="/reunion-2026" element={<Reunion2026 />} />
            <Route path="/batches" element={<Batches />} />
            <Route path="/directory" element={<Directory />} />
            <Route path="/blood-donors" element={<BloodDonors />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
};

export default App;
