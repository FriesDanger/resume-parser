pdfjsLib.GlobalWorkerOptions.workerSrc = browser.runtime.getURL("pdf.worker.min.js");
if( typeof pdfjsLib === "undefined") {
    document.getElementById("status").textContent = 
        "Error: PDF.js failed to load.";
}
async function detectColumns(items){
    let result = "";
    let lastX = null;
    let lastY = null;

    for(const item of items){
        const x = item.transform[4];
        const y = item.transform[5];
        
        if(lastY !== null && Math.abs(y - lastY) > 5){
            result += "\n";
        }else if(lastX !== null && x - lastY > 50){
            result += ", ";
        }else{
            result += " ";
        }
        result += item.str;
        lastX = x + (item.width || 0);
        lastY = y;

    }
        return result;
}

async function extractTextFromPDF(file){
    if(!file || file.type !== "application/pdf"){
        throw new Error("This file is invalid, please upload your pdf file");
    }

    const arrayBuffer = await file.arrayBuffer();

    const bytes = new Uint8Array(arrayBuffer.slice(0, 5));
    const header = String.fromCharCode(...bytes);
    
    if(!header.startsWith("%PDF-")){
        throw new Error("This file is not a pdf file");
    }else{
        Console.log("Your file is real,authentic PDF file!");
    }

    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer}).promise;
    let fullText = "";

    for(let i = 1; i <= pdf.numPages; i++){
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = detectColumns(content.items);
        fullText += pageText + "\n\n";
    }

    return fullText;
}