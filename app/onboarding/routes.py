import hashlib
import json
import os
import re
import random
import string
import html
# Importamos 'session' para mantener el rastreo del usuario conectado
from flask import Blueprint, render_template, request, jsonify, redirect, url_for, session
from . import onboarding_bp
from werkzeug.utils import secure_filename
from datetime import datetime, timedelta

POSTS_ACTIVITIES_FILE = 'posts_activities.json'
RESPONSES_FILE = 'responses.json'
APERTURAS_JSON = os.path.join(os.path.dirname(__file__), '../static/data/registro_aperturas.json')

# Configuración corporativa de subidas multimedia
UPLOAD_FOLDER = os.path.join('app', 'static', 'uploads')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

# =====================================================================
# FUNCIONES AUXILIARES DE SEGURIDAD Y PERFIL
# =====================================================================
def allowed_file(filename):
    """Valida que la extensión del archivo sea una imagen soportada."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def sanitizar_texto(texto):
    if not texto: return ""
    texto_limpio = texto.strip()
    texto_limpio = html.escape(texto_limpio)
    texto_limpio = re.sub(r"[\"';\-]", "", texto_limpio)
    return texto_limpio

def es_contrasena_segura(password):
    if len(password) < 8: return False
    if not re.search(r"[A-Za-z]", password): return False
    if not re.search(r"[0-9]", password): return False
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password): return False
    return True

def generar_username_unico(primer_nombre, usuarios_existentes):
    nombre_limpio = re.sub(r"[^a-zA-Z]", "", primer_nombre).lower()[:5]
    if not nombre_limpio: nombre_limpio = "user"
    
    intentos = 0
    while intentos < 100:
        digitos = "".join(random.choices(string.digits, k=3))
        username = f"@{nombre_limpio}{digitos}"
        if not any(u.get('user_name') == username for u in usuarios_existentes):
            return username
        intentos += 1
    return f"@{nombre_limpio}{random.randint(1000, 9999)}"

def marcar_dispositivo_como_abierto(ip):
    aperturas = []
    if os.path.exists(APERTURAS_JSON):
        try:
            with open(APERTURAS_JSON, 'r', encoding='utf-8') as f:
                aperturas = json.load(f)
        except Exception:
            aperturas = []
            
    if ip not in aperturas:
        aperturas.append(ip)
        os.makedirs(os.path.dirname(APERTURAS_JSON), exist_ok=True)
        with open(APERTURAS_JSON, 'w', encoding='utf-8') as f:
            json.dump(aperturas, f, indent=4)

def cargar_datos_comunidad():
    if not os.path.exists(POSTS_ACTIVITIES_FILE):
        return {"usuarios": {}, "feed_publico": []}
    try:
        with open(POSTS_ACTIVITIES_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return {"usuarios": {}, "feed_publico": []}

def guardar_datos_comunidad(data):
    with open(POSTS_ACTIVITIES_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

# =====================================================================
# 1. CONTROLADORES DE VISTAS (RUTAS)
# =====================================================================

@onboarding_bp.route('/', methods=['GET'])
def index():
    user_ip = request.remote_addr
    aperturas = []
    if os.path.exists(APERTURAS_JSON):
        try:
            with open(APERTURAS_JSON, 'r', encoding='utf-8') as f:
                aperturas = json.load(f)
        except Exception: pass

    if user_ip in aperturas:
        return redirect(url_for('onboarding.dashboard'))
    return render_template('onboarding/welcome.html')

@onboarding_bp.route('/login', methods=['GET'])
def login():
    marcar_dispositivo_como_abierto(request.remote_addr)
    return render_template('onboarding/login.html')

@onboarding_bp.route('/registro-formulario', methods=['GET'])
def registro_formulario():
    marcar_dispositivo_como_abierto(request.remote_addr)
    return render_template('onboarding/registro.html')

@onboarding_bp.route('/motivacion-formulario', methods=['GET'])
def motivacion_formulario():
    if 'user_name' not in session:
        return redirect(url_for('onboarding.login'))
    return render_template('onboarding/questionnaire.html')

@onboarding_bp.route('/dashboard', methods=['GET'])
def dashboard():
    marcar_dispositivo_como_abierto(request.remote_addr)
    return render_template('onboarding/dashboard.html')

# =====================================================================
# 2. PROCESAMIENTO ASÍNCRONO DE AUTENTICACIÓN Y SUBMIT (APIS)
# =====================================================================

@onboarding_bp.route('/api/auth-login', methods=['POST'])
def auth_login():
    try:
        data = request.json or {}
        identity = data.get('identity', '').strip()
        password = data.get('password', '')

        responses = []
        if os.path.exists(RESPONSES_FILE):
            with open(RESPONSES_FILE, 'r', encoding='utf-8') as f:
                try: responses = json.load(f)
                except json.JSONDecodeError: pass

        hashed_input_password = hashlib.sha256(password.encode('utf-8')).hexdigest()

        cuenta_usuario = None
        for u in responses:
            if u.get('reg_email', '').lower() == identity.lower() or u.get('user_name', '') == identity:
                if u.get('reg_password') == hashed_input_password:
                    cuenta_usuario = u
                    break

        if not cuenta_usuario:
            return jsonify({"status": "error", "message": "Usuario o contraseña incorrectos."}), 401

        session['user_name'] = cuenta_usuario['user_name']

        tiene_motivacion = any(
            m.get('user_name') == cuenta_usuario['user_name'] and 'q1_motivacion' in m 
            for m in responses
        )

        if tiene_motivacion:
            return jsonify({"status": "success", "redirect": url_for('onboarding.dashboard')})
        else:
            return jsonify({"status": "success", "redirect": url_for('onboarding.motivacion_formulario')})

    except Exception as e:
        return jsonify({"status": "error", "message": "Error interno del servidor."}), 500


@onboarding_bp.route('/api/submit', methods=['POST'])
def submit():
    try:
        data = request.json
        if not data:
            return jsonify({"status": "error", "message": "No se recibieron datos."}), 400
        
        responses = []
        if os.path.exists(RESPONSES_FILE):
            with open(RESPONSES_FILE, 'r', encoding='utf-8') as f:
                try: responses = json.load(f)
                except json.JSONDecodeError: pass

        if 'reg_password' in data:
            email_peticion = data.get('reg_email', '').strip()
            password_peticion = data.get('reg_password', '')
            nombre_peticion = data.get('reg_nombre', '').strip()

            if not re.match(r"^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]+$", nombre_peticion):
                return jsonify({
                    "status": "error", 
                    "message": "El campo Nombre y Apellido solo puede contener letras y espacios."
                }), 400

            data['reg_nombre'] = nombre_peticion.upper()

            if any(u.get('reg_email', '').lower() == email_peticion.lower() for u in responses):
                return jsonify({"status": "error", "message": "El correo ya existe."}), 400

            if not es_contrasena_segura(password_peticion):
                return jsonify({"status": "error", "message": "Contraseña insegura."}), 400

            primer_nombre = data['reg_nombre'].split(" ")[0]
            user_name_generado = generar_username_unico(primer_nombre, responses)
            data['user_name'] = user_name_generado
            
            session['user_name'] = user_name_generado

            data['reg_password'] = hashlib.sha256(password_peticion.encode('utf-8')).hexdigest()
            data.pop('reg_password_confirm', None)

        else:
            if 'user_name' not in session:
                return jsonify({"status": "error", "message": "Sesión no válida para completar perfil."}), 403
            
            data['user_name'] = session['user_name']
            data['motivacion_respondida'] = True

        for campo in data:
            if isinstance(data[campo], str):
                data[campo] = sanitizar_texto(data[campo])

        data['user_ip'] = request.remote_addr
        
        responses.append(data)
        with open(RESPONSES_FILE, 'w', encoding='utf-8') as f:
            json.dump(responses, f, indent=4, ensure_ascii=False)

        if 'reg_password' in data:
            return jsonify({
                "status": "success", 
                "message": "Registro completado exitosamente.",
                "user_name": data.get('user_name', ''),
                "redirect": url_for('onboarding.motivacion_formulario')
            })
            
        return jsonify({
            "status": "success", 
            "message": "Información de motivación procesada exitosamente.",
            "user_name": data.get('user_name', ''),
            "redirect": url_for('onboarding.dashboard')
        })
    
    except Exception as e:
        print(f"🚨 Error crítico en /api/submit: {str(e)}")
        return jsonify({"status": "error", "message": "Error interno del servidor."}), 500

@onboarding_bp.route('/api/check-email', methods=['POST'])
def check_email():
    try:
        data = request.json or {}
        email_a_comprobar = data.get('email', '').strip().lower()
        if not email_a_comprobar: return jsonify({"status": "available"})

        responses = []
        if os.path.exists(RESPONSES_FILE):
            with open(RESPONSES_FILE, 'r', encoding='utf-8') as f:
                try: responses = json.load(f)
                except json.JSONDecodeError: pass

        if any(u.get('reg_email', '').strip().lower() == email_a_comprobar for u in responses):
            return jsonify({"status": "taken", "message": "El correo electrónico ya se encuentra registrado."})

        return jsonify({"status": "available"})
    except Exception as e:
        return jsonify({"status": "error", "message": "Error al validar el correo."}), 500

@onboarding_bp.route('/logout', methods=['GET'])
def logout():
    user_ip = request.remote_addr
    session.clear()
    
    if os.path.exists(APERTURAS_JSON):
        try:
            with open(APERTURAS_JSON, 'r', encoding='utf-8') as f:
                aperturas = json.load(f)
            if user_ip in aperturas:
                aperturas.remove(user_ip)
                with open(APERTURAS_JSON, 'w', encoding='utf-8') as f:
                    json.dump(aperturas, f, indent=4)
        except Exception as e:
            print(f"🚨 Error al remover la IP durante el logout: {str(e)}")

    return redirect(url_for('onboarding.index'))

@onboarding_bp.route('/api/profile-data', methods=['GET'])
def get_profile_data():
    if 'user_name' not in session:
        return jsonify({"status": "error", "message": "No autorizado"}), 401
    
    username = session['user_name']
    db = cargar_datos_comunidad()
    
    if username not in db["usuarios"]:
        db["usuarios"][username] = {
            "racha": 0,
            "total_entrenamientos": 0,
            "ultima_fecha_actividad": None,
            "seguimiento_privado": []
        }
        guardar_datos_comunidad(db)
        
    user_data = db["usuarios"][username]
    
    return jsonify({
        "status": "success",
        "racha": user_data["racha"],
        "entrenamientos": user_data["total_entrenamientos"],
        "seguimiento": user_data["seguimiento_privado"],
        "feed": db["feed_publico"]
    })

@onboarding_bp.route('/api/profile-action', methods=['POST'])
def profile_action():
    if 'user_name' not in session:
        return jsonify({"status": "error", "message": "No autorizado"}), 401
        
    username = session['user_name']
    db = cargar_datos_comunidad()
    
    user_profile = db["usuarios"].setdefault(username, {
        "racha": 0,
        "total_entrenamientos": 0,
        "ultima_fecha_actividad": None,
        "seguimiento_privado": []
    })
    
    hoy_str = datetime.now().strftime('%Y-%m-%d')
    
    # --- DETECCION INTERRUPCIÓN MULTIMEDIA: FORMULARIO DE NUEVO POST CON O SIN FOTO ---
    if 'foto' in request.files or request.form.get('type') == 'post':
        texto = sanitizar_texto(request.form.get('text', ''))
        privacidad = request.form.get('privacy', 'private')
        
        if not texto and 'foto' not in request.files:
            return jsonify({"status": "error", "message": "La publicación no puede estar vacía."}), 400

        image_url = None

        if 'foto' in request.files:
            file = request.files['foto']
            if file and file.filename != '' and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                unique_filename = f"{int(datetime.now().timestamp())}_{filename}"
                os.makedirs(UPLOAD_FOLDER, exist_ok=True)
                file_path = os.path.join(UPLOAD_FOLDER, unique_filename)
                file.save(file_path)
                image_url = f"/static/uploads/{unique_filename}"

        nuevo_post = {
            "autor": username,
            "fecha": hoy_str,
            "texto": texto,
            "imagen": image_url,
            "privacidad": privacidad
        }
        
        if privacidad == 'public':
            db["feed_publico"].insert(0, nuevo_post)
        else:
            user_profile["seguimiento_privado"].insert(0, {
                "fecha": hoy_str,
                "detalle": f"📝 [Post Privado] {texto}",
                "imagen": image_url,
                "tipo": "post"
            })

    # --- PETICION TRADICIONAL JSON: NUEVO REGISTRO DE ACTIVIDAD FÍSICA ---
    else:
        data = request.json or {}
        detalle = sanitizar_texto(data.get('detail', ''))
        if not detalle:
            return jsonify({"status": "error", "message": "Contenido vacío"}), 400
            
        nueva_actividad = {
            "fecha": hoy_str,
            "detalle": detalle,
            "imagen": None,
            "tipo": "actividad"
        }
        
        user_profile["seguimiento_privado"].insert(0, nueva_actividad)
        user_profile["total_entrenamientos"] += 1
        
        ultima_fecha = user_profile["ultima_fecha_actividad"]
        if ultima_fecha is None:
            user_profile["racha"] = 1
        else:
            ult_dt = datetime.strptime(ultima_fecha, '%Y-%m-%d')
            hoy_dt = datetime.strptime(hoy_str, '%Y-%m-%d')
            diferencia = (hoy_dt - ult_dt).days
            
            if diferencia == 1:
                user_profile["racha"] += 1
            elif diferencia > 1:
                user_profile["racha"] = 1
            
        user_profile["ultima_fecha_actividad"] = hoy_str
            
    guardar_datos_comunidad(db)
    return jsonify({
        "status": "success", 
        "racha": user_profile["racha"], 
        "entrenamientos": user_profile["total_entrenamientos"],
        "seguimiento": user_profile["seguimiento_privado"],
        "feed": db["feed_publico"]
    })