async function fireInputEvents(input){
    const focusEvent = new Event("focus");
    const inputEvent = new Event("input", {bubbles: true});
    const changeEvent = new Event("change", {bubbles: true});

    input.dispatchEvent(focusEvent);
    input.dispatchEvent(inputEvent);
    input.dispatchEvent(changeEvent);
}

async function findAndFillFields(resumeData){
    const inputs = document.querySelectorAll("input", "textarea");
    let filledCount = 0;

    for (const input of inputs){
        const attributes = [
            input.name?.toLowerCase(),
            input.id?.toLowerCase(),
            input.placeholder?.toLowerCase()
        ].filter(Boolean);

        for (const [section, lines] of Object.entries(resumeData)) {
            const matches = attributes.some(attr => attr.includes(section));
            if(matches) {
                input.value = lines.join(", ");
                fireInputEvents(input);
                filledCount++;
                break;
            }
        }

    }
    return filledCount;
}

async function fillFormFromStorage() {
    const resumeData = await loadResumeData();

    if(!resumeData){
        return {success: false, reason : "noResume"};
    }

    const filledCount = await findAndFillFields(resumeData);

    if(filledCount === 0) {
        return { success: false, reason: "noMatch"};
    }

    return {success: true, filledCount};
}

browser.runtime.onMessage.addListener((message) => {
    if(message.action === "fillForm") {
        return fillFormFromStorage().then((response) => {
            return response;
        });
    }
});