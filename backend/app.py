import os
import json
import time
import threading
import requests
import random
import smtplib
from email.mime.text import MIMEText
from flask import Flask, request, jsonify
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, db
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# Initialize Firebase only if not already initialized
if not firebase_admin._apps:
    cred = credentials.Certificate("serviceAccountKey.json")
    firebase_admin.initialize_app(cred, {
        'databaseURL': os.getenv("FIREBASE_DB_URL")
    })

EMAIL_USER = os.getenv("EMAIL_USER")
EMAIL_PASS = os.getenv("EMAIL_PASS")

verification_codes = {}

def extract_with_ai(raw_text):
    """MOCK AI EXTRACTION: Replaces external API calls with local keyword logic."""
    lower_text = raw_text.lower()
    
    # Simple keyword detection
    crisis_type = "other"
    if "fire" in lower_text or "burn" in lower_text:
        crisis_type = "fire"
    elif "flood" in lower_text or "water" in lower_text or "rain" in lower_text:
        crisis_type = "flood"
    elif "accident" in lower_text or "crash" in lower_text or "traffic" in lower_text:
        crisis_type = "traffic"
    elif "medical" in lower_text or "heart" in lower_text or "injured" in lower_text or "outage" in lower_text:
        crisis_type = "medical"
    elif "collapse" in lower_text or "building" in lower_text:
        crisis_type = "structural"

    severity = "medium"
    if "critical" in lower_text or "dead" in lower_text or "massive" in lower_text:
        severity = "critical"
    elif "high" in lower_text or "urgent" in lower_text or "major" in lower_text or "big" in lower_text:
        severity = "high"

    return {
        "location_name": "Extracted Location (Mock)",
        "crisis_type": crisis_type,
        "severity": severity,
        "affected_count": random.randint(1, 15) if severity in ["high", "critical"] else random.randint(1, 5),
        "needs": ["medical", "police"] if crisis_type == "traffic" else ["rescue", "fire"] if crisis_type == "fire" else ["rescue"],
        "summary": f"User reported a {severity} severity {crisis_type} incident: {raw_text[:50]}..."
    }

def get_coordinates(location_name):
    try:
        url = "https://nominatim.openstreetmap.org/search"
        params = {"q": f"{location_name}, Bangalore, India", "format": "json", "limit": 1}
        headers = {"User-Agent": "CrisisMapBangalore/1.0"}
        response = requests.get(url, params=params, headers=headers)
        results = response.json()
        if results:
            return float(results[0]["lat"]), float(results[0]["lon"])
    except Exception as e:
        print("Geocoding error:", e)
    
    # Return some random coordinates around Bangalore center if geocoding fails
    return 12.9716 + random.uniform(-0.05, 0.05), 77.5946 + random.uniform(-0.05, 0.05)

def assign_priority(severity, affected_count, crisis_type):
    if severity == "critical":
        return "P1"
    elif severity == "high":
        if affected_count is not None and affected_count > 10:
            return "P1"
        if crisis_type in ["medical", "structural"]:
            return "P1"
        return "P2"
    elif severity == "medium":
        if affected_count is not None and affected_count > 5:
            return "P2"
        return "P3"
    return "P3"

def send_email_code(receiver_email, code):
    try:
        subject = "CrisisMap Email Verification"
        body = f"Your CrisisMap verification code is:\n\n{code}\n\nDo not share this code with anyone."
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

    return jsonify({"success": True, "message": "Verification code sent"})

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
        return jsonify({"success": True, "message": "Verification successful"})

    return jsonify({"success": False, "message": "Invalid code"})

@app.route("/submit", methods=["POST"])
def submit_report():
    try:
        data = request.json or {}
        raw_text = data.get("text", "")
        location_input = data.get("location", "")
        
        if not raw_text:
            return jsonify({"error": "Report text is required"}), 400

        extracted = extract_with_ai(raw_text)
        
        location_name = location_input if location_input else extracted.get("location_name", "Unknown Area")
        lat, lng = get_coordinates(location_name)
        
        priority = assign_priority(
            extracted.get("severity", "low"),
            extracted.get("affected_count"),
            extracted.get("crisis_type", "other")
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
            "timestamp": int(time.time() * 1000),
            "source": "citizen"
        }

        ref = db.reference("incidents")
        ref.push(incident)

        return jsonify({"success": True})
    except Exception as e:
        print(f"Submit Error: {e}")
        return jsonify({"error": str(e)}), 500

def run_news_scrape():
    try:
        # Mocking News Scrape
        print("Running mock news scrape...")
        incidents = [
            {
                "raw_text": "Massive traffic jam due to multicar collision on Silk Board Junction",
                "location_name": "Silk Board Junction",
                "crisis_type": "traffic",
                "severity": "high",
                "affected_count": 15,
                "needs": ["police", "medical"],
                "summary": "Multi-car collision causing severe traffic gridlock at Silk Board.",
                "article_url": "https://timesofindia.indiatimes.com/"
            },
            {
                "raw_text": "Waterlogging and severe floods near Bellandur tech park after heavy rains",
                "location_name": "Bellandur",
                "crisis_type": "flood",
                "severity": "critical",
                "affected_count": 150,
                "needs": ["rescue", "food_water"],
                "summary": "Bellandur tech park area severely flooded trapping commuters.",
                "article_url": "https://timesofindia.indiatimes.com/"
            }
        ]
        
        ref = db.reference("incidents")
        
        for item in incidents:
            lat, lng = get_coordinates(item.get("location_name", "Bangalore"))
            priority = assign_priority(item.get("severity", "low"), item.get("affected_count"), item.get("crisis_type", "other"))
            
            incident = {
                "raw_text": item.get("raw_text", ""),
                "location_name": item.get("location_name", "Bangalore"),
                "lat": lat,
                "lng": lng,
                "crisis_type": item.get("crisis_type", "other"),
                "priority": priority,
                "needs": item.get("needs", []),
                "summary": item.get("summary", ""),
                "status": "active",
                "approved": True, # Auto approve news
                "report_count": 1,
                "timestamp": int(time.time() * 1000),
                "source": "news",
                "article_url": item.get("article_url", "")
            }
            ref.push(incident)

        # Mocking Prone Areas
        prone_areas = [
            {"area_name": "Bellandur", "lat": 12.9279, "lng": 77.6271, "reason": "Consistent heavy waterlogging", "incident_count": 5},
            {"area_name": "Silk Board", "lat": 12.9172, "lng": 77.6228, "reason": "High frequency traffic collisions", "incident_count": 8}
        ]
        
        prone_ref = db.reference("prone_areas")
        prone_ref.set({}) # Clear old
        for pa in prone_areas:
            prone_ref.push(pa)

    except Exception as e:
        print("Scrape Error:", e)

def background_scraper():
    # Run once initially, then every 10 mins
    run_news_scrape()
    while True:
        time.sleep(600) # 10 mins
        run_news_scrape()

@app.route("/scrape-news", methods=["GET", "POST"])
def trigger_scrape():
    run_news_scrape()
    return jsonify({"success": True})

def generate_briefing():
    try:
        ref = db.reference("incidents")
        data = ref.get()
        if not data:
            return
        
        active = [v for v in data.values() if v.get("approved") and v.get("status") == "active"]
        
        # Mocking Briefing Logic
        if not active:
            briefing_text = "All clear. No active emergencies in Bangalore region at this time. Standard municipal operations normal."
        else:
            briefing_text = f"CRITICAL UPDATE: City intelligence is currently tracking {len(active)} active emergency situations across Bangalore. High priority clusters identified with immediate requirement for dispatch. Citizens are advised to follow established evacuation protocols and avoid marked P1 zones."
        
        db.reference("briefing/current").set({
            "text": briefing_text,
            "last_updated": int(time.time() * 1000)
        })
    except Exception as e:
        print("Briefing Error:", e)

def background_briefing():
    # Run once initially, then every 5 mins
    generate_briefing()
    while True:
        time.sleep(300) # 5 mins
        generate_briefing()

@app.route("/briefing", methods=["GET"])
def get_briefing():
    generate_briefing()
    data = db.reference("briefing/current").get()
    return jsonify({"briefing": data.get("text", "") if data else ""})

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

@app.route("/approve/<incident_id>", methods=["POST"])
def approve_incident(incident_id):
    db.reference(f"incidents/{incident_id}").update({"approved": True})
    return jsonify({"success": True})

@app.route("/update-status/<incident_id>", methods=["POST"])
def update_status(incident_id):
    db.reference(f"incidents/{incident_id}").update({"status": request.json["status"]})
    return jsonify({"success": True})

@app.route("/update-priority/<incident_id>", methods=["POST"])
def update_priority(incident_id):
    db.reference(f"incidents/{incident_id}").update({"priority": request.json["priority"]})
    return jsonify({"success": True})

@app.route("/delete/<incident_id>", methods=["DELETE"])
def delete_incident(incident_id):
    db.reference(f"incidents/{incident_id}").delete()
    return jsonify({"success": True})

@app.route("/broadcast", methods=["POST"])
def add_broadcast():
    msg = request.json.get("message")
    db.reference("broadcasts").push({
        "message": msg,
        "timestamp": int(time.time() * 1000),
        "active": True
    })
    return jsonify({"success": True})

@app.route("/clear-broadcasts", methods=["POST"])
def clear_broadcasts():
    db.reference("broadcasts").delete()
    return jsonify({"success": True})

if __name__ == "__main__":
    threading.Thread(target=background_scraper, daemon=True).start()
    threading.Thread(target=background_briefing, daemon=True).start()
    app.run(debug=True, port=5000, use_reloader=False)