const fileInput = document.getElementById("pdfInput");

fileInput.addEventListener("change", (event) => {
console.log("file selected:", event.target.files[0]);
});
document.getElementById("pdfInput").addEventListener("change", (event) => {
  //selectedFile = event.target.files[0];
  console.log("change event fired");
  console.log("event.target.files", event.target.files);
  console.log("event.target.files[0]:", event.target.files[0]);
});

document.getElementById("uploadBtn").addEventListener("click", async () => {
  //const fileInput = document.getElementById("pdfInput");
  //const file = fileInput.files[0];
  console.log("uploadBtn is responding");
  if(!selectedFile){
    showStatus("please select a pdf file.", true);
    return;   
  }

  try {
    const text = await extractTextFromPDF(selectedFile);
    const parsed = parseResume(text);
    await saveResumeData(parsed);
    displayResults(parsed);
    showStatus("Resume extracted and saved successfully!"); 
  } catch (err) {
    showStatus("Error reading PDF: " + err.message, true);
  }

});
//Object - Send fill command to content script on current page
document.getElementById("fillBtn").addEventListener("click", async() => {
  const [tab] = await browser.tabs.query({
    active: true,
    currentWindow: true
  });
  const response = await browser.tabs.sendMessage(tab.id, {
    action: "fillForm"
  });
  
  switch(response.reason){
    case "noResume":
      showStatus("Please upload your resume first", true);
      break;
    case "noMatch":
      showStatus("No Matching filelds found on this page.", true);
      break;
    case "error":
      showStatus("Something went wrong.", true);
      break;
    default:
      showStatus(`Successfully filled ${response.filledCount} field(s)!`);
  }
});