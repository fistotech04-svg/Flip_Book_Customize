import React, { useState, useRef, useEffect } from "react";
import HTMLFlipBook from "react-pageflip";
import { pdfjs } from "react-pdf";
import styles from "./flipbooksplit.module.css";

pdfjs.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.3.93/pdf.worker.min.mjs";

const UploadPageWithLiveFlipbookAndToc = () => {
  const [pageCount, setPageCount] = useState("");
  const [confirmedPages, setConfirmedPages] = useState(null);

  const [pageConfigs, setPageConfigs] = useState([]); // [{rows:1, cols:1}, ...]
  const [pagesFiles, setPagesFiles] = useState([]); // [[file, file,...], [file,...],...]
  const [pdfPagePreviews, setPdfPagePreviews] = useState({}); // {[pageIndex_cellIndex]: dataURL}
  const [imageFitModes, setImageFitModes] = useState({});
  const [expandedPageIndex, setExpandedPageIndex] = useState(null);

  // TOC entries now include page number for navigation
  const [tocPage, setTocPage] = useState("");
  const [tocCount, setTocCount] = useState("");
  const [tocEntries, setTocEntries] = useState([{ content: "", page: "" }]);

  const flipbookRef = useRef(null);

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
  const flipbookWidth = isSmallLaptop ? 800 : 600;
  const flipbookHeight = isSmallLaptop ? 900 : 800;

  // Page count input change
  const handlePageCountChange = (e) => {
    const value = e.target.value;
    if (/^\d*$/.test(value)) {
      setPageCount(value);
    }
  };

  // Confirm pages and initialize states
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
      );
      setPdfPagePreviews({});
      setImageFitModes({});
      setTocPage("");
      setTocCount("");
      setExpandedPageIndex(null);
      setGotoPage("");
      setTocEntries([{ content: "", page: "" }]);
    }
  };

  // Handle rows/cols changes per page
  const handleRowColChange = (pageIndex, type, value) => {
    if (!/^\d*$/.test(value)) return;
    const intVal = value === "" ? "" : Math.max(1, parseInt(value, 10));
    const newPageConfigs = [...pageConfigs];
    let current = newPageConfigs[pageIndex] || { rows: 1, cols: 1 };
    if (type === "rows") current.rows = intVal;
    else if (type === "cols") current.cols = intVal;
    newPageConfigs[pageIndex] = current;

    const totalCells = (current.rows || 1) * (current.cols || 1);
    const oldFiles = pagesFiles[pageIndex] || [];
    const newFiles = oldFiles.slice(0, totalCells);
    while (newFiles.length < totalCells) newFiles.push(null);

    const newPagesFiles = [...pagesFiles];
    newPagesFiles[pageIndex] = newFiles;

    setPageConfigs(newPageConfigs);
    setPagesFiles(newPagesFiles);
  };

  // Handle file upload
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

  // Generate PDF first page preview
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

  // TOC page input
  const handleTocPageChange = (e) => {
    const val = e.target.value;
    if (/^\d*$/.test(val)) {
      setTocPage(val);
    }
  };

  // TOC entries count input - resize tocEntries array accordingly
  const handleTocCountChange = (e) => {
    const val = e.target.value;
    if (/^\d*$/.test(val)) {
      setTocCount(val);
      const count = parseInt(val, 10);
      if (!isNaN(count) && count > 0) {
        const entries = [...tocEntries];
        while (entries.length < count) entries.push({ content: "", page: "" });
        while (entries.length > count) entries.pop();
        setTocEntries(entries);
      } else {
        setTocEntries([{ content: "", page: "" }]);
      }
    }
  };

  // Update TOC entry content text
  const handleTocEntryChange = (index, value) => {
    const entries = [...tocEntries];
    entries[index].content = value;
    setTocEntries(entries);
  };

  // Update TOC entry page number
  const handleTocEntryPageChange = (index, value) => {
    const entries = [...tocEntries];
    entries[index].page = value;
    setTocEntries(entries);
  };

  // Render upload grid cells for a page
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
              <div>
                {/* <input type="text" placeholder="Image or Video URL"/> */}
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
                      if (file)
                        handleFileChange(pageIndex, cellIndex, {
                          target: { files: [file] },
                        });
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
                      accept="image/*,application/pdf,video/*"
                      style={{ display: "none" }}
                      onChange={(e) =>
                        handleFileChange(pageIndex, cellIndex, e)
                      }
                    />
                  </div>

                  <div style={{ marginTop: 8 }}>
                    <label style={{display:'flex',gap:"10px",alignItems:"baseline",marginLeft:"10px"}}>
                      <input
                      style={{width:"auto"}}
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

                    <label style={{display:'flex',gap:"10px",alignItems:"baseline",marginLeft:"10px"}}>
                      <input
                      style={{width:"auto"}}
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
              </div>
            );
          })}
        </div>
      </>
    );
  };

  const [gotoPage, setGotoPage] = useState("");

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

  //  const handleConfirmPages = () => {
  //   const count = parseInt(pageCount, 10);
  //   if (count > 0) {
  //     setConfirmedPages(count);
  //     setPagesFiles(Array(count).fill(null));
  //     setPdfPagePreviews({});
  //     setGotoPage("");
  //   }
  // };

  // Render flipbook page content live, including clickable TOC
  const renderFlipbookPageContent = (pageIndex) => {
    const pageNumber = pageIndex + 1;
    if (parseInt(tocPage, 10) === pageIndex + 1) {
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
          }}
        >
          <h1 style={{ marginBottom: 24, alignSelf: "center" }}>
            Table of Contents
          </h1>
          {tocEntries.length > 0 ? (
            <ol style={{ fontSize: 16, lineHeight: "1.6" }}>
              {tocEntries.map((entry, idx) => {
                const pageNum = parseInt(entry.page, 10);
                const isValidPage =
                  pageNum && pageNum >= 1 && pageNum <= confirmedPages;
                return (
                  <li
                    key={`toc_entry_${idx}`}
                    style={{
                      marginBottom: 10,
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
                        flipbookRef.current.pageFlip().flip(pageNum - 1);
                      }
                    }}
                  >
                    <span
                      style={{ flex: 1, textAlign: "left" }}
                      className={styles.tabletext}
                    >
                      {entry.content || <i>(Empty)</i>}
                    </span>
                    {isValidPage && (
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          minWidth: 120,
                          marginLeft: 16,
                        }}
                      >
                        <span
                          style={{
                            flex: 1,
                            letterSpacing: 2,
                            fontSize: 18,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                          }}
                        >
                          {".".repeat(50)}
                        </span>
                        <span
                          style={{
                            marginLeft: 8,
                            fontWeight: 700,
                            minWidth: 24,
                            textAlign: "right",
                          }}
                        >
                          {pageNum}
                        </span>
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

    // Filter social media icons assigned to the current page (pageIndex is 0-based)
    const socialsForCurrentPage = socialLinks.filter(
      (social) => social.pages && social.pages.includes(pageIndex + 1)
    );

    // Normal page content grid
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
                  <p className={styles.blank}>Blank {pageIndex + 1}</p>
                </div>
              );
            }

            if (file.type && file.type.includes("pdf")) {
              const preview = pdfPagePreviews[key];
              if (preview) {
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
                      src={preview}
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
              } else {
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
            }

            if (
              (file.type && file.type.startsWith("image")) ||
              file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)
            ) {
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

            // Added video support here:
            if (file.type && file.type.startsWith("video")) {
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
                    src={URL.createObjectURL(file)}
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
        ;{/* Social media icons overlay */}
        {socialsForCurrentPage.length > 0 && (
          <div
            style={{
              position: "absolute",
              bottom: 8,
              right: 8,
              display: "flex",
              gap: "8px",
              backgroundColor: "rgba(255,255,255,0.8)",
              padding: "4px 8px",
              borderRadius: 4,
              zIndex: 10,
            }}
          >
            {socialsForCurrentPage.map((social, idx) => (
              <a
                key={`social_${idx}`}
                href={social.link || "#"}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#333", fontSize: 20 }}
                title={social.name}
              >
                {SOCIAL_LOGOS[social.name]}
              </a>
            ))}
          </div>
        )}
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

  // Preview flipbook in new tab with sessionStorage
  const handlePreviewClick = () => {
    const serializedFiles = pagesFiles.map((page) =>
      page.map((file) => {
        if (!file) return null;
        return {
          name: file.name,
          type: file.type,
          url: URL.createObjectURL(file),
        };
      })
    );

    const data = {
      pageConfigs,
      pagesFiles: serializedFiles,
      imageFitModes,
      pdfPagePreviews,
      tocPage,
      tocEntries,
      confirmedPages,
      socialLinks,
      pagesWithAddedButton: Array.from(pagesWithAddedButton),
    };

    sessionStorage.setItem("flipbookData", JSON.stringify(data));
    window.open("#/Flip_Book_Customize/flipbook", "_blank");
  };

  // Inside your UploadPageWithLiveFlipbookAndToc component, add on top with other useState:
  const ALL_SOCIALS = [
    "Instagram",
    "Facebook",
    "Twitter",
    "LinkedIn",
    "YouTube",
  ];

  const SOCIAL_LOGOS = {
    Instagram: <i className="fa-brands fa-instagram"></i>,
    Facebook: <i className="fa-brands fa-facebook"></i>,
    Twitter: <i className="fa-brands fa-twitter"></i>,
    LinkedIn: <i className="fa-brands fa-linkedin-in"></i>,
    YouTube: <i className="fa-brands fa-youtube"></i>,
  };

  const [availableSocials, setAvailableSocials] = useState(ALL_SOCIALS);
  const [selectedSocial, setSelectedSocial] = useState("");
  const [socialLinks, setSocialLinks] = useState([]); // each item: {name, icon, link, pages: []}
  const [enteredPages, setEnteredPages] = useState(new Set());
  const [excludedPages, setExcludedPages] = useState(new Set());

  // Update availableSocials when socialLinks change
  useEffect(() => {
    const addedSocials = socialLinks.map((s) => s.name);
    const newAvailableSocials = ALL_SOCIALS.filter(
      (s) => !addedSocials.includes(s)
    );
    setAvailableSocials(newAvailableSocials);
  }, [socialLinks]);

  useEffect(() => {
    // Aggregate all pages assigned to any social
    const allPagesSet = new Set();
    socialLinks.forEach((social) => {
      (social.pages || []).forEach((pageNum) => {
        allPagesSet.add(pageNum);
      });
    });
    setEnteredPages(allPagesSet);
  }, [socialLinks]);

  const handleAddSocial = () => {
    if (!selectedSocial) return;
    if (socialLinks.some((s) => s.name === selectedSocial)) return;

    let pages = [];

    if (addAllPagesChecked && confirmedPages) {
      // All pages except excluded ones
      pages = Array.from({ length: confirmedPages }, (_, i) => i + 1).filter(
        (p) => !excludedPages.has(p)
      );
    } else {
      // Only already manually added pages
      pages = Array.from(enteredPages);
    }

    setSocialLinks((prev) => [
      ...prev,
      { name: selectedSocial, link: "", pages },
    ]);
    setSelectedSocial("");
  };

  const handleRemoveSocial = (name) => {
    setSocialLinks((prev) => {
      const updated = prev.filter((s) => s.name !== name);

      // Rebuild enteredPages from remaining socials
      const newPages = new Set();
      updated.forEach((s) => (s.pages || []).forEach((p) => newPages.add(p)));
      setEnteredPages(newPages);

      return updated;
    });
  };

  const handleSocialLinkChange = (index, linkInput) => {
    let fixedLink = linkInput.trim();
    if (fixedLink && !/^https?:\/\//i.test(fixedLink)) {
      fixedLink = "https://" + fixedLink;
    }
    setSocialLinks((prev) =>
      prev.map((social, i) =>
        i === index ? { ...social, link: fixedLink } : social
      )
    );
  };

  const [pageInput, setPageInput] = React.useState("");

  // Update enteredPages state when you add a page manually
  const handleAddPageToSocial = () => {
    const pageNum = parseInt(pageInput);
    if (!pageNum || socialLinks.length === 0) return;

    // Remove from excluded if manually added back
    setExcludedPages((prev) => {
      const copy = new Set(prev);
      copy.delete(pageNum);
      return copy;
    });

    const updated = socialLinks.map((social) => {
      const currentPages = social.pages ?? [];
      if (currentPages.includes(pageNum)) {
        return { ...social, pages: [...currentPages] };
      }
      const newPages = [...currentPages, pageNum].sort((a, b) => a - b);
      return { ...social, pages: newPages };
    });

    setSocialLinks(updated);
    setEnteredPages((prev) => new Set(prev).add(pageNum));
    setPageInput("");
  };

  // Update enteredPages state when you remove a page manually
  const handleRemovePageFromAllSocials = (pageToRemove) => {
    setEnteredPages((prev) => {
      const copy = new Set(prev);
      copy.delete(pageToRemove);
      return copy;
    });

    setExcludedPages((prev) => {
      const copy = new Set(prev);
      copy.add(pageToRemove); // track removed page
      return copy;
    });

    const updated = socialLinks.map((social) => {
      if (!social.pages) return social;
      return {
        ...social,
        pages: social.pages.filter((p) => p !== pageToRemove),
      };
    });
    setSocialLinks(updated);
  };

  const [addAllPagesChecked, setAddAllPagesChecked] = useState(false);

  const handleAddAllPagesToggle = (e) => {
    const checked = e.target.checked;
    setAddAllPagesChecked(checked);

    if (!confirmedPages || confirmedPages < 1) return;

    if (checked) {
      setEnteredPages(new Set()); // Reset enteredPages because all pages will be assigned
      const allPages = Array.from({ length: confirmedPages }, (_, i) => i + 1);
      setSocialLinks((prev) =>
        prev.map((social) => ({ ...social, pages: allPages }))
      );
    } else {
      setSocialLinks((prev) =>
        prev.map((social) => ({ ...social, pages: [] }))
      );
    }
  };

  const [buttonPageInput, setButtonPageInput] = useState("");
  const [pagesWithAddedButton, setPagesWithAddedButton] = useState(new Set());
  const handleAddPageButtonClick = () => {
    const pageNum = parseInt(buttonPageInput, 10);
    if (!pageNum || pageNum < 1 || pageNum > confirmedPages) {
      alert("Please enter a valid page number.");
      return;
    }
    setPagesWithAddedButton((prev) => {
      const newSet = new Set(prev);
      newSet.add(pageNum);
      return newSet;
    });
    setButtonPageInput("");
  };

  return (
    <div className={styles.main}>
      <div className={styles.uploadSection} style={{ maxWidth: 720 }}>
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
          <>
          
            <button
              onClick={handlePreviewClick}
              style={{
                marginTop: 10,
                marginBottom: 12,
                backgroundColor: "#6a1b9a",
                color: "#fff",
                padding: "8px 16px",
                border: "none",
                cursor: "pointer",
              }}
            >
              Preview Flipbook
            </button>

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

            <hr />

            <div style={{ marginTop: 12 }}>
              <label>
                Table of Contents on page:
                <input
                  type="number"
                  min={1}
                  max={confirmedPages}
                  value={tocPage}
                  onChange={handleTocPageChange}
                  placeholder="Page Number"
                />
              </label>
            </div>

            <div style={{ marginTop: 12 }}>
              <label>
                Number of TOC entries:
                <input
                  type="number"
                  min={1}
                  value={tocCount}
                  onChange={handleTocCountChange}
                  placeholder="Number of contents"
                />
              </label>
            </div>

            <div style={{ marginTop: 12 }}>
              {tocEntries.map((entry, idx) => (
                <div
                  key={`toc_entry_${idx}`}
                  style={{ marginBottom: 8, display: "flex", gap: "8px" }}
                >
                  <input
                    type="text"
                    placeholder={`Content ${idx + 1}`}
                    value={entry.content}
                    onChange={(e) => handleTocEntryChange(idx, e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <input
                    type="number"
                    min={1}
                    max={confirmedPages}
                    placeholder="Page #"
                    value={entry.page}
                    onChange={(e) =>
                      handleTocEntryPageChange(idx, e.target.value)
                    }
                    style={{ width: "80px" }}
                  />
                </div>
              ))}
            </div>

            <hr />

            <div
              style={{
                maxWidth: 400,
                marginLeft: "auto",
                marginRight: "auto",
                marginTop: 12,
              }}
            >
              <p>Social Media Links</p>
              <div
                style={{
                  display: "flex",
                  marginBottom: 12,
                  alignItems: "center",
                  gap: "0 10px",
                }}
              >
                <select
                  value={selectedSocial}
                  onChange={(e) => setSelectedSocial(e.target.value)}
                  className={styles.select}
                >
                  <option key="default" value="">
                    Select Social Media
                  </option>
                  {availableSocials.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleAddSocial}
                  disabled={!selectedSocial}
                  style={{ width: "80px" }}
                >
                  Add
                </button>
              </div>

              {socialLinks.map((social, idx) => (
                <div
                  key={social.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "4px 0",
                    borderBottom: "1px solid #eee",
                    gap: "0 10px",
                  }}
                >
                  <div className={styles.icon}>{SOCIAL_LOGOS[social.name]}</div>
                  <input
                    type="text"
                    placeholder="Link"
                    value={social.link}
                    onChange={(e) =>
                      handleSocialLinkChange(idx, e.target.value)
                    }
                    style={{ flex: 1, marginBottom: 0 }}
                  />
                  <div
                    title="Remove"
                    className={styles.trash}
                    onClick={() => handleRemoveSocial(social.name)}
                  >
                    <i class="fa-solid fa-trash"></i>
                  </div>
                </div>
              ))}

              {socialLinks.length > 0 && (
                <div>
                  <div
                    style={{
                      display: "flex",
                      marginTop: 12,
                      marginBottom: 12,
                      alignItems: "center",
                      gap: "0 10px",
                    }}
                  >
                    <input
                      type="number"
                      placeholder="Enter page no to add social media"
                      value={pageInput}
                      onChange={(e) => setPageInput(e.target.value)}
                      style={{ flex: 1, marginBottom: 0 }}
                    />
                    <button
                      onClick={handleAddPageToSocial}
                      disabled={!pageInput}
                      style={{ width: "80px" }}
                    >
                      Add
                    </button>
                  </div>
                  <div
                    style={{
                      marginTop: 8,
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <input
                      type="checkbox"
                      id="addAllPagesCheckbox"
                      checked={addAllPagesChecked}
                      onChange={handleAddAllPagesToggle}
                      style={{ width: "20px" }}
                    />
                    <label
                      htmlFor="addAllPagesCheckbox"
                      style={{ userSelect: "none" }}
                    >
                      Add all pages
                    </label>
                  </div>
                </div>
              )}

              {socialLinks.length > 0 &&
                socialLinks[0].pages &&
                socialLinks[0].pages.map((page, idx) => (
                  <div
                    key={"page-" + page}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      // justifyContent: "space-between",
                      gap: "0 10px",
                      marginTop: 8,
                      maxWidth: 400,
                      marginBottom: 12,
                    }}
                  >
                    <span
                      style={{
                        width: "100%",
                        backgroundColor: "white",
                        padding: "10px 12px",
                        borderRadius: "6px",
                      }}
                    >
                      Page {page} added
                    </span>
                    <div
                      className={styles.trash}
                      onClick={() => handleRemovePageFromAllSocials(page)}
                      title="Remove page"
                    >
                      <i class="fa-solid fa-trash"></i>
                    </div>
                  </div>
                ))}
            </div>

            <hr />

            <div
              style={{
                maxWidth: 400,
                marginLeft: "auto",
                marginRight: "auto",
                marginTop: 12,
              }}
            >
              <p>Add button to fipbook</p>
              <div
                style={{
                  display: "flex",
                  marginBottom: 12,
                  alignItems: "center",
                  gap: "0 10px",
                }}
              >
                <input
                  type="text"
                  placeholder="Enter the page to add button"
                  style={{ marginBottom: "0" }}
                  value={buttonPageInput}
                  onChange={(e) => setButtonPageInput(e.target.value)}
                />
                <button onClick={() => handleAddPageButtonClick()}>Add</button>
              </div>
            </div>

            {/* List of pages with added button */}
            {pagesWithAddedButton.size > 0 && (
              <div
                style={{
                  marginTop: "16px",
                  marginBottom: "8px",
                  padding: "12px",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  backgroundColor: "#f9f9f9",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                }}
              >
                <h3 style={{ fontWeight: "600", marginBottom: "8px" }}>
                  Pages with Added Button
                </h3>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {[...pagesWithAddedButton].map((pageNum) => (
                    <li
                      key={pageNum}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        backgroundColor: "#fff",
                        padding: "8px 12px",
                        marginBottom: "6px",
                        borderRadius: "4px",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                      }}
                    >
                      <span style={{ width: "50%" }}>
                        Page {pageNum} Button
                      </span>
                      <button
                        style={{
                          color: "#d32f2f",
                          fontSize: "14px",
                          fontWeight: "500",
                          border: "none",
                          background: "none",
                          cursor: "pointer",
                          width: "40px",
                          backgroundColor: "rgb(254, 236, 236)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        onClick={() => {
                          setPagesWithAddedButton((prev) => {
                            const updated = new Set(prev);
                            updated.delete(pageNum);
                            return updated;
                          });
                        }}
                      >
                        <i class="fa-solid fa-trash"></i>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <hr />

            {/* Uploads per page */}
            <div style={{ marginTop: 10 }}>
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
                    onClick={() =>
                      setExpandedPageIndex((prev) =>
                        prev === pageIndex ? null : pageIndex
                      )
                    }
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
                      {expandedPageIndex === pageIndex ? "-" : "+"}
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
          </>
        )}
      </div>

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
              disableFlipByClick={true}
              showPageCorners={false}
              swipeDistance={10}
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
                    boxSizing: "border-box",
                    position: "relative", // Needed if overlays used later
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

export default UploadPageWithLiveFlipbookAndToc;
