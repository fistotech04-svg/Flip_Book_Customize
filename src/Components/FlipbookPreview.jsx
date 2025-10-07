import React, { useState, useEffect, useRef } from "react";
import HTMLFlipBook from "react-pageflip";
import styles from "./flipbooksplit.module.css";

const FlipbookPage = () => {
  const flipbookRef = useRef(null);
  const [pageConfigs, setPageConfigs] = useState([]);
  const [pagesFiles, setPagesFiles] = useState([]);
  const [imageFitModes, setImageFitModes] = useState({});
  const [pdfPagePreviews, setPdfPagePreviews] = useState({});
  const [tocPage, setTocPage] = useState(null);
  const [tocEntries, setTocEntries] = useState([]);
  const [socialLinks, setSocialLinks] = useState([]);
  const [pagesWithAddedButton, setpagesWithAddedButton] = useState(new Set());

  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  const SOCIAL_LOGOS = {
    Instagram: <i className="fa-brands fa-instagram"></i>,
    Facebook: <i className="fa-brands fa-facebook"></i>,
    Twitter: <i className="fa-brands fa-twitter"></i>,
    LinkedIn: <i className="fa-brands fa-linkedin-in"></i>,
    YouTube: <i className="fa-brands fa-youtube"></i>,
  };

  useEffect(() => {
    function handleResize() {
      setIsMobileOrTablet(window.innerWidth <= 768);
      setWindowWidth(window.innerWidth);
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const dataStr = sessionStorage.getItem("flipbookData");
    if (dataStr) {
      const data = JSON.parse(dataStr);

      setPageConfigs(data.pageConfigs || []);
      setImageFitModes(data.imageFitModes || {});
      setPdfPagePreviews(data.pdfPagePreviews || {});
      setTocPage(data.tocPage ? parseInt(data.tocPage, 10) : null);
      setpagesWithAddedButton(new Set(data.pagesWithAddedButton || []));

      if (
        Array.isArray(data.tocEntries) &&
        typeof data.tocEntries[0] === "object"
      ) {
        setTocEntries(data.tocEntries);
      } else if (Array.isArray(data.tocEntries)) {
        setTocEntries(data.tocEntries.map((content) => ({ content, page: "" })));
      } else {
        setTocEntries([]);
      }

      setPagesFiles(data.pagesFiles || []);

      // Add icons to social links
      const loadedSocials = data.socialLinks || [];
      const socialsWithIcons = loadedSocials.map((s) => ({
        ...s,
        icon: SOCIAL_LOGOS[s.name] || null,
      }));
      setSocialLinks(socialsWithIcons);
    }
  }, []);

  const isSmallLaptop = windowWidth >= 769 && windowWidth <= 1200;
  const flipbookWidth = isSmallLaptop ? 800 : 600;
  const flipbookHeight = isSmallLaptop ? 900 : 800;

  // Render a full TOC page or the normal page content
  const renderFlipbookPageContent = (pageIndex) => {
    const pageNumber = pageIndex + 1;

    // Render TOC page if applicable
    if (tocPage === pageNumber) {
      return (
        <div
          style={{
            padding: 24,
            height: "100%",
            width: "100%",
            boxSizing: "border-box",
            display: "flex",
            justifyContent: "center",
            flexDirection: "column",
            backgroundColor: "#fafafa",
            border: "1px solid #ccc",
            borderRadius: 8,
            overflowY: "auto",
          }}
        >
          <h1 style={{ marginBottom: 24, alignSelf: "center" }}>
            Table of Contents
          </h1>
          {tocEntries.length > 0 ? (
            <ol style={{ fontSize: 16, lineHeight: "1.6" }}>
              {tocEntries.map((entry, idx) => {
                const content = entry.content ?? entry;
                const entryPageNum = parseInt(entry.page, 10);
                const isValidPage =
                  entryPageNum && entryPageNum >= 1 && entryPageNum <= pageConfigs.length;
                return (
                  <li
                    key={`toc_entry_${idx}`}
                    style={{
                      marginBottom: 12,
                      fontWeight: "500",
                      fontSize: 20,
                      cursor: isValidPage ? "pointer" : "default",
                      userSelect: "none",
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                    }}
                    onClick={() => {
                      if (isValidPage && flipbookRef.current) {
                        flipbookRef.current.pageFlip().flip(entryPageNum - 1);
                      }
                    }}
                  >
                    <span style={{ flex: 1, textAlign: "left" }} className={styles.tabletext}>
                      {content || <i>(Empty)</i>}
                    </span>
                    {isValidPage && (
                      <span
                        style={{
                          marginLeft: 8,
                          fontWeight: 700,
                          minWidth: 24,
                          textAlign: "right",
                        }}
                      >
                        {entryPageNum}
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          ) : (
            <p>No Table of Contents entries added.</p>
          )}
        </div>
      );
    }

    // Find social media icons assigned to this page
    const socialsForCurrentPage = socialLinks.filter(
      (social) => social.pages && social.pages.includes(pageNumber)
    );

    const config = pageConfigs[pageIndex] || { rows: 1, cols: 1 };
    const totalCells = (config.rows || 1) * (config.cols || 1);
    const pageFilesForCells = pagesFiles[pageIndex] || [];

    return (
      <div style={{ position: "relative", height: "100%", width: "100%" }}>
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

            if (!file) {
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
                  <p className={styles.blank}>Blank {pageNumber}</p>
                </div>
              );
            }

            if (file.type && file.type.includes("pdf")) {
              const previewUrl = pdfPagePreviews[key];
              if (previewUrl) {
                return (
                  <div
                    key={`flip_cell_pdf_preview_${key}`}
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
                      src={previewUrl}
                      alt={`PDF preview cell ${cellIndex + 1}`}
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
                  key={`flip_cell_pdf_loading_${key}`}
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
                  <p>Loading PDF preview...</p>
                </div>
              );
            }

            if (file.type && file.type.startsWith("image/")) {
              const imageUrl = file.url || URL.createObjectURL(file);
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
                    src={imageUrl}
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

            // Added video support here:
    if (file.type && file.type.startsWith("video/")) {
      const videoUrl = file.url || URL.createObjectURL(file);
      return (
        <div
          key={`flip_cell_video_${pageIndex}_${cellIndex}`}
          style={{
            border: "1px solid #ccc",
            overflow: "hidden",
            aspectRatio: "16 / 9",
            height: "100%",
            width: "100%",
            position: "relative",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <video
            src={videoUrl}
            controls
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
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

        {/* Social media icons overlay */}
        {socialsForCurrentPage.length > 0 && (
          <div
            style={{
              position: "absolute",
              bottom: 8,
              right: 8,
              display: "flex",
              gap: 8,
              backgroundColor: "rgba(255,255,255,0.8)",
              padding: "4px 8px",
              borderRadius: 4,
              zIndex: 10,
            }}
          >
            {socialsForCurrentPage.map((social, index) => (
              <a
                key={index}
                href={social.link || "#"}
                target="_blank"
                rel="noopener noreferrer"
                title={social.name}
                style={{ color: "#333", fontSize: 20 }}
              >
                {social.icon}
              </a>
            ))}
          </div>
        )}

        {console.log("button",pagesWithAddedButton)}

        {/* Page Button */}
        {pagesWithAddedButton.has(pageNumber) && (
          <button
            style={{
              position: "absolute",
              top: 10,
              left: 10,
              width: 100,
              padding: "6px 12px",
              backgroundColor: "#6a1b9a",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              zIndex: 20, // higher than socials
            }}
            onClick={() => alert(`Button on page ${pageNumber} clicked!`)}
          >
            Button
          </button>
        )}
      </div>
    );
  };

  return (
    <div
      className={styles.main}
      style={{ alignItems: "center", backgroundColor: "#333", justifyContent: "center" }}
    >
      {pageConfigs.length > 0 ? (
        !isMobileOrTablet ? (
          <HTMLFlipBook
            ref={flipbookRef}
            width={flipbookWidth}
            height={flipbookHeight}
            showCover
            size="stretch"
            className={styles.flipbook}
            disableFlipByClick={true}
            showPageCorners={false}
          >
            {pageConfigs.map((_, idx) => (
              <div
                key={idx}
                className={styles.demoPage}
                style={{
                  overflow: "hidden",
                  textAlign: "center",
                  height: "100%",
                  width: "100%",
                  padding: 0,
                  margin: 0,
                  boxSizing: "border-box",
                  position: "relative",
                }}
              >
                {renderFlipbookPageContent(idx)}
              </div>
            ))}
          </HTMLFlipBook>
        ) : (
          <div className={styles.smallcontainer}>
            {pageConfigs.map((_, idx) => (
              <div key={idx} className={styles.smallbox}>
                {renderFlipbookPageContent(idx)}
              </div>
            ))}
          </div>
        )
      ) : (
        <p style={{ padding: 20, color: 'white' }}>No flipbook data found.</p>
      )}
    </div>
  );
};

export default FlipbookPage;
