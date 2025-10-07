import React, { useState, useRef } from "react";
import HTMLFlipBook from "react-pageflip";
import { pdfjs } from "react-pdf";
import styles from "./flipbook.module.css";

pdfjs.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.3.93/pdf.worker.min.mjs";

const Flipbook = () => {
  const [pageCount, setPageCount] = useState("");
  const [confirmedPages, setConfirmedPages] = useState(null);
  const [pagesFiles, setPagesFiles] = useState([]);
  const [pdfPagePreviews, setPdfPagePreviews] = useState({}); // pageIndex -> data URL
  const [gotoPage, setGotoPage] = useState("");
  const flipbookRef = useRef(null);

  const handlePageCountChange = (e) => {
    const value = e.target.value;
    if (/^\d*$/.test(value)) {
      setPageCount(value);
    }
  };

  const handleConfirmPages = () => {
    const count = parseInt(pageCount, 10);
    if (count > 0) {
      setConfirmedPages(count);
      setPagesFiles(Array(count).fill(null));
      setPdfPagePreviews({});
      setGotoPage("");
    }
  };

  const handleFileChange = async (index, e) => {
    const file = e.target.files[0];
    const nextFiles = [...pagesFiles];
    nextFiles[index] = file;
    setPagesFiles(nextFiles);

    if (file.type.includes("pdf")) {
      const dataUrl = await generateFirstPagePreview(file);
      setPdfPagePreviews((prev) => ({ ...prev, [index]: dataUrl }));
    } else {
      setPdfPagePreviews((prev) => {
        const copy = { ...prev };
        delete copy[index];
        return copy;
      });
    }
  };

  async function generateFirstPagePreview(file) {
    const loadingTask = pdfjs.getDocument(URL.createObjectURL(file));
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);

    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: context, viewport }).promise;
    const dataUrl = canvas.toDataURL("image/png");
    pdf.destroy();
    return dataUrl;
  }

  const renderPageContent = (file, pageIndex) => {
    if (!file)
      return (
        <div className={styles.blankcontainer}>
          <p className={styles.blank}>Blank Page {pageIndex + 1}</p>
        </div>
      );

    if (file.type.includes("pdf")) {
      if (pdfPagePreviews[pageIndex]) {
        return (
          <img
            src={pdfPagePreviews[pageIndex]}
            alt={`PDF Page ${pageIndex + 1}`}
            style={{ maxWidth: "100%", maxHeight: "100%" }}
            className={styles.pdf_file}
          />
        );
      } else {
        return <p>Loading preview...</p>;
      }
    } else if (file.type.startsWith("image/")) {
      return (
        <img
          src={URL.createObjectURL(file)}
          alt={`Page ${pageIndex + 1}`}
          className={styles.img_file}
          //   style={{ maxWidth: "100%", maxHeight: "100%" }}
        />
      );
    } else {
      return <p>Unsupported file type</p>;
    }
  };

  const handlePageRedirectChange = (e) => {
    const value = e.target.value;
    if (/^\d*$/.test(value)) {
      setGotoPage(value);
    }
  };

  const handleGoClick = () => {
    const pageNumber = parseInt(gotoPage, 10);
    if (
      pageNumber &&
      flipbookRef.current &&
      pageNumber >= 1 &&
      pageNumber <= confirmedPages
    ) {
      flipbookRef.current.pageFlip().flip(pageNumber - 1);
    }
  };

  return (
    <div className={styles.main}>
      <div className={styles.uploadSection}>
        <input
          type="number"
          min={1}
          value={pageCount}
          onChange={handlePageCountChange}
          placeholder="Enter Number of Pages.."
        />
        <button
          onClick={handleConfirmPages}
          disabled={!pageCount || pageCount < 1}
        >
          Create Flip Book
        </button>

        {/* Page jump input */}
        {confirmedPages && (
          <div style={{ marginTop: 12 }}>
            <input
              type="number"
              min={1}
              max={confirmedPages}
              value={gotoPage}
              placeholder={`Enter page 1-${confirmedPages}`}
              onChange={handlePageRedirectChange}
            />
            <button
              style={{ backgroundColor: "#940b7bff" }}
              onClick={handleGoClick}
            >
              Find Page
            </button>
          </div>
        )}

        {confirmedPages &&
          Array.from({ length: confirmedPages }).map((_, idx) => (
            <>
              {/* <input type="number" /> */}
              <div key={`upload_${idx}`} className={styles.fileUploadBox}>
                <div
                  className={styles.dropArea}
                  onClick={() =>
                    document.getElementById(`fileInput_${idx}`).click()
                  }
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files[0];
                    if (file) {
                      handleFileChange(idx, { target: { files: [file] } });
                    }
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) =>
                    e.key === "Enter" &&
                    document.getElementById(`fileInput_${idx}`).click()
                  }
                >
                  <i
                    className="fa-solid fa-cloud-arrow-up"
                    id={styles.uploadIcon}
                  ></i>
                  <span className={styles.uploadPrompt}>
                    {pagesFiles[idx]
                      ? getDisplayFileName(pagesFiles[idx])
                      : `Upload your page ${idx + 1}`}
                  </span>
                  <input
                    id={`fileInput_${idx}`}
                    type="file"
                    accept="application/pdf,image/*"
                    style={{ display: "none" }}
                    onChange={(e) => handleFileChange(idx, e)}
                  />
                </div>
              </div>
            </>
          ))}
      </div>

      <div className={styles.book}>
        {confirmedPages && (
          <HTMLFlipBook
            ref={flipbookRef}
            width={450}
            height={600}
            showCover={true}
            size="stretch"
            className={styles.flipbook}
            // style={{ marginTop: 32 }}
            loop={true}
          >
            {Array.from({ length: confirmedPages }).map((_, idx) => (
              <div
                key={`page_${idx}`}
                className={styles.demoPage}
                style={{ overflow: "hidden", textAlign: "center" }}
              >
                {renderPageContent(pagesFiles[idx], idx)}
              </div>
            ))}
          </HTMLFlipBook>
        )}
      </div>
    </div>
  );
};

// Helper function should be declared in the same file or imported
const getDisplayFileName = (file) => {
  if (!file) return "Upload your file here";
  const name = file.name;
  if (name.length <= 18) return name;
  const extIndex = name.lastIndexOf(".");
  const ext = extIndex !== -1 ? name.slice(extIndex) : "";
  const base = name.slice(0, 10);
  return `${base}......${ext}`;
};

export default Flipbook;
