// ============================================
// SECTION KEYWORDS
// All known resume section headers
// ============================================
const SECTION_KEYWORDS = [
  "experience", "work experience", "employment",
  "education", "academic background",
  "skills", "technical skills", "core competencies",
  "projects", "certifications", "awards",
  "summary", "objective", "profile",
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

//Checks if the resume have any personal info.
//Return the personal info into a different category.
function extractPersonalInfo(lines){
  const personal = {};
  //detect each part with either | or ,
  for (const line of lines) {
    const parts = line.split(/[|,]/).map(p => p.trim()).filter(Boolean);
    //circle each parts to detect emails, addresses, phone numbers.
    for ( const part of parts){
      if (part.includes("@")) {
        personal.email = part;
      } 
      // detect the phone of user.
      else if(/[\d\s\-\+\(\)]{7,}/.test(part)){
        personal.phone = part;
      }
      // detect the street of user
       else if(
        /\b(St|Ave|Rd|Blvd|Dr|Lane|Ln|Court|Ct|Way)\b/i.test(part) ||
        /\b[A-Z]{2}\b/.test(part) ||
        /\d{5}/.test(part)
      ) {
        personal.address = part;
      }
      //detect the name of user
      else if(/^[A-Z][a-z]+(\s[A-Z][a-z]+)$/.test(part)){
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

  //Check if line if they are junk and they are not in the resume categories
  for (const line of lines) {
    if (isJunkLine(line)) continue;

    const section = detectSection(line);
    //set currentSection equals to section
    if (section) {
      currentSection = section;
      if (!result[currentSection]) {
        result[currentSection] = [];
      }
    } 
    //if currentSection exist and no space. Add result data to result.
    else if (currentSection && line.trim() !== "") {
      result[currentSection].push(line.trim());
    }
    //if currentSection not exist. Add the result to the personal
    else if (!currentSection && line.trim() !== "") {
      personalLines.push(line.trim());
    }
  }
  //Add personal info to result
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
  //loop through the section to create a card of each section
  for (const [section, value] of Object.entries(parsed)) {
    const card = document.createElement("div");
    card.className = "section-card";
    //create header of the section
    const heading = document.createElement("h3");
    heading.textContent = section.toUpperCase();
    card.appendChild(heading);
    //create the list of the section.
    const list = document.createElement("ul");

    if(section === "personal") {
      Object.entries(value).forEach(([key, val]) => {
        const item = document.createElement("li");
        item.textContent = `${key}: ${val}`;
        list.appendChild(item);
      });
    }
    // add the list to the section. 
    else {
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

//Show confirm dialog before filling form.
function confirmFill(parsed){
  const sections = Object.keys(parsed).join(", ");
  return confirm(`About to fill the following sections: ${sections}. Continue?`);
}

//handle fill response and shows appropriate status message.
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
      break;
    default: 
      showStatus(`Successfully filled ${response.filledCount} field(s)!`);
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
    //save the resume and display result
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
  //checks if the resume exist
  if(!resumeData) {
    showStatus("Please extract your resume first.", true);
    return;
  }

  const confirmed = confirmFill(resumeData);
  //if user cancelled stop here.
  if(!confirmed){
    showStatus("Fill cancelled.", false);
    return;
  }
  //takes the first element of the array 
  const [tab] = await browser.tabs.query({
    active: true,
    currentWindow: true
  });
  //send message to the browser.
  const response = await browser.tabs.sendMessage(tab.id, {
    action: "fillForm"
  });

  handleFillResponse(response);
});