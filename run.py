from app import create_app

app = create_app()

if __name__ == '__main__':
    # Ejecutar en host 0.0.0.0 para probarlo desde tu celular en la misma red WiFi
    app.run(host='0.0.0.0', port=5000, debug=True)