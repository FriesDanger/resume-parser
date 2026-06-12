// ============================================
// STORAGE
// content.js needs its own copy since it
// runs in a completely separate scope from popup.js
// ============================================

async function loadResumeData() {
  const result = await browser.storage.local.get("resumeData");
  return result.resumeData || null;
}

// ============================================
// INPUT EVENTS
// Fires synthetic events to trick frameworks
// into recognizing programmatic value changes
// ============================================

function fireInputEvents(input) {
  const focusEvent = new Event("focus");
  const inputEvent = new Event("input", { bubbles: true });
  const changeEvent = new Event("change", { bubbles: true });

  input.dispatchEvent(focusEvent);
  input.dispatchEvent(inputEvent);
  input.dispatchEvent(changeEvent);
}

// ============================================
// FIELD MATCHER
// Scans page for matching input fields
// and fills them with resume data
// ============================================

async function findAndFillFields(resumeData) {
  const inputs = document.querySelectorAll("input, textarea");
  let filledCount = 0;

  for (const input of inputs) {
    const attributes = [
      input.name?.toLowerCase(),
      input.id?.toLowerCase(),
      input.placeholder?.toLowerCase()
    ].filter(Boolean);

    for (const [section, value] of Object.entries(resumeData)) {
      if (section === "personal") {
        for (const [key, personalValue] of Object.entries(value)) {
          const matches = attributes.some(attr => attr.includes(key));
          if (matches) {
            input.value = personalValue;
            fireInputEvents(input);
            filledCount++;
            break;
          }
        }
      } else if (attributes.some(attr => attr.includes(section))) {
        input.value = value.join(", ");
        fireInputEvents(input);
        filledCount++;
        break;
      }
    }
  }

  return filledCount;
}

// ============================================
// FILL ORCHESTRATOR
// Loads resume from storage and fills page fields
// Returns structured response back to popup.js
// ============================================

async function fillFormFromStorage() {
  const resumeData = await loadResumeData();

  if (!resumeData) {
    return { success: false, reason: "noResume" };
  }

  const filledCount = await findAndFillFields(resumeData);

  if (filledCount === 0) {
    return { success: false, reason: "noMatch" };
  }

  return { success: true, filledCount };
}

// ============================================
// MESSAGE LISTENER
// Listens for fillForm command from popup.js
// Returns response after filling completes
// ============================================

browser.runtime.onMessage.addListener((message) => {
  if (message.action === "fillForm") {
    return fillFormFromStorage().then((response) => {
      return response;
    });
  }
});