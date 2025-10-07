import React, { useState, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import HTMLFlipBook from "react-pageflip";
import styles from "./mybook.module.css";

pdfjs.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.3.93/pdf.worker.min.mjs";

const My_Book = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [showBook, setShowBook] = useState(false); // Controls book display
  const inputRef = useRef(null);

  const validateFile = (file) =>
    file && file.type.includes("pdf") && file.size <= 30 * 1024 * 1024;

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (validateFile(file)) {
      setSelectedFile(file);
      setNumPages(null);
      setShowBook(false); // Reset viewer
    } else {
      alert("Please upload a PDF file (max 30MB).");
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (validateFile(file)) {
      setSelectedFile(file);
      setNumPages(null);
      setShowBook(false); // Reset viewer
    } else {
      alert("Please drop a PDF file (max 30MB).");
    }
  };

  const handleDragOver = (e) => e.preventDefault();

  const [currentPage, setCurrentPage] = useState(0);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  const getDisplayFileName = (file) => {
    if (!file) return "Upload your file here";
    const name = file.name;
    if (name.length <= 18) return name;
    const extIndex = name.lastIndexOf(".");
    const ext = extIndex !== -1 ? name.slice(extIndex) : "";
    const base = name.slice(0, 10);
    return `${base}......${ext}`;
  };

  return (
    <div className={styles.main}>
      <div className={styles.uploadSection}>
        <div
          className={styles.dropArea}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => inputRef.current.click()}
          role="button"
          aria-label="Upload PDF file"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current.click()}
        >
          <i className="fa-solid fa-cloud-arrow-up" id={styles.uploadIcon}></i>
          <span className={styles.uploadPrompt}>
            {getDisplayFileName(selectedFile)}
          </span>
          <input
            type="file"
            accept="application/pdf"
            ref={inputRef}
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
        </div>
        <button
          className={
            !selectedFile || showBook
              ? styles.readButton_diable
              : styles.readButton
          }
          disabled={!selectedFile || showBook}
          onClick={() => setShowBook(true)}
        >
          Read
        </button>
      </div>
      {selectedFile && showBook && (
        <Document
          file={selectedFile}
          onLoadSuccess={onDocumentLoadSuccess}
          loading="Loading PDF..."
          className={styles.document}
        >
          {numPages && (
            <HTMLFlipBook
              width={450}
              height={600}
              showCover={true}
              startPage={0}
              size="stretch"
              maxShadowOpacity={0.5}
              drawShadow={true}
              mobileScrollSupport={true}
              className={`${styles.flipbook} ${
                currentPage > 0 ? styles.hasShadow : ""
              }`}
              onFlip={(e) => setCurrentPage(e.data)}
            >
              {[...Array(numPages)].map((_, index) => (
                <div key={`page_${index + 1}`} className={styles.demoPage}>
                  <Page
                    pageNumber={index + 1}
                    width={450}
                    height={600}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                  />
                </div>
              ))}
            </HTMLFlipBook>
          )}
        </Document>
      )}
    </div>
  );
};

export default My_Book;
