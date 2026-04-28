from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import firebase_admin
from firebase_admin import credentials, db
import requests
import os
import json
import time
import random
import smtplib
from email.mime.text import MIMEText
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# =========================
# ENV + AI CONFIG
# =========================
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-2.0-flash")

# =========================
# FIREBASE
# =========================
cred = credentials.Certificate("serviceAccountKey.json")

firebase_admin.initialize_app(cred, {
    'databaseURL': os.getenv("FIREBASE_DB_URL")
})

# =========================
# EMAIL CONFIG
# =========================
EMAIL_USER = os.getenv("EMAIL_USER")
EMAIL_PASS = os.getenv("EMAIL_PASS")

# Temporary storage
verification_codes = {}

# =========================
# GEMINI EXTRACTION
# =========================
def extract_with_gemini(raw_text):
    prompt = f"""
You are an emergency analyst for Bangalore city.

Extract and return ONLY valid JSON with:
location_name,
crisis_type,
severity,
affected_count,
needs,
summary

Text:
{raw_text}
"""

    response = model.generate_content(prompt)
    text = response.text.strip()

    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]

    return json.loads(text.strip())

# =========================
# GEO LOCATION
# =========================
def get_coordinates(location_name):
    url = "https://nominatim.openstreetmap.org/search"

    params = {
        "q": f"{location_name}, Bangalore, India",
        "format": "json",
        "limit": 1
    }

    headers = {
        "User-Agent": "CrisisMapBangalore/1.0"
    }

    response = requests.get(url, params=params, headers=headers)
    results = response.json()

    if results:
        return float(results[0]["lat"]), float(results[0]["lon"])

    return 12.9716, 77.5946

# =========================
# PRIORITY
# =========================
def assign_priority(severity, affected_count):
    if severity == "critical":
        return "P1"

    elif severity == "high":
        return "P1" if affected_count and affected_count > 10 else "P2"

    elif severity == "medium":
        return "P2"

    return "P3"

# =========================
# SEND EMAIL
# =========================
def send_email_code(receiver_email, code):
    try:
        subject = "CrisisMap Email Verification"
        body = f"""
Your CrisisMap verification code is:

{code}

Do not share this code with anyone.
"""

        msg = MIMEText(body)
        msg["Subject"] = subject
        msg["From"] = EMAIL_USER
        msg["To"] = receiver_email

        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login(EMAIL_USER, EMAIL_PASS)
        server.sendmail(EMAIL_USER, receiver_email, msg.as_string())
        server.quit()

        return True

    except Exception as e:
        print("Email Error:", e)
        return False

# =========================
# SEND CODE
# =========================
@app.route("/send-code", methods=["POST"])
def send_code():
    data = request.json or {}

    email = data.get("email")

    if not email:
        return jsonify({"error": "Email required"}), 400

    code = str(random.randint(1000, 9999))

    verification_codes[email] = code

    success = send_email_code(email, code)

    if not success:
        return jsonify({"error": "Email sending failed"}), 500

    return jsonify({
        "success": True,
        "message": "Verification code sent"
    })

# =========================
# VERIFY CODE
# =========================
@app.route("/verify-code", methods=["POST"])
def verify_code():
    data = request.json or {}

    email = data.get("email")
    code = data.get("code")

    if not email or not code:
        return jsonify({"error": "Missing fields"}), 400

    stored_code = verification_codes.get(email)

    if stored_code == code:
        del verification_codes[email]

        return jsonify({
            "success": True,
            "message": "Verification successful"
        })

    return jsonify({
        "success": False,
        "message": "Invalid code"
    })

# =========================
# SUBMIT INCIDENT
# =========================
@app.route("/submit", methods=["POST"])
def submit_report():
    data = request.json or {}

    raw_text = data.get("text", "")

    if not raw_text:
        raw_text = "SOS Emergency at current location."

    extracted = extract_with_gemini(raw_text)

    location_name = extracted.get("location_name", "Unknown Area")

    lat, lng = get_coordinates(location_name)

    priority = assign_priority(
        extracted.get("severity", "high"),
        extracted.get("affected_count")
    )

    incident = {
        "raw_text": raw_text,
        "location_name": location_name,
        "lat": lat,
        "lng": lng,
        "crisis_type": extracted.get("crisis_type", "other"),
        "priority": priority,
        "needs": extracted.get("needs", []),
        "summary": extracted.get("summary", ""),
        "status": "active",
        "approved": False,
        "report_count": 1,
        "timestamp": int(time.time() * 1000)
    }

    ref = db.reference("incidents")
    ref.push(incident)

    return jsonify({
        "success": True
    })

# =========================
# INCIDENTS
# =========================
@app.route("/incidents", methods=["GET"])
def get_incidents():
    ref = db.reference("incidents")
    data = ref.get()

    incidents = []

    if data:
        for key, val in data.items():
            val["id"] = key
            incidents.append(val)

    return jsonify(incidents)

# =========================
# APPROVE
# =========================
@app.route("/approve/<incident_id>", methods=["POST"])
def approve_incident(incident_id):
    ref = db.reference(f"incidents/{incident_id}")
    ref.update({"approved": True})

    return jsonify({"success": True})

# =========================
# UPDATE STATUS
# =========================
@app.route("/update-status/<incident_id>", methods=["POST"])
def update_status(incident_id):
    data = request.json

    ref = db.reference(f"incidents/{incident_id}")
    ref.update({"status": data["status"]})

    return jsonify({"success": True})

# =========================
# UPDATE PRIORITY
# =========================
@app.route("/update-priority/<incident_id>", methods=["POST"])
def update_priority(incident_id):
    data = request.json

    ref = db.reference(f"incidents/{incident_id}")
    ref.update({"priority": data["priority"]})

    return jsonify({"success": True})

# =========================
# BRIEFING
# =========================
@app.route("/briefing", methods=["GET"])
def get_briefing():
    ref = db.reference("incidents")
    data = ref.get()

    if not data:
        return jsonify({"briefing": "No incidents."})

    active = [
        v for v in data.values()
        if v.get("approved") and v.get("status") == "active"
    ]

    if not active:
        return jsonify({"briefing": "No active incidents."})

    summaries = "\n".join([
        f"- {i['priority']} {i['crisis_type']} at {i['location_name']}"
        for i in active
    ])

    prompt = f"""
Create a short emergency briefing.

{summaries}
"""

    response = model.generate_content(prompt)

    return jsonify({
        "briefing": response.text.strip()
    })

# =========================
# RUN
# =========================
if __name__ == "__main__":
    app.run(debug=True, port=5000)