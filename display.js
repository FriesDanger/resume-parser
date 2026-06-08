
function showStatus(message, isError = false){
    const status = document.getElementById("status");
    status.textCotent = message;
    status.style.color = isError ? "red" : "green";
}

function displayResults(parsed){
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