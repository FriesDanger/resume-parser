// ============================================
// SECTION KEYWORDS
// All known resume section headers
// ============================================
const SECTION_KEYWORDS = [
  "experience", "work experience", "employment",
  "education", "academic background",
  "skills", "technical skills", "core competencies",
  "projects", "certifications", "awards",
  "summary", "objective", "profile", "email*"
];

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

// Organizes raw text into categorized resume sections
function parseResume(text) {
  const lines = text.split("\n");
  const result = {};
  let currentSection = null;

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
    }
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

  for (const [section, lines] of Object.entries(parsed)) {
    const card = document.createElement("div");
    card.className = "section-card";

    const heading = document.createElement("h3");
    heading.textContent = section.toUpperCase();
    card.appendChild(heading);

    const list = document.createElement("ul");
    lines.forEach(line => {
      const item = document.createElement("li");
      item.textContent = line;
      list.appendChild(item);
    });

    card.appendChild(list);
    output.appendChild(card);
  }
}

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
  const [tab] = await browser.tabs.query({
    active: true,
    currentWindow: true
  });

  const response = await browser.tabs.sendMessage(tab.id, {
    action: "fillForm"
  });

  switch (response.reason) {
    case "noResume":
      showStatus("Please upload your resume first.", true);
      break;
    case "noMatch":
      showStatus("No matching fields found on this page.", true);
      break;
    case "error":
      showStatus("Something went wrong.", true);
      break;
    default:
      showStatus(`Successfully filled ${response.filledCount} field(s)!`);
  }
});