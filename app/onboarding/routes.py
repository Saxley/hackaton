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

RESPONSES_FILE = 'responses.json'
APERTURAS_JSON = os.path.join(os.path.dirname(__file__), '../static/data/registro_aperturas.json')

# =====================================================================
# FUNCIONES AUXILIARES DE SEGURIDAD Y PERFIL
# =====================================================================
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
    # Si intentan entrar directo sin registrarse ni logearse, al login
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
    """
    CAMINO B: Inicia sesión -> Valida por user_name si tiene el formulario
    de motivación completado. Si no, va al formulario; si sí, al feed.
    """
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

        # Buscar la cuenta base del usuario
        cuenta_usuario = None
        for u in responses:
            if u.get('reg_email', '').lower() == identity.lower() or u.get('user_name', '') == identity:
                if u.get('reg_password') == hashed_input_password:
                    cuenta_usuario = u
                    break

        if not cuenta_usuario:
            return jsonify({"status": "error", "message": "Usuario o contraseña incorrectos."}), 401

        # Seteamos el user_name en la sesión activa del servidor
        session['user_name'] = cuenta_usuario['user_name']

        # COMPROBACIÓN REGLA: Buscar si existe OTRO registro en el JSON que contenga las respuestas
        # de motivación asociadas a este mismo 'user_name'
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
    """
    Maneja el envío de AMBOS formularios identificando la procedencia 
    gracias al rastreo por user_name en sesión.
    """
    try:
        data = request.json
        if not data:
            return jsonify({"status": "error", "message": "No se recibieron datos."}), 400
        
        responses = []
        if os.path.exists(RESPONSES_FILE):
            with open(RESPONSES_FILE, 'r', encoding='utf-8') as f:
                try: responses = json.load(f)
                except json.JSONDecodeError: pass

        # -----------------------------------------------------------------
        # CASO 1: VIENE DEL FORMULARIO DE REGISTRO (CREACIÓN DE CUENTA)
        # -----------------------------------------------------------------
        if 'reg_password' in data:
            email_peticion = data.get('reg_email', '').strip()
            password_peticion = data.get('reg_password', '')
            nombre_peticion = data.get('reg_nombre', '').strip()

            # REGLA EXCLUSIVA: Validar que solo contenga letras y espacios (evita números, @, etc.)
            if not re.match(r"^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]+$", nombre_peticion):
                return jsonify({
                    "status": "error", 
                    "message": "El campo Nombre y Apellido solo puede contener letras y espacios."
                }), 400

            # Transformar a mayúsculas el nombre completo respetando acentos y la Ñ
            data['reg_nombre'] = nombre_peticion.upper()

            if any(u.get('reg_email', '').lower() == email_peticion.lower() for u in responses):
                return jsonify({"status": "error", "message": "El correo ya existe."}), 400

            if not es_contrasena_segura(password_peticion):
                return jsonify({"status": "error", "message": "Contraseña insegura."}), 400

            # Generamos el username único usando el primer nombre ya transformado a mayúsculas
            primer_nombre = data['reg_nombre'].split(" ")[0]
            user_name_generado = generar_username_unico(primer_nombre, responses)
            data['user_name'] = user_name_generado
            
            # Guardamos el usuario recién creado en la sesión para el siguiente paso
            session['user_name'] = user_name_generado

            # Cifrado de credenciales
            data['reg_password'] = hashlib.sha256(password_peticion.encode('utf-8')).hexdigest()
            data.pop('reg_password_confirm', None)

        # -----------------------------------------------------------------
        # CASO 2: VIENE DEL FORMULARIO DE MOTIVACIÓN
        # -----------------------------------------------------------------
        else:
            if 'user_name' not in session:
                return jsonify({"status": "error", "message": "Sesión no válida para completar perfil."}), 403
            
            data['user_name'] = session['user_name']
            data['motivacion_respondida'] = True

        # Sanitización general contra inyecciones de código
        for campo in data:
            if isinstance(data[campo], str):
                data[campo] = sanitizar_texto(data[campo])

        data['user_ip'] = request.remote_addr
        
        # Guardar en la persistencia local JSON
        responses.append(data)
        with open(RESPONSES_FILE, 'w', encoding='utf-8') as f:
            json.dump(responses, f, indent=4, ensure_ascii=False)

        # RETORNO CON REDIRECCIÓN DINÁMICA DE FLUJO SEGÚN EL FORMULARIO ORIGEN
        if 'reg_password' in data:
            return jsonify({
                "status": "success", 
                "message": "Registro completado exitosamente.",
                "user_name": data.get('user_name', ''),
                "redirect": url_for('onboarding.motivacion_formulario') # Camino obligatorio al segundo formulario
            })
            
        return jsonify({
            "status": "success", 
            "message": "Información de motivación procesada exitosamente.",
            "user_name": data.get('user_name', ''),
            "redirect": url_for('onboarding.dashboard') # Camino obligatorio al feed final
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
    """
    Elimina la sesión activa del servidor, remueve la IP del registro de aperturas
    para forzar la vista de bienvenida, y limpia el navegador.
    """
    user_ip = request.remote_addr
    
    # 1. Limpiar la sesión de Flask
    session.clear()
    
    # 2. Remover la IP de registro_aperturas.json para permitir ver la pantalla amarilla otra vez
    if os.path.exists(APERTURAS_JSON):
        try:
            with open(APERTURAS_JSON, 'r', encoding='utf-8') as f:
                aperturas = json.load(f)
            
            # Si la IP actual está en la lista, la eliminamos
            if user_ip in aperturas:
                aperturas.remove(user_ip)
                
                # Volvemos a guardar el JSON limpio
                with open(APERTURAS_JSON, 'w', encoding='utf-8') as f:
                    json.dump(aperturas, f, indent=4)
        except Exception as e:
            print(f"🚨 Error al remover la IP durante el logout: {str(e)}")

    # 3. Redirigir a la pantalla de bienvenida inicial
    return redirect(url_for('onboarding.index'))