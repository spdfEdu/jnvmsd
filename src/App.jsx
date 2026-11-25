import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import Home from "./pages/Home";
import Reunion2026 from "./pages/Reunion2026";
import Batches from "./pages/Batches";
import Directory from "./pages/Directory";
import BloodDonors from "./pages/BloodDonors";
import Events from "./pages/Events";
import Gallery from "./pages/Gallery";
import About from "./pages/About";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";
import AuthProvider from "./auth/AuthProvider";
import Profile from "./pages/Profile";
import Manage from "./pages/Manage";
import Organizers from "./pages/Organizers";


/** Render the app view. */
const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter
        basename={import.meta.env.BASE_URL.replace(/\/$/, "") || "/"}
      >
        <div className="flex flex-col min-h-screen">
          <Navbar />
          
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Navigate to="/homepage" replace />} />
              <Route path="/homepage" element={<Home />} />
              <Route path="/reunion-2026" element={<Reunion2026 />} />
              <Route path="/batches" element={<Batches />} />
              <Route path="/directory" element={<Directory />} />
              <Route path="/blood-donors" element={<BloodDonors />} />
              <Route path="/events" element={<Events />} />
              <Route path="/gallery" element={<Gallery />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/manage" element={<Manage />} />
              <Route path="/organizers" element={<Organizers />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
