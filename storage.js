async function saveResumeData(parsed){
    await browser.storage.local.set({ resumeData: parsed});
}

async function loadResumeData(){
    const result = await browser.storage.local.get("resumeData");
    return result.resumeData || null;
}