function detectColumns(items){
  let result = "";
  let lastX = null;
  let lastY = null;

  for ( const item of items) {
    const x = item.transform[4];
    const y = item.transform[5];
  
    if(lastY !== null && Math.abs(y - lastY) > 5) {
      result += "\n";
    } else if (lastX !== null && x - lastX > 50) {
      result += ", ";
    } else {
      result += " ";
    }

    result += item.str;
    lastX = x + (item.width || 0);
    lastY = y;
  }

  return result;
}
// ============================================
// SECTION KEYWORDS
// All known resume section headers
// ============================================
const SECTION_KEYWORDS = [
  "experience", "work experience", "employment",
  "education", "academic background",
  "skills", "technical skills", "core competencies",
  "projects", "certifications", "awards",
  "summary", "objective", "profile", "email*", "Zip code"
];

function extractTextFromPDF(file) {
  return new Promise(async (resolve, reject) =>{
    try {
      const arrayBuffer = await file.arrayBuffer();

      const bytes = new Uint8Array(arrayBuffer.slice(0, 5));
      const header = String.fromCharCode(...bytes);
      if (!header.startsWith("%PDF-")) {
        reject(new Error("File is not a valid PDF."));
        return;
      }

      pdfjsLib.GlobalWorkerOptions.workerSrc = 
        browser.runtime.getURL("pdf.worker.min.js");

      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer}).promise;
      let fullText = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = detectColumns(content.items);
        fullText += pageText + "\n\n";
      }

      resolve(fullText);
    } catch (err) {
      reject (err);
    }
  });
}
// ============================================
// PARSER UTILITIES
// ============================================

// Checks if a line is empty or just decorative dividers
function isJunkLine(line) {
  const cleaned = line.trim();
  return cleaned === "" ||
         /^[-_.•|=*]+$/.test(cleaned);
}

// Checks if a line matches any known section keyword
// Returns matched keyword or null
function detectSection(line) {
  const cleaned = line.trim().toLowerCase();
  return SECTION_KEYWORDS.find(keyword =>
    cleaned.includes(keyword)) || null;
}

function extractPersonalInfo(lines){
  const personal = {};

  for (const line of lines) {
    const parts = line.split(/[|,]/).map(p => p.trim()).filter(Boolean);
  
    for ( const part of parts){
      if (part.includes("@")) {
        personal.email = part;
      } else if(/[\d\s\-\+\(\)]{7,}/.test(part)){
        personal.phone = part;
      } else if(
        /\b(St|Ave|Rd|Blvd|Dr|Lane|Ln|Court|Ct|Way)\b/i.test(part) ||
        /\b[A-Z]{2}\b/.test(part) ||
        /\d{5}/.test(part)
      ) {
        personal.address = part;
      } else if(/^]A-Z][a-z]+(\s[A-Z][a-z]+)$/.test(part)){
        personal.name = part;
      }
    }
  }
  return personal;

}
// Organizes raw text into categorized resume sections
function parseResume(text) {
  const lines = text.split("\n");
  const result = {};
  let currentSection = null;
  const personalLines = [];


  for (const line of lines) {
    if (isJunkLine(line)) continue;

    const section = detectSection(line);
    if (section) {
      currentSection = section;
      if (!result[currentSection]) {
        result[currentSection] = [];
      }
    } else if (currentSection && line.trim() !== "") {
      result[currentSection].push(line.trim());
    } else if (!currentSection && line.trim() !== "") {
      personalLines.push(line.trim());
    }
  }

  if (personalLines.length > 0 ) {
    result.personal = extractPersonalInfo(personalLines);
  }

  return result;
}

// ============================================
// STORAGE
// Saves and loads resume data from extension storage
// ============================================

async function saveResumeData(parsed) {
  await browser.storage.local.set({ resumeData: parsed });
}

async function loadResumeData() {
  const result = await browser.storage.local.get("resumeData");
  return result.resumeData || null;
}

// ============================================
// DISPLAY
// Renders feedback and results to the popup UI
// ============================================

// Shows status message — green for success, red for error
function showStatus(message, isError = false) {
  const status = document.getElementById("status");
  status.textContent = message;
  status.style.color = isError ? "red" : "green";
}

// Renders parsed resume sections as cards
function displayResults(parsed) {
  const output = document.getElementById("output");
  output.innerHTML = "";

  for (const [section, value] of Object.entries(parsed)) {
    const card = document.createElement("div");
    card.className = "section-card";

    const heading = document.createElement("h3");
    heading.textContent = section.toUpperCase();
    card.appendChild(heading);

    const list = document.createElement("ul");

    if(section === "personal") {
      Object.entries(value).forEach(([key, val]) => {
        const item = document.createElement("li");
        item.textContent = `${key}: ${val}`;
        list.appendChild(item);
      });
    } else {
      value.forEach (line => {
        const item = document.createElement("li");
        item.textContent = line;
        list.appendChild(item);
      })
    }

    card.appendChild(list);
    output.appendChild(card);
  }
}

function confirmFill(parsed){
  const sections = Object.keys(parsed).join(", ");
  return confirm(`About to fill the following sections: ${sections}. Continue?`);
}

function handleFillResponse(response){
  switch(response.reason) {
    case "noResume":
      showStatus("Please extract your resume first.", true);
      break;
    case "noMatch":
      showStatus("No matching fields found on this page.", true);
      break;
    case "error":
      showStatus("Something went wrong.", true);
    default: 
      showStatus(`Sucessfully filled ${response.filledCount} field(s)!`);
  }
}


// ============================================
// DRAG AND DROP HANDLERS
// Captures PDF file from drop zone
// Prevents Firefox from opening file directly
// ============================================

const dropZone = document.getElementById("dropZone");

dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  event.stopPropagation();
  dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", async (event) => {
  event.preventDefault();
  event.stopPropagation();
  dropZone.classList.remove("dragover");

  const file = event.dataTranfer.files[0];

  if(!file) {
    showStatus("No file detected. Try Again.", true);
    return;
  }

  if(file.type !== "application/pdf") {
    showStatus("Only PDF files are supported." , true);
    return;
  }

  try {
    const text = await extractTextFromPDF(file);
    const parsed = parseResume(text);

    if(Object.keys(parsed).length === 0) {
      showStatus("No sections found. Check your resume has clear section headers.", true);
      return;
    }

    await saveResumeData(parsed);
    displayResults(parsed);
    showStatus("Resume extracted and saved successfully!");
  } catch (err) {
    showStatus("Error reading PDF: " + err.message, true);
  }
})

// ============================================
// OBJECT A — Extract resume from pasted text
// ============================================

document.getElementById("uploadBtn").addEventListener("click", async () => {
  const resumeInput = document.getElementById("resumeInput");
  const text = resumeInput.value.trim();

  // Hard stop — nothing pasted
  if (text.length === 0) {
    showStatus("Please paste your resume text first.", true);
    return;
  }

  // Soft warning — text suspiciously short
  if (text.length < 100) {
    showStatus("Resume seems too short, results may be incomplete.", false);
  }

  // Soft warning — text may be missing sections
  if (text.length < 5000) {
    showStatus("Resume seems short, some sections may be missing.", false);
  }

  try {
    const parsed = parseResume(text);

    // Guard — parser found no sections
    if (Object.keys(parsed).length === 0) {
      showStatus("No sections found. Check that your resume has clear section headers.", true);
      return;
    }

    await saveResumeData(parsed);
    displayResults(parsed);
    showStatus("Resume extracted and saved successfully!");
  } catch (err) {
    showStatus("Error parsing resume: " + err.message, true);
  }
});

// ============================================
// OBJECT B — Fill form on current page
// ============================================

document.getElementById("fillBtn").addEventListener("click", async () => {
  const resumeData = await loadResumeData();

  if(!resumeData) {
    showStatus("Please extract your resume first.", true);
    return;
  }

  const confirmed = confirmFill(resumeData);

  if(!confirmed){
    showStatus("Fill cancelled.", false);
    return;
  }

  const [tab] = await browser.tabs.query({
    active: true,
    currentWindow: true
  });

  const response = await browser.tabs.sendMessage(tab.id, {
    action: "fillForm"
  });

  handleFillResponse(response);
});