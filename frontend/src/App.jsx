import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Wall from './pages/Wall';
import Capture from './pages/Capture';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/wall" element={<Wall />} />
        <Route path="/capture" element={<Capture />} />
        <Route path="*" element={<Navigate to="/wall" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
