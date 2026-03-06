import { Routes, Route } from "react-router-dom";
import WelcomePage from "./WelcomePage";
import OcrPage from "./OcrPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<WelcomePage />} />
      <Route path="/ocr" element={<OcrPage />} />
    </Routes>
  );
}
