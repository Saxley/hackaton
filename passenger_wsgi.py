import os
import sys

# Ruta a la carpeta que contiene tu carpeta 'app'
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app
application = create_app()