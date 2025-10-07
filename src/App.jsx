import { Route, HashRouter, Routes } from "react-router-dom";
import UploadPage from "./Components/UploadPage";
import FlipbookPreview from "./Components/FlipbookPreview";

function App() {
  return (
    <>
      <HashRouter>
        <Routes>
          <Route path="/" element={<UploadPage />} />
          <Route path="/flipbook" element={<FlipbookPreview />} />
        </Routes>
      </HashRouter>
      {/* <FlipbookSplit/> */}
    </>
  );
}

export default App;
