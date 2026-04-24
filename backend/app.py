from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import firebase_admin
from firebase_admin import credentials, db
import requests
import os
import json
import time
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-2.0-flash")

cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred, {
    'databaseURL': os.getenv("FIREBASE_DB_URL")
})

def extract_with_gemini(raw_text):
    prompt = f"""You are an emergency analyst for Bangalore city. The input may be in English, Hindi, or Kannada. Extract information and return ONLY a valid JSON object with these fields: location_name as the specific place name, crisis_type as one of flood/fire/medical/structural/traffic/other, severity as one of critical/high/medium/low, affected_count as a number or null, needs as an array from rescue/medical/food_water/fire/police/shelter, summary as one sentence describing the situation.

Text: {raw_text}
"""
    response = model.generate_content(prompt)
    text = response.text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text.strip())

def get_coordinates(location_name):
    url = f"https://nominatim.openstreetmap.org/search"
    params = {
        "q": f"{location_name}, Bangalore, India",
        "format": "json",
        "limit": 1
    }
    headers = {"User-Agent": "CrisisMapBangalore/1.0"}
    response = requests.get(url, params=params, headers=headers)
    results = response.json()
    if results:
        return float(results[0]["lat"]), float(results[0]["lon"])
    return 12.9716, 77.5946

def assign_priority(severity, affected_count):
    if severity == "critical":
        return "P1"
    elif severity == "high":
        return "P1" if affected_count and affected_count > 10 else "P2"
    elif severity == "medium":
        return "P2"
    else:
        return "P3"

@app.route("/send-code", methods=["POST"])
def send_code():
    data = request.json or {}
    email = data.get("email", "")
    if not email:
        return jsonify({"error": "No email provided"}), 400
        
    # Generate a random 4-digit code
    import random
    code = f"{random.randint(1000, 9999)}"
    
    # In a real app, you would use smtplib or SendGrid here
    print(f"\n=========================================")
    print(f"📧 EMAIL SENT TO: {email}")
    print(f"🔐 VERIFICATION CODE: {code}")
    print(f"=========================================\n")
    
    return jsonify({"message": "Code sent successfully", "code": code})

@app.route("/submit", methods=["POST"])
def submit_report():
    data = request.json or {}
    raw_text = data.get("text", "")
    
    if not raw_text:
        raw_text = "SOS Emergency at current location. Immediate aid requested."
        
    extracted = extract_with_gemini(raw_text)
    
    location_name = extracted.get("location_name", "Unknown Area")
    lat, lng = get_coordinates(location_name)
    priority = assign_priority(extracted.get("severity", "high"), extracted.get("affected_count"))
    
    incident = {
        "raw_text": raw_text,
        "location_name": location_name,
        "lat": lat,
        "lng": lng,
        "crisis_type": extracted.get("crisis_type", "other"),
        "priority": priority,
        "needs": extracted.get("needs", []),
        "summary": extracted.get("summary", "Emergency reported automatically."),
        "status": "active",
        "approved": False,
        "report_count": 1,
        "timestamp": int(time.time() * 1000)
    }
    
    ref = db.reference("incidents")
    ref.push(incident)
    
    return jsonify({"success": True, "message": "Report received"})

@app.route("/incidents", methods=["GET"])
def get_incidents():
    ref = db.reference("incidents")
    data = ref.get()
    incidents = []
    if data:
        for key, val in data.items():
            val["id"] = key
            incidents.append(val)
            
    # Pull active real entries from USGS Earthquake API
    try:
        res = requests.get("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson", timeout=5)
        if res.status_code == 200:
            eq_data = res.json()
            for feat in eq_data.get("features", [])[:20]: # top 20 recent
                mag = feat["properties"]["mag"]
                place = feat["properties"]["place"]
                time_ms = feat["properties"]["time"]
                coords = feat["geometry"]["coordinates"] # [lon, lat, depth]
                
                priority = "P1" if mag >= 6.0 else ("P2" if mag >= 5.0 else "P3")
                
                incidents.append({
                    "id": feat["id"],
                    "raw_text": f"Earthquake magnitude {mag} at {place}",
                    "location_name": place,
                    "lat": coords[1],
                    "lng": coords[0],
                    "crisis_type": "structural",
                    "priority": priority,
                    "needs": ["rescue", "medical"] if mag >= 6.0 else [],
                    "summary": f"Seismic event detected: Magnitude {mag}. {place}.",
                    "status": "active",
                    "approved": True,
                    "report_count": 1,
                    "timestamp": time_ms
                })
    except Exception as e:
        print("Failed to fetch USGS data:", e)
        
    return jsonify(incidents)

@app.route("/approve/<incident_id>", methods=["POST"])
def approve_incident(incident_id):
    ref = db.reference(f"incidents/{incident_id}")
    ref.update({"approved": True})
    return jsonify({"success": True})

@app.route("/update-status/<incident_id>", methods=["POST"])
def update_status(incident_id):
    data = request.json
    ref = db.reference(f"incidents/{incident_id}")
    ref.update({"status": data["status"]})
    return jsonify({"success": True})

@app.route("/update-priority/<incident_id>", methods=["POST"])
def update_priority(incident_id):
    data = request.json
    ref = db.reference(f"incidents/{incident_id}")
    ref.update({"priority": data["priority"]})
    return jsonify({"success": True})

@app.route("/briefing", methods=["GET"])
def get_briefing():
    ref = db.reference("incidents")
    data = ref.get()
    if not data:
        return jsonify({"briefing": "No active incidents."})
    
    active = [v for v in data.values() if v.get("approved") and v.get("status") == "active"]
    if not active:
        return jsonify({"briefing": "No active incidents currently."})
    
    summaries = "\n".join([f"- {i['priority']} {i['crisis_type']} at {i['location_name']}: {i['summary']}" for i in active])
    
    prompt = f"""
You are a crisis analyst briefing an incident commander for Bangalore city.
Based on these active incidents, write a 3-4 sentence situation report.
Highlight the most critical areas and any urgent patterns.

Incidents:
{summaries}
"""
    response = model.generate_content(prompt)
    return jsonify({"briefing": response.text.strip()})

@app.route("/whatsapp", methods=["POST"])
def whatsapp_webhook():
    incoming = request.form.get("Body", "")
    
    if incoming.strip().upper() == "HELP":
        reply = "Emergency services have been notified. Please call 112 immediately. Stay where you are."
        return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response><Message>{reply}</Message></Response>"""
    
    if incoming.strip().upper() == "YES":
        reply = "Glad you are safe. Your report has been logged. Stay away from the affected area."
        return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response><Message>{reply}</Message></Response>"""
    
    extract_with_gemini(incoming)
    reply = "Report received. Are you safe? Reply YES or HELP."
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response><Message>{reply}</Message></Response>"""

if __name__ == "__main__":
    app.run(debug=True, port=5000)