import React, { useState, useRef, useEffect } from "react";
import HTMLFlipBook from "react-pageflip";
import { pdfjs } from "react-pdf";
import styles from "./flipbooksplit.module.css";
import BASE_BACKGROUND_IMAGE_URL from "../assets/image_white.png";

pdfjs.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.3.93/pdf.worker.min.mjs";

const FlipbookSplit = () => {
  // Number of flipbook pages
  const [pageCount, setPageCount] = useState("");
  const [confirmedPages, setConfirmedPages] = useState(null);

  // For each page: row & col config and uploads
  const [pageConfigs, setPageConfigs] = useState([]); // [{rows:1, cols:1}, ...]
  // Store uploaded files per page per cell: Array of pages -> Array of files (per cell)
  const [pagesFiles, setPagesFiles] = useState([]); // [[file, file,...], [file,...],...]

  const [pdfPagePreviews, setPdfPagePreviews] = useState({}); // {[pageIndex_cellIndex]: dataURL}
  const [gotoPage, setGotoPage] = useState("");
  const flipbookRef = useRef(null);

  const [expandedPageIndex, setExpandedPageIndex] = useState(null);

  const [imageFitModes, setImageFitModes] = useState({}); // { "pageIndex_cellIndex": "cover" | "contain" }

  // Responsive state
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);

  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    function handleResize() {
      setIsMobileOrTablet(window.innerWidth <= 768);
      setWindowWidth(window.innerWidth);
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isSmallLaptop = windowWidth >= 769 && windowWidth <= 1200;
  const flipbookWidth = isSmallLaptop ? 800 : 600; //width
  const flipbookHeight = isSmallLaptop ? 900 : 800; //height

  // Handle input change for pageCount
  const handlePageCountChange = (e) => {
    const value = e.target.value;
    if (/^\d*$/.test(value)) {
      setPageCount(value);
    }
  };

  // Confirm page count, initialize pageConfigs and pagesFiles
  const handleConfirmPages = () => {
    const count = parseInt(pageCount, 10);
    if (count > 0) {
      setConfirmedPages(count);
      setPageConfigs(
        Array(count)
          .fill(null)
          .map(() => ({ rows: 1, cols: 1 }))
      );
      setPagesFiles(
        Array(count)
          .fill(null)
          .map(() => [null])
      ); // 1 cell per page by default
      setPdfPagePreviews({});
      setGotoPage("");
    }
  };

  // Handle rows or cols change for a given page index
  const handleRowColChange = (pageIndex, type, value) => {
    if (!/^\d*$/.test(value)) return;
    const intVal = value === "" ? "" : Math.max(1, parseInt(value, 10));
    const newPageConfigs = [...pageConfigs];
    let current = newPageConfigs[pageIndex];
    if (!current) current = { rows: 1, cols: 1 };
    // Update rows or cols
    if (type === "rows") current.rows = intVal;
    else if (type === "cols") current.cols = intVal;

    newPageConfigs[pageIndex] = current;

    // Update pagesFiles for this page according to new rows * cols
    const totalCells = (current.rows || 1) * (current.cols || 1);
    const oldFiles = pagesFiles[pageIndex] || [];
    const newFiles = oldFiles.slice(0, totalCells);
    while (newFiles.length < totalCells) newFiles.push(null);

    const newPagesFiles = [...pagesFiles];
    newPagesFiles[pageIndex] = newFiles;

    setPageConfigs(newPageConfigs);
    setPagesFiles(newPagesFiles);
  };

  // Handle file upload per page per cell
  const handleFileChange = async (pageIndex, cellIndex, e) => {
    const file = e.target.files[0];
    if (!file) return;

    const newPagesFiles = [...pagesFiles];
    const pageFiles = [...(newPagesFiles[pageIndex] || [])];
    pageFiles[cellIndex] = file;
    newPagesFiles[pageIndex] = pageFiles;
    setPagesFiles(newPagesFiles);

    if (file.type.includes("pdf")) {
      const dataUrl = await generateFirstPagePreview(file);
      setPdfPagePreviews((prev) => ({
        ...prev,
        [`${pageIndex}_${cellIndex}`]: dataUrl,
      }));
    } else {
      setPdfPagePreviews((prev) => {
        const copy = { ...prev };
        delete copy[`${pageIndex}_${cellIndex}`];
        return copy;
      });
    }
  };

  // Generate PDF first page preview canvas to data URL
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

  // Render upload grid cells for a specific page
  const renderUploadGridForPage = (pageIndex) => {
    const config = pageConfigs[pageIndex] || { rows: 1, cols: 1 };
    const totalCells = (config.rows || 1) * (config.cols || 1);
    const pageFilesForCells = pagesFiles[pageIndex] || [];
    return (
      <>
        <div style={{ marginBottom: 8 }}>
          <label>
            Rows:
            <input
              type="number"
              min={1}
              value={config.rows}
              onChange={(e) =>
                handleRowColChange(pageIndex, "rows", e.target.value)
              }
            />
          </label>
          <label>
            Columns:
            <input
              type="number"
              min={1}
              value={config.cols}
              onChange={(e) =>
                handleRowColChange(pageIndex, "cols", e.target.value)
              }
            />
          </label>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(2, 1fr)`,
            gap: 12,
          }}
        >
          {Array.from({ length: totalCells }).map((_, cellIndex) => {
            const key = `${pageIndex}_${cellIndex}`;
            const selectedFit = imageFitModes[key] || "contain";

            return (
              <div
                key={`page_${pageIndex}_cell_${cellIndex}`}
                className={styles.fileUploadBox}
              >
                <div
                  className={styles.dropArea}
                  onClick={() =>
                    document
                      .getElementById(`fileInput_${pageIndex}_${cellIndex}`)
                      .click()
                  }
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files[0];
                    if (file) {
                      handleFileChange(pageIndex, cellIndex, {
                        target: { files: [file] },
                      });
                    }
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) =>
                    e.key === "Enter" &&
                    document
                      .getElementById(`fileInput_${pageIndex}_${cellIndex}`)
                      .click()
                  }
                >
                  <i
                    className="fa-solid fa-cloud-arrow-up"
                    id={styles.uploadIcon}
                  ></i>
                  <span className={styles.uploadPrompt}>
                    {pageFilesForCells[cellIndex]
                      ? getDisplayFileName(pageFilesForCells[cellIndex])
                      : `Upload cell ${cellIndex + 1}`}
                  </span>
                  <input
                    id={`fileInput_${pageIndex}_${cellIndex}`}
                    type="file"
                    accept="application/pdf,image/*"
                    style={{ display: "none" }}
                    onChange={(e) => handleFileChange(pageIndex, cellIndex, e)}
                  />
                </div>

                {/* Add radio buttons below */}
                <div style={{ marginTop: 8 }}>
                  <label style={{display:'flex',gap:"10px"}}>
                    <input
                      type="radio"
                      name={`fit_mode_${key}`}
                      value="contain"
                      checked={selectedFit === "contain"}
                      onChange={() =>
                        setImageFitModes((prev) => ({
                          ...prev,
                          [key]: "contain",
                        }))
                      }
                    />
                    Contain
                  </label>

                  <label style={{display:'flex',gap:"10px"}}>
                    <input
                      type="radio"
                      name={`fit_mode_${key}`}
                      value="cover"
                      checked={selectedFit === "cover"}
                      onChange={() =>
                        setImageFitModes((prev) => ({
                          ...prev,
                          [key]: "cover",
                        }))
                      }
                    />
                    Cover
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      </>
    );
  };

  // Render flipbook page content split by its row*col grid

  const renderFlipbookPageContent = (pageIndex) => {
    const config = pageConfigs[pageIndex] || { rows: 1, cols: 1 };
    const totalCells = (config.rows || 1) * (config.cols || 1);
    const pageFilesForCells = pagesFiles[pageIndex] || [];

    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${config.cols}, 1fr)`,
          gridTemplateRows: `repeat(${config.rows}, auto)`,
          gap: 4,
          padding: 8,
          boxSizing: "border-box",
          overflow: "hidden",
          height: "100%",
          width: "100%",
        }}
        className={styles.book_frame}
      >
        {Array.from({ length: totalCells }).map((_, cellIndex) => {
          const file = pageFilesForCells[cellIndex];

          const key = `${pageIndex}_${cellIndex}`;
          const fitMode = imageFitModes[key] || "contain";

          if (!file)
            return (
              <div
                key={`flip_cell_${pageIndex}_${cellIndex}`}
                className={styles.blankcontainer}
                style={{
                  border: "1px dashed #999",
                  overflow: "hidden",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  aspectRatio: "3 / 4",
                  height: "100%",
                  width: "100%",
                  position: "relative",
                }}
              >
                <p className={styles.blank}>Blank</p>
              </div>
            );

          if (file.type.includes("pdf")) {
            const preview = pdfPagePreviews[`${pageIndex}_${cellIndex}`];
            if (preview) {
              return (
                <div
                  key={`flip_cell_img_${pageIndex}_${cellIndex}`}
                  style={{
                    border: "1px solid #ccc",
                    overflow: "hidden",
                    aspectRatio: "3 / 4",
                    height: "100%",
                    width: "100%",
                    position: "relative",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <img
                    src={preview}
                    alt={`PDF cell ${cellIndex + 1}`}
                    className={styles.pdf_file}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: fitMode,
                      display: "block",
                    }}
                  />
                </div>
              );
            } else {
              return (
                <div
                  key={`flip_cell_loading_${pageIndex}_${cellIndex}`}
                  className={styles.img_file}
                  style={{
                    border: "1px solid #ccc",
                    aspectRatio: "3 / 4",
                    height: "100%",
                    width: "100%",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <p>Loading preview...</p>
                </div>
              );
            }
          }

          if (file.type.startsWith("image/")) {
            return (
              <div
                key={`flip_cell_img_${pageIndex}_${cellIndex}`}
                style={{
                  border: "1px solid #ccc",
                  overflow: "hidden",
                  aspectRatio: "3 / 4",
                  height: "100%",
                  width: "100%",
                  position: "relative",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <img
                  src={URL.createObjectURL(file)}
                  alt={`Cell ${cellIndex + 1}`}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: fitMode,
                    display: "block",
                  }}
                />
              </div>
            );
          }

          return (
            <div
              key={`flip_cell_unsupported_${pageIndex}_${cellIndex}`}
              style={{
                border: "1px solid #ccc",
                aspectRatio: "3 / 4",
                height: "100%",
                width: "100%",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                color: "#999",
              }}
            >
              <p>Unsupported file type</p>
            </div>
          );
        })}
      </div>
    );
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
      {/* Hide upload section on mobile/tablet */}
      {!isMobileOrTablet && (
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

          {confirmedPages && (
            <div style={{ marginTop: 10 }}>
              <input
                type="number"
                min={1}
                max={confirmedPages}
                value={gotoPage}
                placeholder={`Jump to page (1-${confirmedPages})`}
                onChange={handlePageRedirectChange}
              />
              <button onClick={handleGoClick}>Go</button>
            </div>
          )}

          {confirmedPages && (
            <div style={{ marginTop: 20 }}>
              {Array.from({ length: confirmedPages }).map((_, pageIndex) => (
                <div
                  key={`accordion_page_${pageIndex}`}
                  style={{
                    marginBottom: 12,
                    borderRadius: 4,
                    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                    overflow: "hidden",
                    border: "1px solid #ccc",
                  }}
                >
                  <div
                    onClick={() => {
                      setExpandedPageIndex((prev) =>
                        prev === pageIndex ? null : pageIndex
                      );
                    }}
                    style={{
                      backgroundColor:
                        expandedPageIndex === pageIndex ? "#4a148c" : "#6a1b9a",
                      color: "#fff",
                      padding: "12px 16px",
                      cursor: "pointer",
                      fontWeight: "bold",
                      userSelect: "none",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span>Page {pageIndex + 1} Upload</span>
                    <span style={{ fontSize: 18 }}>
                      {expandedPageIndex === pageIndex ? "−" : "+"}
                    </span>
                  </div>
                  {expandedPageIndex === pageIndex && (
                    <div
                      style={{
                        padding: 16,
                        backgroundColor: "#fafafa",
                        borderTop: "1px solid #ccc",
                        transition: "max-height 0.3s ease",
                        perspective: 0,
                      }}
                    >
                      {renderUploadGridForPage(pageIndex)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className={styles.book} style={{ flex: 1, overflow: "hidden" }}>
        {confirmedPages &&
          (!isMobileOrTablet ? (
            <HTMLFlipBook
              ref={flipbookRef}
              width={flipbookWidth}
              height={flipbookHeight}
              showCover={true}
              size="stretch"
              className={styles.flipbook}
              // loop={true}
            >
              {Array.from({ length: confirmedPages }).map((_, pageIndex) => (
                <div
                  key={`flip_page_${pageIndex}`}
                  className={styles.demoPage}
                  style={{
                    overflow: "hidden",
                    textAlign: "center",
                    height: "100%",
                    width: "100%",
                    margin: 0,
                    padding: 0,
                  }}
                >
                  {renderFlipbookPageContent(pageIndex)}
                </div>
              ))}
            </HTMLFlipBook>
          ) : (
            <div className={styles.smallcontainer}>
              {Array.from({ length: confirmedPages }).map((_, pageIndex) => (
                <div
                  key={`scroll_page_${pageIndex}`}
                  className={styles.smallbox}
                >
                  {renderFlipbookPageContent(pageIndex)}
                </div>
              ))}
            </div>
          ))}
      </div>
    </div>
  );
};

const getDisplayFileName = (file) => {
  if (!file) return "Upload your file here";
  const name = file.name;
  if (name.length <= 18) return name;
  const extIndex = name.lastIndexOf(".");
  const ext = extIndex !== -1 ? name.slice(extIndex) : "";
  const base = name.slice(0, 5);
  return `${base}...${ext}`;
};

export default FlipbookSplit;
