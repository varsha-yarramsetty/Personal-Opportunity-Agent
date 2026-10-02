const opportunityForm =
    document.getElementById("opportunityForm");


// ==========================================
// SEARCH HISTORY
// ==========================================

const SEARCH_HISTORY_KEY =
    "personalOpportunityAgent_history";

let searchHistory =
    loadSearchHistory();


// ==========================================
// LOAD SEARCH HISTORY
// ==========================================

function loadSearchHistory() {

    try {

        const saved =
            localStorage.getItem(
                SEARCH_HISTORY_KEY
            );

        return saved
            ? JSON.parse(saved)
            : [];

    } catch (error) {

        console.error(
            "Could not load search history:",
            error
        );

        return [];

    }

}


// ==========================================
// SAVE SEARCH HISTORY
// ==========================================

function saveSearchHistory() {

    try {

        localStorage.setItem(
            SEARCH_HISTORY_KEY,
            JSON.stringify(searchHistory)
        );

    } catch (error) {

        console.error(
            "Could not save search history:",
            error
        );

    }

}


// ==========================================
// PERMANENT SAVED OPPORTUNITIES
// ==========================================

const STORAGE_KEY =
    "personalOpportunityAgent_saved";

let savedOpportunities =
    loadSavedOpportunities();


// ==========================================
// CURRENT SEARCH RESULTS
// ==========================================

let currentOpportunities = [];


// ==========================================
// LOAD SAVED OPPORTUNITIES
// ==========================================

function loadSavedOpportunities() {

    try {

        const saved =
            localStorage.getItem(
                STORAGE_KEY
            );

        return saved
            ? JSON.parse(saved)
            : [];

    } catch (error) {

        console.error(
            "Could not load saved opportunities:",
            error
        );

        return [];

    }

}


// ==========================================
// SAVE TO LOCAL STORAGE
// ==========================================

function saveToLocalStorage() {

    try {

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(
                savedOpportunities
            )
        );

    } catch (error) {

        console.error(
            "Could not save opportunities:",
            error
        );

    }

}


// ==========================================
// CREATE SAVED SECTION
// ==========================================

function createSavedSection() {

    if (
        document.getElementById(
            "savedOpportunitiesSection"
        )
    ) {
        return;
    }

    const resultsSection =
        document.getElementById(
            "results"
        );

    if (!resultsSection) {
        return;
    }

    const savedSection =
        document.createElement(
            "section"
        );

    savedSection.id =
        "savedOpportunitiesSection";

    savedSection.className =
        "saved-opportunities-section";

    savedSection.innerHTML = `

        <div class="saved-section-header">

            <div>

                <span class="saved-section-badge">
                    ⭐ Your Saved Opportunities
                </span>

                <h2>
                    Opportunities you want to explore
                </h2>

                <p>
                    Save interesting opportunities
                    and come back to them later.
                </p>

            </div>

            <span
                id="savedCount"
                class="saved-count"
            >
                0 Saved
            </span>

        </div>

        <div
            id="savedOpportunitiesGrid"
            class="saved-opportunities-grid"
        ></div>

    `;

    resultsSection.parentNode.insertBefore(
        savedSection,
        resultsSection.nextSibling
    );

    renderSavedOpportunities();

}


// ==========================================
// FORM SUBMIT
// ==========================================

opportunityForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();

        const name =
            document.getElementById(
                "name"
            ).value.trim();

        const location =
            document.getElementById(
                "location"
            ).value.trim();

        const skills =
            document.getElementById(
                "skills"
            ).value.trim();

        const interests =
            document.getElementById(
                "interests"
            ).value.trim();

        const experience =
            document.getElementById(
                "experience"
            ).value;

        const opportunityType =
            document.getElementById(
                "type"
            ).value;


        if (
            !name ||
            !location ||
            !skills ||
            !interests ||
            !experience ||
            !opportunityType
        ) {

            alert(
                "Please fill in all the fields."
            );

            return;

        }


        // Save search to history
        addToSearchHistory({

            name: name,

            location: location,

            skills: skills,

            interests: interests,

            experience: experience,

            opportunityType:
                opportunityType

        });


        const resultsSection =
            document.getElementById(
                "results"
            );

        const opportunityResults =
            document.getElementById(
                "opportunityResults"
            );

        const userName =
            document.getElementById(
                "userName"
            );


        resultsSection.style.display =
            "block";

        userName.textContent =
            name;


        opportunityResults.innerHTML = `

            <div class="loading-card">

                <div class="loading-spinner"></div>

                <h3>
                    Finding opportunities for you...
                </h3>

                <p>
                    Searching the web and ranking
                    the best matches.
                </p>

            </div>

        `;


        resultsSection.scrollIntoView({
            behavior: "smooth"
        });


        try {

            const response =
                await fetch(
                    "/api/search",
                    {

                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({

                            name: name,

                            location: location,

                            skills: skills,

                            interests: interests,

                            experience: experience,

                            opportunityType:
                                opportunityType

                        })

                    }
                );


            const data =
                await response.json();


            if (!data.success) {

                throw new Error(
                    data.error ||
                    "Something went wrong."
                );

            }


            displayOpportunities(
                data.opportunities
            );


            createSavedSection();


        } catch (error) {

            console.error(
                "Search error:",
                error
            );


            opportunityResults.innerHTML = `

                <div class="error-card">

                    <h3>
                        Something went wrong
                    </h3>

                    <p>
                        ${escapeHtml(
                            error.message
                        )}
                    </p>

                    <button
                        type="button"
                        onclick="location.reload()"
                        class="search-btn"
                    >
                        Try Again
                    </button>

                </div>

            `;

        }

    }
);


// ==========================================
// SMART RANKING
// ==========================================

function getOpportunityLevel(score) {

    if (score >= 80) {

        return {
            label: "🔥 Highly Relevant",
            className: "highly-relevant"
        };

    }

    if (score >= 60) {

        return {
            label: "⭐ Good Match",
            className: "good-match"
        };

    }

    return {
        label: "📌 Worth Exploring",
        className: "worth-exploring"
    };

}


// ==========================================
// DISPLAY OPPORTUNITIES
// ==========================================

function displayOpportunities(
    opportunities
) {

    const opportunityResults =
        document.getElementById(
            "opportunityResults"
        );


    if (
        !opportunities ||
        opportunities.length === 0
    ) {

        currentOpportunities = [];


        opportunityResults.innerHTML = `

            <div class="empty-card">

                <h3>
                    No opportunities found
                </h3>

                <p>
                    Try different skills,
                    interests, or location.
                </p>

            </div>

        `;

        return;

    }


    opportunities.sort(
        function (a, b) {

            return (
                Number(
                    b.match_score || 0
                ) -
                Number(
                    a.match_score || 0
                )
            );

        }
    );


    currentOpportunities =
        opportunities;


    opportunityResults.innerHTML =
        opportunities
            .map(
                function (
                    opportunity,
                    index
                ) {

                    return createOpportunityCard(
                        opportunity,
                        index
                    );

                }
            )
            .join("");


    const cards =
        document.querySelectorAll(
            ".opportunity-card"
        );


    cards.forEach(
        function (card, index) {

            card.style.animationDelay =
                `${index * 0.08}s`;

        }
    );

}


// ==========================================
// CREATE OPPORTUNITY CARD
// ==========================================

function createOpportunityCard(
    opportunity,
    index
) {

    const score =
        Number(
            opportunity.match_score || 0
        );


    const category =
        opportunity.category ||
        "Other";


    const reason =
        opportunity.reason ||
        "This opportunity may be relevant to your profile.";


    const recommendation =
        opportunity.recommendation ||
        "Possible Match";


    const matchedSkills =
        Array.isArray(
            opportunity.matched_skills
        )
            ? opportunity.matched_skills
            : [];


    const matchedInterests =
        Array.isArray(
            opportunity.matched_interests
        )
            ? opportunity.matched_interests
            : [];


    const experienceText =
        opportunity.experience_text ||
        "Not clearly specified";


    const link =
        opportunity.link ||
        "#";


    const freshness =
        opportunity.freshness ||
        "Check Details";


    const freshnessClass =
        opportunity.freshness_class ||
        "check";


    const isSaved =
        savedOpportunities.some(
            function (item) {

                return item.link === link;

            }
        );


    const ranking =
        getOpportunityLevel(
            score
        );


    let scoreClass =
        "low";


    if (score >= 80) {

        scoreClass =
            "high";

    } else if (score >= 60) {

        scoreClass =
            "medium";

    }


    let skillsHTML =
        "";


    if (
        matchedSkills.length > 0
    ) {

        skillsHTML = `

            <div class="analysis-row">

                <span class="analysis-label">
                    🛠️ Matched Skills
                </span>

                <div class="tag-list">

                    ${matchedSkills
                        .map(
                            function (skill) {

                                return `
                                    <span class="skill-tag">
                                        ${escapeHtml(skill)}
                                    </span>
                                `;

                            }
                        )
                        .join("")
                    }

                </div>

            </div>

        `;

    }


    let interestsHTML =
        "";


    if (
        matchedInterests.length > 0
    ) {

        interestsHTML = `

            <div class="analysis-row">

                <span class="analysis-label">
                    💡 Matched Interests
                </span>

                <div class="tag-list">

                    ${matchedInterests
                        .map(
                            function (interest) {

                                return `
                                    <span class="interest-tag">
                                        ${escapeHtml(interest)}
                                    </span>
                                `;

                            }
                        )
                        .join("")
                    }

                </div>

            </div>

        `;

    }


    return `

        <article
            class="opportunity-card"
            data-index="${index}"
            data-link="${escapeAttribute(link)}"
        >

            <div class="opportunity-header">

                <span class="category-badge">
                    ${escapeHtml(category)}
                </span>


                <div
                    class="ranking-label ${ranking.className}"
                >
                    ${ranking.label}
                </div>


                <div
                    class="freshness-label ${escapeAttribute(
                        freshnessClass
                    )}"
                >
                    🕒 ${escapeHtml(freshness)}
                </div>


                <div
                    class="match-score ${scoreClass}"
                >

                    <strong>
                        ${score}%
                    </strong>

                    <span>
                        Match
                    </span>

                </div>

            </div>


            <h3 class="opportunity-title">

                ${escapeHtml(
                    opportunity.title ||
                    "Opportunity"
                )}

            </h3>


            <p class="opportunity-description">

                ${escapeHtml(
                    opportunity.snippet ||
                    "No description available."
                )}

            </p>


            <div class="recommendation-box">

                <span>
                    🎯
                </span>

                <div>

                    <strong>
                        ${escapeHtml(
                            recommendation
                        )}
                    </strong>

                    <p>
                        ${escapeHtml(reason)}
                    </p>

                </div>

            </div>


            <div class="analysis-details">

                ${skillsHTML}

                ${interestsHTML}


                <div class="analysis-row">

                    <span class="analysis-label">
                        📈 Experience
                    </span>

                    <span class="analysis-value">
                        ${escapeHtml(
                            experienceText
                        )}
                    </span>

                </div>

            </div>


            <div class="opportunity-footer">

                <span class="source-label">
                    🔎 Live Web Opportunity
                </span>


                <div class="opportunity-actions">

                    <button
                        type="button"
                        class="details-btn"
                        onclick="showOpportunityDetails(${index})"
                    >
                        View Details
                    </button>


                    <button
                        type="button"
                        class="save-btn ${
                            isSaved
                                ? "saved"
                                : ""
                        }"
                        onclick="toggleSaveOpportunity(${index})"
                    >
                        ${
                            isSaved
                                ? "★ Saved"
                                : "☆ Save"
                        }
                    </button>


                    <a
                        href="${escapeAttribute(link)}"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="view-btn"
                    >
                        View Opportunity ↗
                    </a>

                </div>

            </div>

        </article>

    `;

}


// ==========================================
// OPPORTUNITY DETAIL VIEW
// ==========================================

function showOpportunityDetails(index) {

    const opportunity =
        currentOpportunities[index];


    if (!opportunity) {

        alert(
            "Opportunity details are not available."
        );

        return;

    }


    closeOpportunityDetails();


    const score =
        Number(
            opportunity.match_score || 0
        );


    const category =
        opportunity.category ||
        "Other";


    const title =
        opportunity.title ||
        "Opportunity";


    const snippet =
        opportunity.snippet ||
        "No description available.";


    const reason =
        opportunity.reason ||
        "This opportunity may be relevant to your profile.";


    const recommendation =
        opportunity.recommendation ||
        "Possible Match";


    const experienceText =
        opportunity.experience_text ||
        "Not clearly specified";


    const freshness =
        opportunity.freshness ||
        "Check Details";


    const link =
        opportunity.link ||
        "#";


    const matchedSkills =
        Array.isArray(
            opportunity.matched_skills
        )
            ? opportunity.matched_skills
            : [];


    const matchedInterests =
        Array.isArray(
            opportunity.matched_interests
        )
            ? opportunity.matched_interests
            : [];


    const ranking =
        getOpportunityLevel(
            score
        );


    const isSaved =
        savedOpportunities.some(
            function (item) {

                return item.link === link;

            }
        );


    const skillsText =
        matchedSkills.length > 0
            ? matchedSkills
                .map(
                    function (skill) {

                        return `
                            <span class="skill-tag">
                                ${escapeHtml(skill)}
                            </span>
                        `;

                    }
                )
                .join("")
            : `
                <span class="analysis-value">
                    No specific skills matched
                </span>
            `;


    const interestsText =
        matchedInterests.length > 0
            ? matchedInterests
                .map(
                    function (interest) {

                        return `
                            <span class="interest-tag">
                                ${escapeHtml(interest)}
                            </span>
                        `;

                    }
                )
                .join("")
            : `
                <span class="analysis-value">
                    No specific interests matched
                </span>
            `;


    const modal =
        document.createElement(
            "div"
        );


    modal.id =
        "opportunityDetailModal";


    modal.className =
        "opportunity-modal";


    modal.innerHTML = `

        <div class="opportunity-modal-overlay">

            <div
                class="opportunity-modal-content"
                role="dialog"
                aria-modal="true"
                aria-labelledby="detailOpportunityTitle"
            >

                <button
                    type="button"
                    class="modal-close-btn"
                    id="detailCloseButton"
                    aria-label="Close details"
                >
                    ×
                </button>


                <div class="detail-header">

                    <span class="category-badge">
                        ${escapeHtml(category)}
                    </span>


                    <span
                        class="ranking-label ${ranking.className}"
                    >
                        ${ranking.label}
                    </span>

                </div>


                <h2 id="detailOpportunityTitle">
                    ${escapeHtml(title)}
                </h2>


                <div class="detail-match">

                    <strong>
                        ${score}%
                    </strong>

                    <span>
                        Match Score
                    </span>

                </div>


                <div class="detail-section">

                    <h4>
                        📝 Opportunity Description
                    </h4>

                    <p>
                        ${escapeHtml(snippet)}
                    </p>

                </div>


                <div class="detail-section">

                    <h4>
                        🎯 Why This Matches You
                    </h4>

                    <p>
                        ${escapeHtml(reason)}
                    </p>

                </div>


                <div class="detail-section">

                    <h4>
                        💡 Recommendation
                    </h4>

                    <p>
                        ${escapeHtml(recommendation)}
                    </p>

                </div>


                <div class="detail-section">

                    <h4>
                        🛠️ Matched Skills
                    </h4>

                    <div class="tag-list">
                        ${skillsText}
                    </div>

                </div>


                <div class="detail-section">

                    <h4>
                        💡 Matched Interests
                    </h4>

                    <div class="tag-list">
                        ${interestsText}
                    </div>

                </div>


                <div class="detail-section">

                    <h4>
                        📈 Experience Match
                    </h4>

                    <p>
                        ${escapeHtml(experienceText)}
                    </p>

                </div>


                <div class="detail-section">

                    <h4>
                        🕒 Freshness
                    </h4>

                    <p>
                        ${escapeHtml(freshness)}
                    </p>

                </div>


                <div class="detail-actions">

                    <button
                        type="button"
                        class="save-btn ${
                            isSaved
                                ? "saved"
                                : ""
                        }"
                        id="detailSaveButton"
                    >
                        ${
                            isSaved
                                ? "★ Saved"
                                : "☆ Save"
                        }
                    </button>


                    <a
                        href="${escapeAttribute(link)}"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="view-btn"
                    >
                        Visit Opportunity ↗
                    </a>

                </div>

            </div>

        </div>

    `;


    document.body.appendChild(
        modal
    );


    const overlay =
        modal.querySelector(
            ".opportunity-modal-overlay"
        );


    const closeButton =
        modal.querySelector(
            "#detailCloseButton"
        );


    const saveButton =
        modal.querySelector(
            "#detailSaveButton"
        );


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            function () {

                closeOpportunityDetails();

            }
        );

    }


    if (overlay) {

        overlay.addEventListener(
            "click",
            function (event) {

                if (
                    event.target === overlay
                ) {

                    closeOpportunityDetails();

                }

            }
        );

    }


    if (saveButton) {

        saveButton.addEventListener(
            "click",
            function () {

                toggleSaveFromDetails(
                    index
                );

            }
        );

    }


    document.body.style.overflow =
        "hidden";

}


// ==========================================
// CLOSE DETAIL VIEW
// ==========================================

function closeOpportunityDetails() {

    const modal =
        document.getElementById(
            "opportunityDetailModal"
        );


    if (modal) {

        modal.remove();

    }


    document.body.style.overflow =
        "";

}


// ==========================================
// SAVE / UNSAVE FROM DETAIL VIEW
// ==========================================

function toggleSaveFromDetails(
    index
) {

    toggleSaveOpportunity(
        index
    );


    const opportunity =
        currentOpportunities[index];


    if (!opportunity) {
        return;
    }


    const modal =
        document.getElementById(
            "opportunityDetailModal"
        );


    if (!modal) {
        return;
    }


    const button =
        modal.querySelector(
            "#detailSaveButton"
        );


    if (!button) {
        return;
    }


    const isSaved =
        savedOpportunities.some(
            function (item) {

                return (
                    item.link ===
                    opportunity.link
                );

            }
        );


    if (isSaved) {

        button.textContent =
            "★ Saved";

        button.classList.add(
            "saved"
        );

    } else {

        button.textContent =
            "☆ Save";

        button.classList.remove(
            "saved"
        );

    }

}


// ==========================================
// KEYBOARD CLOSE
// ==========================================

document.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key === "Escape"
        ) {

            closeOpportunityDetails();

        }

    }
);


// ==========================================
// SAVE / UNSAVE
// ==========================================

function toggleSaveOpportunity(
    index
) {

    const card =
        document.querySelector(
            `.opportunity-card[data-index="${index}"]`
        );


    if (!card) {
        return;
    }


    const link =
        card.dataset.link;


    const titleElement =
        card.querySelector(
            ".opportunity-title"
        );


    const categoryElement =
        card.querySelector(
            ".category-badge"
        );


    if (
        !titleElement ||
        !categoryElement
    ) {
        return;
    }


    const title =
        titleElement.textContent.trim();


    const category =
        categoryElement.textContent.trim();


    const existingIndex =
        savedOpportunities.findIndex(
            function (item) {

                return item.link === link;

            }
        );


    if (
        existingIndex !== -1
    ) {

        savedOpportunities.splice(
            existingIndex,
            1
        );

    } else {

        const fullOpportunity =
            currentOpportunities[index] || {};


        savedOpportunities.push({

            ...fullOpportunity,

            title: title,

            link: link,

            category: category,

            savedAt:
                new Date().toISOString()

        });

    }


    saveToLocalStorage();

    refreshOpportunityButtons();

    renderSavedOpportunities();

}


// ==========================================
// REFRESH SAVE BUTTONS
// ==========================================

function refreshOpportunityButtons() {

    const cards =
        document.querySelectorAll(
            ".opportunity-card"
        );


    cards.forEach(
        function (card) {

            const link =
                card.dataset.link;


            const button =
                card.querySelector(
                    ".save-btn"
                );


            if (!button) {
                return;
            }


            const isSaved =
                savedOpportunities.some(
                    function (item) {

                        return item.link === link;

                    }
                );


            if (isSaved) {

                button.textContent =
                    "★ Saved";

                button.classList.add(
                    "saved"
                );

            } else {

                button.textContent =
                    "☆ Save";

                button.classList.remove(
                    "saved"
                );

            }

        }
    );

}


// ==========================================
// DISPLAY SAVED OPPORTUNITIES
// ==========================================

function renderSavedOpportunities() {

    const grid =
        document.getElementById(
            "savedOpportunitiesGrid"
        );


    const count =
        document.getElementById(
            "savedCount"
        );


    if (!grid) {
        return;
    }


    if (count) {

        count.textContent =
            `${savedOpportunities.length} Saved`;

    }


    if (
        savedOpportunities.length === 0
    ) {

        grid.innerHTML = `

            <div class="saved-empty-card">

                <div class="saved-empty-icon">
                    ☆
                </div>

                <h3>
                    No saved opportunities yet
                </h3>

                <p>
                    Click "☆ Save" on an opportunity
                    that interests you.
                </p>

            </div>

        `;

        return;

    }


    grid.innerHTML =
        savedOpportunities
            .map(
                function (
                    opportunity,
                    index
                ) {

                    const status =
                        opportunity.status ||
                        "Saved";


                    return `

                        <div
                            class="saved-opportunity-card"
                        >

                            <div
                                class="saved-card-top"
                            >

                                <span
                                    class="category-badge"
                                >
                                    ${escapeHtml(
                                        opportunity.category ||
                                        "Opportunity"
                                    )}
                                </span>


                                <button
                                    type="button"
                                    class="remove-save-btn"
                                    onclick="removeSavedOpportunity(${index})"
                                >
                                    Remove
                                </button>

                            </div>


                            <h3>
                                ${escapeHtml(
                                    opportunity.title ||
                                    "Opportunity"
                                )}
                            </h3>


                            <div
                                class="application-status"
                            >

                                <span class="status-label">
                                    📌 Application Status
                                </span>


                                <select
                                    class="status-select ${getStatusClass(status)}"
                                    onchange="updateApplicationStatus(${index}, this.value)"
                                >

                                    <option
                                        value="Saved"
                                        ${status === "Saved" ? "selected" : ""}
                                    >
                                        💾 Saved
                                    </option>

                                    <option
                                        value="Applied"
                                        ${status === "Applied" ? "selected" : ""}
                                    >
                                        📤 Applied
                                    </option>

                                    <option
                                        value="Interview"
                                        ${status === "Interview" ? "selected" : ""}
                                    >
                                        🎤 Interview
                                    </option>

                                    <option
                                        value="Selected"
                                        ${status === "Selected" ? "selected" : ""}
                                    >
                                        🎉 Selected
                                    </option>

                                    <option
                                        value="Rejected"
                                        ${status === "Rejected" ? "selected" : ""}
                                    >
                                        ❌ Rejected
                                    </option>

                                </select>

                            </div>


                            <div
                                class="saved-card-actions"
                            >

                                <button
                                    type="button"
                                    class="details-btn saved-details-btn"
                                    onclick="showSavedOpportunityDetails(${index})"
                                >
                                    View Details
                                </button>


                                <a
                                    href="${escapeAttribute(
                                        opportunity.link
                                    )}"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="view-btn"
                                >
                                    View Opportunity ↗
                                </a>

                            </div>

                        </div>

                    `;

                }
            )
            .join("");

}

// ==========================================
// SHOW SAVED OPPORTUNITY DETAILS
// ==========================================

function showSavedOpportunityDetails(
    index
) {

    const opportunity =
        savedOpportunities[index];


    if (!opportunity) {

        alert(
            "Saved opportunity details are not available."
        );

        return;

    }


    closeOpportunityDetails();


    const score =
        Number(
            opportunity.match_score || 0
        );


    const category =
        opportunity.category ||
        "Other";


    const title =
        opportunity.title ||
        "Opportunity";


    const snippet =
        opportunity.snippet ||
        "No description available.";


    const reason =
        opportunity.reason ||
        "This opportunity was saved from your search results.";


    const recommendation =
        opportunity.recommendation ||
        "Saved Opportunity";


    const experienceText =
        opportunity.experience_text ||
        "Not clearly specified";


    const freshness =
        opportunity.freshness ||
        "Check Details";


    const link =
        opportunity.link ||
        "#";


    const matchedSkills =
        Array.isArray(
            opportunity.matched_skills
        )
            ? opportunity.matched_skills
            : [];


    const matchedInterests =
        Array.isArray(
            opportunity.matched_interests
        )
            ? opportunity.matched_interests
            : [];


    const ranking =
        getOpportunityLevel(
            score
        );


    const skillsText =
        matchedSkills.length > 0
            ? matchedSkills
                .map(
                    function (skill) {

                        return `
                            <span class="skill-tag">
                                ${escapeHtml(skill)}
                            </span>
                        `;

                    }
                )
                .join("")
            : `
                <span class="analysis-value">
                    No specific skills matched
                </span>
            `;


    const interestsText =
        matchedInterests.length > 0
            ? matchedInterests
                .map(
                    function (interest) {

                        return `
                            <span class="interest-tag">
                                ${escapeHtml(interest)}
                            </span>
                        `;

                    }
                )
                .join("")
            : `
                <span class="analysis-value">
                    No specific interests matched
                </span>
            `;


    const modal =
        document.createElement(
            "div"
        );


    modal.id =
        "opportunityDetailModal";


    modal.className =
        "opportunity-modal";


    modal.innerHTML = `

        <div class="opportunity-modal-overlay">

            <div
                class="opportunity-modal-content"
                role="dialog"
                aria-modal="true"
            >

                <button
                    type="button"
                    class="modal-close-btn"
                    id="detailCloseButton"
                    aria-label="Close details"
                >
                    ×
                </button>


                <div class="detail-header">

                    <span class="category-badge">
                        ${escapeHtml(category)}
                    </span>


                    <span
                        class="ranking-label ${ranking.className}"
                    >
                        ${ranking.label}
                    </span>

                </div>


                <h2>
                    ${escapeHtml(title)}
                </h2>


                <div class="detail-match">

                    <strong>
                        ${score}%
                    </strong>

                    <span>
                        Match Score
                    </span>

                </div>


                <div class="detail-section">

                    <h4>
                        📝 Opportunity Description
                    </h4>

                    <p>
                        ${escapeHtml(snippet)}
                    </p>

                </div>


                <div class="detail-section">

                    <h4>
                        🎯 Why This Matches You
                    </h4>

                    <p>
                        ${escapeHtml(reason)}
                    </p>

                </div>


                <div class="detail-section">

                    <h4>
                        💡 Recommendation
                    </h4>

                    <p>
                        ${escapeHtml(recommendation)}
                    </p>

                </div>


                <div class="detail-section">

                    <h4>
                        🛠️ Matched Skills
                    </h4>

                    <div class="tag-list">
                        ${skillsText}
                    </div>

                </div>


                <div class="detail-section">

                    <h4>
                        💡 Matched Interests
                    </h4>

                    <div class="tag-list">
                        ${interestsText}
                    </div>

                </div>


                <div class="detail-section">

                    <h4>
                        📈 Experience Match
                    </h4>

                    <p>
                        ${escapeHtml(experienceText)}
                    </p>

                </div>


                <div class="detail-section">

                    <h4>
                        🕒 Freshness
                    </h4>

                    <p>
                        ${escapeHtml(freshness)}
                    </p>

                </div>


                <div class="detail-actions">

                    <a
                        href="${escapeAttribute(link)}"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="view-btn"
                    >
                        Visit Opportunity ↗
                    </a>

                </div>

            </div>

        </div>

    `;


    document.body.appendChild(
        modal
    );


    const overlay =
        modal.querySelector(
            ".opportunity-modal-overlay"
        );


    const closeButton =
        modal.querySelector(
            "#detailCloseButton"
        );


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            function () {

                closeOpportunityDetails();

            }
        );

    }


    if (overlay) {

        overlay.addEventListener(
            "click",
            function (event) {

                if (
                    event.target === overlay
                ) {

                    closeOpportunityDetails();

                }

            }
        );

    }


    document.body.style.overflow =
        "hidden";

}


// ==========================================
// REMOVE SAVED OPPORTUNITY
// ==========================================

function removeSavedOpportunity(
    index
) {

    if (
        index < 0 ||
        index >= savedOpportunities.length
    ) {
        return;
    }


    savedOpportunities.splice(
        index,
        1
    );


    saveToLocalStorage();

    refreshOpportunityButtons();

    renderSavedOpportunities();

}


// ==========================================
// ADD SEARCH TO HISTORY
// ==========================================

function addToSearchHistory(
    search
) {

    const newSearch = {

        ...search,

        searchedAt:
            new Date().toISOString()

    };


    searchHistory.unshift(
        newSearch
    );


    // Keep only latest 5 searches
    searchHistory =
        searchHistory.slice(0, 5);


    saveSearchHistory();

    renderSearchHistory();

}


// ==========================================
// DISPLAY SEARCH HISTORY
// ==========================================

function renderSearchHistory() {

    let section =
        document.getElementById(
            "searchHistorySection"
        );


    if (!section) {

        section =
            document.createElement(
                "section"
            );


        section.id =
            "searchHistorySection";


        section.className =
            "search-history-section";


        const resultsSection =
            document.getElementById(
                "results"
            );


        if (!resultsSection) {
            return;
        }


        resultsSection.parentNode.insertBefore(
            section,
            resultsSection
        );

    }


    if (
        searchHistory.length === 0
    ) {

        section.innerHTML = "";

        return;

    }


    section.innerHTML = `

        <div class="search-history-header">
                <button
                    class="clear-history-btn"
                    onclick="clearSearchHistory()">
                    🗑 Clear History
                </button>

            <div>

                <span class="search-history-badge">
                    🔎 Recent Searches
                </span>

                <h2>
                    Your Search History
                </h2>

                <p>
                    Quickly revisit your previous searches.
                </p>

            </div>

        </div>


        <div class="search-history-list">

            ${searchHistory
                .map(
                    function (
                        search,
                        index
                    ) {

                        return `

                            <div
                                class="search-history-card"
                            >

                                <div
                                    class="search-history-info"
                                >

                                    <h3>
                                        ${escapeHtml(
                                            search.skills
                                        )}
                                    </h3>

                                    <p>
                                        📍 ${escapeHtml(
                                            search.location
                                        )}
                                        &nbsp; • &nbsp;
                                        ${escapeHtml(
                                            search.opportunityType
                                        )}
                                    </p>

                                    <span>
                                        💡 ${escapeHtml(
                                            search.interests
                                        )}
                                    </span>

                                </div>


                                <button
                                    type="button"
                                    class="search-again-btn"
                                    onclick="repeatSearch(${index})"
                                >
                                    Search Again
                                </button>

                            </div>

                        `;

                    }
                )
                .join("")}

        </div>

    `;

}


// ==========================================
// REPEAT SEARCH FROM HISTORY
// ==========================================

function repeatSearch(
    index
) {

    const search =
        searchHistory[index];


    if (!search) {
        return;
    }


    document.getElementById(
        "name"
    ).value =
        search.name || "";


    document.getElementById(
        "location"
    ).value =
        search.location || "";


    document.getElementById(
        "skills"
    ).value =
        search.skills || "";


    document.getElementById(
        "interests"
    ).value =
        search.interests || "";


    document.getElementById(
        "experience"
    ).value =
        search.experience || "";


    document.getElementById(
        "type"
    ).value =
        search.opportunityType || "All";


    document.getElementById(
        "profile"
    ).scrollIntoView({
        behavior: "smooth"
    });

}


// ==========================================
// SECURITY HELPERS
// ==========================================

function escapeHtml(
    value
) {

    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


function escapeAttribute(
    value
) {

    return String(value)
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


// ==========================================
// LOAD SEARCH HISTORY WHEN PAGE OPENS
// ==========================================
// ==========================================
// APPLICATION TRACKER
// ==========================================

function getStatusClass(status) {

    switch (status) {

        case "Applied":
            return "status-applied";

        case "Interview":
            return "status-interview";

        case "Selected":
            return "status-selected";

        case "Rejected":
            return "status-rejected";

        default:
            return "status-saved";
    }
}


function updateApplicationStatus(
    index,
    status
) {

    if (!savedOpportunities[index]) {
        return;
    }

    savedOpportunities[index].status =
        status;

    saveToLocalStorage();

    renderSavedOpportunities();
}
// ==========================================
// CLEAR SEARCH HISTORY
// ==========================================

function clearSearchHistory() {

    if (searchHistory.length === 0) {
        return;
    }

    const confirmClear = confirm(
        "Are you sure you want to clear your search history?"
    );

    if (!confirmClear) {
        return;
    }

    searchHistory = [];

    localStorage.removeItem(
        SEARCH_HISTORY_KEY
    );

    renderSearchHistory();
}
window.addEventListener(
    "load",
    function () {
        renderSearchHistory();
        createSavedSection();
    }
);