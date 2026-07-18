# Social Fitness

## ¿Qué es esta aplicación?

Social Fitness es una propuesta de aplicación web orientada a acompañar a las personas que desean iniciar o retomar una rutina de ejercicio de forma más segura, motivadora y personalizada. La idea principal es hacer que la experiencia de entrada al mundo del fitness sea más cercana, comprensible y agradable, reduciendo la incertidumbre y aumentando la motivación desde el primer contacto.

La aplicación incluye un flujo de bienvenida, registro, autenticación, un cuestionario inicial para conocer los intereses y objetivos de cada usuario, y un panel de inicio que sirve como punto de partida para la experiencia Social Fitness

## 📑 Índice

- [Acerca del Proyecto](#acerca-del-proyecto)
- [Características Principales](#características-principales)
- [Tecnologías Utilizadas](#tecnologías-utilizadas)
- [Instalación y Configuración](#instalación-y-configuración)
- [Estructura de Roles](#estructura-de-roles)

---

## 🎯 Acerca del Proyecto

Mantener la constancia en el ejercicio puede ser un desafío solitario. Social Fitness resuelve este problema creando un entorno digital donde el progreso individual se combina con el apoyo comunitario. A través de métricas de rachas, bitácoras privadas y un feed de interacción social, la plataforma transforma el entrenamiento diario en una experiencia compartida y motivadora.

---

## ✨ Características Principales

- **Sincronización mediante Códigos QR:** Conecta tu perfil con el de otros atletas escaneando un código QR dinámico para agregarlos a tu red de amigos al instante.
- **Feed Comunitario:** Muro público para publicar actualizaciones, subir fotos de progreso, comentar y dar likes a las publicaciones de tu red sincronizada.
- **Panel de Métricas y Seguimiento:** Bitácora personal privada para registrar rutinas, peso levantado, tiempos y llevar un conteo automático de tus rachas de entrenamiento activo.
- **Catálogo de Servicios Interactivo:** Hub integrado para visualizar asesorías y planes de entrenamiento con un diseño de carrusel 3D fluido.
- **Sistema SPA (Single Page Application):** Navegación fluida por pestañas sin recargar la página, optimizada para dispositivos móviles.

---

## 🛠️ Tecnologías Utilizadas

- **Backend:** Python, Flask
- **Frontend:** HTML5, CSS3, JavaScript (Vanilla JS)
- **Base de Datos / Almacenamiento:** Archivos JSON estructurados para perfiles y actividades.
- **Librerías Adicionales:** QRCode.js (Generación visual de QR en el cliente).

---

## 🚀 Instalación y Configuración

Si deseas correr este proyecto en un entorno local, sigue estos pasos:

1. **Clonar el repositorio:**
   ```bash
   git clone [https://github.com/tu-usuario/social-fitness.git](https://github.com/tu-usuario/social-fitness.git)
   cd social-fitnessrsonalizada.
   ```

## ¿Qué problema resuelve?

Social Fitness busca abordar problemas comunes como:

- la desmotivación al comenzar un cambio de hábitos;
- la inseguridad o ansiedad frente a un entorno desconocido;
- la falta de orientación al inicio del proceso;
- la necesidad de generar una experiencia más humana, social y acompañada.
- el hecho de que muchas personas se sientan como un número más dentro de un espacio grande y poco personalizado.

La propuesta busca convertir la primera interacción en un puente de confianza que ayude a que las personas se sientan más cómodas, valoradas y comprometidas. Uno de los objetivos principales era que los usuarios sintieran un sentido de pertenencia, que no se sintieran solos en su proceso y que pudieran encontrar un espacio donde el apoyo, la motivación y la comunidad fueran parte central de la experiencia.

Además, se buscó fortalecer la identificación de personal mejor capacitado, mejorar la organización y la respuesta ante la afluencia de personas, y crear mecanismos que favorecieran relaciones más sólidas entre los miembros. La idea fue inspirarse en plataformas como Twitch y TikTok, que han demostrado que el sentido de comunidad, la interacción constante y la experiencia social pueden impulsar de forma significativa la participación y la fidelidad de las personas.

## ¿Qué incluye la app?

- Registro e inicio de sesión de usuarios.
- Formulario de bienvenida y recolección de información inicial.
- Cuestionario de motivación y objetivos.
- Panel principal para mostrar el avance del usuario.
- Diseño simple y enfocado en la experiencia de usuario.

## Desarrollo

Esta aplicación fue desarrollada con Flask, un framework ligero de Python para construir aplicaciones web. La interfaz se estructura con plantillas HTML y estilos personalizados, mientras que la lógica del negocio y el flujo de onboarding se organiza mediante rutas y vistas.

Algunas tecnologías y componentes utilizados:

- Python 3
- Flask
- Jinja2
- Flask-WTF
- Archivos JSON para almacenar información básica del flujo del proyecto

La estructura del proyecto está organizada para separar la lógica de la aplicación, las rutas de onboarding y las plantillas visuales.

## Cómo correr la aplicación

### 1. Crear un entorno virtual

```bash
python3 -m venv venv
source venv/bin/activate
```

### 2. Instalar dependencias

```bash
pip install -r requirements.txt
```

### 3. Ejecutar la aplicación

```bash
python run.py
```

La aplicación quedará disponible en:

```text
http://127.0.0.1:5000
```

## Agradecimientos

Agradecemos profundamente a todos los participantes de este proyecto por su compromiso, creatividad y esfuerzo en cada etapa del desarrollo. Su colaboración fue fundamental para construir esta propuesta con un enfoque humano, innovador y orientado a resolver necesidades reales.

Agradecimiento especial a:

- Ivania Quetzalli Durán Montiel: Desarrollo de Negocios y Alianzas (Business Development). Encargada de la escalabilidad del proyecto, análisis de mercado y gestión de alianzas estratégicas con gimnasios o marcas externas.

- Luis Javier Arriaga Carranza : Lead Developer & Arquitecto de Software. Encargado del desarrollo backend (Python/Flask), la interactividad frontend (JavaScript) y la lógica de la base de datos.

- Areli Alcántara Martínez: Especialista en Seguridad y Prevención de Riesgos. Encargada de auditar la seguridad de la plataforma, el comportamiento de los usuarios (moderación del feed) y la prevención de vulnerabilidades.

- Alejandra Ivonne Soto Díaz: captación de usuarios y diseño del embudo de ventas.

- Alfonso Mojica García: Responsable de la optimización de los procesos internos del equipo.

- Estefani Jacinto Guillén : Asesora Legal y Cumplimiento Normativo (Compliance). Encargada de redactar los Términos y Condiciones, Políticas de Privacidad y asegurar que la aplicación cumpla con las leyes de protección de datos aplicables.
