from flask import render_template, request, jsonify
import json
import os
from . import onboarding_bp

RESPONSES_FILE = 'responses.json'

@onboarding_bp.route('/dashboard', methods=['GET'])
def dashboard():
    return render_template('onboarding/dashboard.html')

@onboarding_bp.route('/', methods=['GET'])
def index():
    return render_template('onboarding/questionnaire.html')

@onboarding_bp.route('/api/submit', methods=['POST'])
def submit():
    data = request.json
    
    # Lógica para guardar en archivo temporal (Sustituto de Base de Datos)
    responses = []
    if os.path.exists(RESPONSES_FILE):
        with open(RESPONSES_FILE, 'r', encoding='utf-8') as f:
            try:
                responses = json.load(f)
            except json.JSONDecodeError:
                responses = []
                
    responses.append(data)
    
    with open(RESPONSES_FILE, 'w', encoding='utf-8') as f:
        json.dump(responses, f, indent=4, ensure_ascii=False)

    return jsonify({"status": "success", "message": "Datos guardados correctamente."})