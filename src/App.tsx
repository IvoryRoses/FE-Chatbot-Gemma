import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { browserRoutes } from "./routes";

function App() {
  return (
    <Router>
      <Routes>
        {browserRoutes.map((route, index) => (
          <Route key={index} path={route.path} element={route.element} />
        ))}
      </Routes>
    </Router>
  );
}

export default App;
