import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import About from './pages/About';
import Work from './pages/Work';
import Pricing from './pages/Pricing';
import Automation from './pages/Automation';
import ThreeBackground from './components/ThreeBackground';

function App() {
  return (
    <Router>
      <div className="app-container">
        <ThreeBackground />
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/work" element={<Work />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/automation" element={<Automation />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
