import os
import re
from datetime import datetime

from flask import Flask, jsonify, request, send_from_directory
from dotenv import load_dotenv
from serpapi import GoogleSearch

# Optional Gemini import
try:
    from google import genai
except ImportError:
    genai = None


# ==========================================
# SETUP
# ==========================================

load_dotenv()

SERPAPI_KEY = os.getenv("SERPAPI_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

app = Flask(__name__)


# Optional Gemini client
gemini_client = None

if genai and GEMINI_API_KEY:
    try:
        gemini_client = genai.Client(api_key=GEMINI_API_KEY)
    except Exception:
        gemini_client = None


# ==========================================
# SERVE FRONTEND
# ==========================================

@app.route("/")
def home():
    return send_from_directory(".", "index.html")


@app.route("/<path:filename>")
def serve_file(filename):
    return send_from_directory(".", filename)


# ==========================================
# HELPER FUNCTIONS
# ==========================================

def clean_text(text):
    if not text:
        return ""

    text = str(text)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text)

    return text.strip()


def get_words(text):
    text = clean_text(text).lower()

    words = re.findall(r"[a-zA-Z0-9+#.-]+", text)

    return set(words)


# ==========================================
# EXPERIENCE ANALYSIS
# ==========================================

def analyze_experience(user_experience, opportunity_text):

    text = opportunity_text.lower()

    if user_experience == "Beginner":
        beginner_words = [
            "beginner",
            "student",
            "students",
            "entry level",
            "entry-level",
            "fresher",
            "freshers",
            "no experience",
            "undergraduate",
            "college"
        ]

        for word in beginner_words:
            if word in text:
                return 15, "Good for beginners/students"

        return 5, "Check experience requirements"

    if user_experience == "Intermediate":
        intermediate_words = [
            "intermediate",
            "experience",
            "developer",
            "intern",
            "skills"
        ]

        for word in intermediate_words:
            if word in text:
                return 15, "Suitable for intermediate experience"

        return 8, "May require some experience"

    if user_experience == "Advanced":
        advanced_words = [
            "advanced",
            "senior",
            "professional",
            "experienced",
            "lead"
        ]

        for word in advanced_words:
            if word in text:
                return 15, "Suitable for advanced experience"

        return 8, "Check experience requirements"

    return 8, "Experience requirement should be checked"


# ==========================================
# CATEGORY DETECTION
# ==========================================

def detect_category(opportunity):

    text = (
        opportunity.get("title", "")
        + " "
        + opportunity.get("snippet", "")
    ).lower()

    # Part-time jobs should be detected before normal jobs
    if (
        "part-time" in text
        or "part time" in text
        or "parttime" in text
    ):
        return "Part-time Job"

    if "internship" in text or "intern" in text:
        return "Internship"

    if "hackathon" in text:
        return "Hackathon"

    if "scholarship" in text:
        return "Scholarship"

    if "course" in text or "certification" in text:
        return "Course"

    if "job" in text or "career" in text or "hiring" in text:
        return "Job"

    return "Opportunity"


# ==========================================
# FRESHNESS ANALYSIS
# ==========================================

def analyze_freshness(opportunity):

    text = (
        opportunity.get("title", "")
        + " "
        + opportunity.get("snippet", "")
    ).lower()

    very_recent_words = [
        "today",
        "just announced",
        "just launched",
        "now open",
        "new opportunity",
        "newly announced"
    ]

    current_words = [
        "2026",
        "applications open",
        "application open",
        "registration open",
        "apply now",
        "open now",
        "deadline",
        "applications are open",
        "registration is open"
    ]

    for word in very_recent_words:
        if word in text:
            return {
                "label": "Very Recent",
                "score": 100,
                "class_name": "fresh"
            }

    for word in current_words:
        if word in text:
            return {
                "label": "Current",
                "score": 80,
                "class_name": "current"
            }

    return {
        "label": "Check Details",
        "score": 50,
        "class_name": "check"
    }


# ==========================================
# OPPORTUNITY ANALYSIS
# ==========================================

def analyze_opportunity(opportunity, skills, interests, experience):

    title = clean_text(opportunity.get("title", ""))
    snippet = clean_text(opportunity.get("snippet", ""))

    full_text = title + " " + snippet

    opportunity_words = get_words(full_text)
    skill_words = get_words(skills)
    interest_words = get_words(interests)

    # --------------------------------------
    # MATCH SKILLS
    # --------------------------------------

    matched_skills = []

    for skill in skill_words:
        if skill in opportunity_words:
            matched_skills.append(skill)

    # --------------------------------------
    # MATCH INTERESTS
    # --------------------------------------

    matched_interests = []

    for interest in interest_words:
        if interest in opportunity_words:
            matched_interests.append(interest)

    # --------------------------------------
    # EXPERIENCE
    # --------------------------------------

    experience_score, experience_text = analyze_experience(
        experience,
        full_text
    )

    # --------------------------------------
    # CATEGORY
    # --------------------------------------

    category = detect_category(opportunity)

    # --------------------------------------
    # FRESHNESS
    # --------------------------------------

    freshness = analyze_freshness(opportunity)

    # --------------------------------------
    # MATCH SCORE
    # --------------------------------------

    skill_score = min(len(matched_skills) * 15, 45)

    interest_score = min(len(matched_interests) * 10, 25)

    category_score = 5 if category != "Opportunity" else 0

    freshness_bonus = 0

    if freshness["score"] == 100:
        freshness_bonus = 10

    elif freshness["score"] == 80:
        freshness_bonus = 5

    total_score = (
        skill_score
        + interest_score
        + experience_score
        + category_score
        + freshness_bonus
    )

    total_score = min(total_score, 100)

    # --------------------------------------
    # REASON
    # --------------------------------------

    reasons = []

    if matched_skills:
        reasons.append(
            "Matches your skills: "
            + ", ".join(matched_skills)
        )

    if matched_interests:
        reasons.append(
            "Matches your interests: "
            + ", ".join(matched_interests)
        )

    if experience_text:
        reasons.append(experience_text)

    if freshness["label"] == "Very Recent":
        reasons.append("This opportunity appears very recent.")

    elif freshness["label"] == "Current":
        reasons.append(
            "This opportunity contains current application information."
        )

    if not reasons:
        reasons.append(
            "This opportunity may be worth exploring based on your profile."
        )

    reason = " ".join(reasons)

    # --------------------------------------
    # RECOMMENDATION
    # --------------------------------------

    if total_score >= 80:
        recommendation = "Highly relevant opportunity for you."

    elif total_score >= 60:
        recommendation = "Good opportunity to explore."

    else:
        recommendation = "Worth checking for additional details."

    # --------------------------------------
    # RETURN ANALYSIS
    # --------------------------------------

    opportunity["match_score"] = total_score
    opportunity["category"] = category

    opportunity["reason"] = reason

    opportunity["matched_skills"] = matched_skills

    opportunity["matched_interests"] = matched_interests

    opportunity["experience_match"] = experience_score

    opportunity["experience_text"] = experience_text

    opportunity["recommendation"] = recommendation

    opportunity["analysis_source"] = "Local Opportunity Analysis"

    opportunity["freshness"] = freshness["label"]

    opportunity["freshness_score"] = freshness["score"]

    opportunity["freshness_class"] = freshness["class_name"]

    return opportunity


# ==========================================
# SEARCH API
# ==========================================

@app.route("/api/search", methods=["POST"])
def search_opportunities():

    try:

        data = request.get_json()

        if not data:
            return jsonify({
                "success": False,
                "error": "No profile data received."
            }), 400

        name = data.get("name", "").strip()

        location = data.get("location", "").strip()

        skills = data.get("skills", "").strip()

        interests = data.get("interests", "").strip()

        experience = data.get(
            "experience",
            "Beginner"
        ).strip()

        opportunity_type = data.get(
            "opportunityType",
            "All"
        ).strip()

        # --------------------------------------
        # CHECK SERPAPI KEY
        # --------------------------------------

        if not SERPAPI_KEY:

            return jsonify({
                "success": False,
                "error": "SERPAPI_KEY is missing in .env file."
            }), 500

        # --------------------------------------
        # BUILD SEARCH QUERIES
        # --------------------------------------

        queries = []

        if opportunity_type == "All":

            queries = [
                f"{skills} {interests} opportunities {location}",
                f"{skills} student opportunities {location}",
                f"{interests} internships {location}",
                f"{skills} hackathons scholarships courses jobs {location}"
            ]

        elif opportunity_type == "Part-time Jobs":

            # NEW: Specific searches for Part-time Jobs
            queries = [
                f"{skills} part time jobs {location}",
                f"{interests} part time jobs {location}",
                f"{skills} student part time jobs {location}",
                f"{interests} student part time jobs {location}"
            ]

        else:

            queries = [
                f"{skills} {opportunity_type} {location}",
                f"{interests} {opportunity_type} {location}"
            ]

        # --------------------------------------
        # REMOVE EMPTY QUERIES
        # --------------------------------------

        queries = [
            query.strip()
            for query in queries
            if query.strip()
        ]

        # --------------------------------------
        # SEARCH SERPAPI
        # --------------------------------------

        all_results = []

        for query in queries:

            try:

                params = {
                    "engine": "google",
                    "q": query,
                    "api_key": SERPAPI_KEY,
                    "num": 10
                }

                search = GoogleSearch(params)

                results = search.get_dict()

                organic_results = results.get(
                    "organic_results",
                    []
                )

                for result in organic_results:

                    opportunity = {
                        "title": clean_text(
                            result.get("title", "")
                        ),

                        "snippet": clean_text(
                            result.get("snippet", "")
                        ),

                        "link": result.get(
                            "link",
                            ""
                        )
                    }

                    if opportunity["title"]:

                        all_results.append(
                            opportunity
                        )

            except Exception as search_error:

                print(
                    "Search error:",
                    search_error
                )

        # --------------------------------------
        # REMOVE DUPLICATES
        # --------------------------------------

        unique_results = []

        seen_links = set()

        for opportunity in all_results:

            link = opportunity.get(
                "link",
                ""
            )

            if not link:
                continue

            if link in seen_links:
                continue

            seen_links.add(link)

            unique_results.append(
                opportunity
            )

        # --------------------------------------
        # ANALYZE RESULTS
        # --------------------------------------

        opportunities = []

        for opportunity in unique_results:

            analyzed = analyze_opportunity(
                opportunity,
                skills,
                interests,
                experience
            )

            opportunities.append(
                analyzed
            )

        # --------------------------------------
        # SMART RANKING
        # --------------------------------------

        opportunities.sort(
            key=lambda item: (
                item.get("match_score", 0),
                item.get("freshness_score", 0)
            ),
            reverse=True
        )

        # --------------------------------------
        # LIMIT RESULTS
        # --------------------------------------

        opportunities = opportunities[:12]

        # --------------------------------------
        # SEARCH TIME
        # --------------------------------------

        searched_at = datetime.now().strftime(
            "%d %B %Y, %I:%M %p"
        )

        # --------------------------------------
        # RESPONSE
        # --------------------------------------

        return jsonify({
            "success": True,
            "name": name,
            "opportunities": opportunities,
            "searched_at": searched_at,
            "total_results": len(opportunities)
        })

    except Exception as error:

        print(
            "API ERROR:",
            error
        )

        return jsonify({
            "success": False,
            "error": str(error)
        }), 500


# ==========================================
# RUN SERVER
# ==========================================

if __name__ == "__main__":

    print("=" * 60)
    print("Personal Opportunity Agent")
    print("=" * 60)

    if SERPAPI_KEY:
        print("SerpApi: Connected")
    else:
        print("SerpApi: API key missing")

    if GEMINI_API_KEY:
        print("Gemini: API key detected")
    else:
        print("Gemini: Not configured")

    print("=" * 60)

    app.run(
        debug=True
    )