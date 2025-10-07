import React, { useState, useEffect } from "react";
import UploadPage from "./UploadPage";    // Your upload UI component (updated)
import FlipbookPage from "./FlipbookPage"; // Flipbook rendering component (updated)

const LiveFlipbookPreview = () => {
  const [pageConfigs, setPageConfigs] = useState([]);
  const [pagesFiles, setPagesFiles] = useState([]);
  const [imageFitModes, setImageFitModes] = useState({});
  const [pdfPagePreviews, setPdfPagePreviews] = useState({});

  return (
    <div style={{ display: "flex", gap: 20, padding: 20 }}>
      <div style={{ flex: 1, maxWidth: 400, overflowY: "auto" }}>
        <UploadPage
          pageConfigs={pageConfigs}
          setPageConfigs={setPageConfigs}
          pagesFiles={pagesFiles}
          setPagesFiles={setPagesFiles}
          imageFitModes={imageFitModes}
          setImageFitModes={setImageFitModes}
          pdfPagePreviews={pdfPagePreviews}
          setPdfPagePreviews={setPdfPagePreviews}
        />
      </div>
      <div style={{ flex: 2, height: "90vh", border: "1px solid #ccc" }}>
        <FlipbookPage
          pageConfigs={pageConfigs}
          pagesFiles={pagesFiles}
          imageFitModes={imageFitModes}
          pdfPagePreviews={pdfPagePreviews}
        />
      </div>
    </div>
  );
};

export default LiveFlipbookPreview;
