from flask import Flask
from flask_wtf.csrf import CSRFProtect

# Instanciamos la protección CSRF
csrf = CSRFProtect()

def create_app():
    app = Flask(__name__)
    # Esta llave es obligatoria para generar los tokens de forma segura
    app.config['SECRET_KEY'] = 'hackathon-secret-key-2026'

    # Inicializamos la protección en la app
    csrf.init_app(app)

    # Registro de Blueprints
    from app.onboarding.routes import onboarding_bp
    app.register_blueprint(onboarding_bp)

    return app