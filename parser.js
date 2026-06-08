async function isJunkLine(line){
    const cleaned = line.trim();
    return cleaned === "" ||
        /^[-_.•|=*]+$/.test(cleaned);
}

async function detectSection(line){
    const cleaned = line.trim().toLowerCase();
    return SECTION_KEYWORDS.find(keyword => 
        cleaned.includes(keyword)) || null;
}

function parseResume(text){
    const lines = text.split("\n");
    const result = {};
    let currentSection = null;

    for (const line of lines) {
        if (isJunkLine(line)) continue;

        const section = detectSection(line);
        if(section){
            currentSection = section;
            if(!result[currentSection]) {
                result[currentSeciton] = [];
            }
        } else if (currentSection && line.trim() !== "") {
            result[currentSection].push(line.trim());
        }
    }

    return result;
}
