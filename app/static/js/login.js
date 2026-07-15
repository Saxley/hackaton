/**
 * =====================================================================
 * AUTHENTICATION ENGINE - SMART FIT CORE V2 (LOGIN OOP)
 * =====================================================================
 */

class LoginUI {
  static initPasswordToggle() {
    const input = document.getElementById("login_password");
    const toggleIcon = document.getElementById("toggle-login-pass");

    if (input && toggleIcon) {
      toggleIcon.addEventListener("click", () => {
        const isPass = input.type === "password";
        input.type = isPass ? "text" : "password";
        toggleIcon.innerText = isPass ? "🔒" : "👁️";
      });
    }
  }

  static showModalAlert(message) {
    const alertDialog = document.getElementById("alert-dialog");
    const alertMessage = document.getElementById("alert-message");
    const closeAlertBtn = document.getElementById("close-alert-btn");

    if (alertDialog && alertMessage) {
      alertMessage.innerText = message;
      alertDialog.showModal();
      closeAlertBtn.onclick = () => alertDialog.close();
    } else {
      alert(message);
    }
  }
}

class LoginAuthManager {
  constructor() {
    this.form = document.getElementById("login-form");
    this.identityInput = document.getElementById("login_identity");
    this.passwordInput = document.getElementById("login_password");
    this.submitBtn = document.getElementById("btn-login-submit");
    this.forgotLink = document.getElementById("link-forgot");

    if (!this.form) return;
    this.bindEvents();
  }

  bindEvents() {
    this.form.addEventListener("submit", (e) => {
      e.preventDefault();
      this.handleLogin();
    });

    if (this.forgotLink) {
      this.forgotLink.addEventListener("click", (e) => {
        e.preventDefault();
        LoginUI.showModalAlert(
          "Para recuperar tus credenciales, por favor acude al mostrador de tu sucursal Smart Fit.",
        );
      });
    }
  }

  async handleLogin() {
    const identity = this.identityInput.value.trim();
    const password = this.passwordInput.value;

    if (!identity || !password) {
      LoginUI.showModalAlert(
        "Por favor, completa todos los campos requeridos.",
      );
      return;
    }

    this.submitBtn.innerText = "Verificando...";
    this.submitBtn.disabled = true;

    const csrfToken = document
      .querySelector('meta[name="csrf-token"]')
      .getAttribute("content");

    try {
      const response = await fetch("/api/auth-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken,
        },
        body: JSON.stringify({ identity, password }),
      });

      const data = await response.json();

      if (response.ok && data.status === "success") {
        // CAMBIO AQUÍ: Toma la ruta dinámica que decidió el servidor
        window.location.href = data.redirect;
      } else {
        LoginUI.showModalAlert(data.message || "Credenciales incorrectas.");
        this.passwordInput.value = "";
      }
    } catch (error) {
      console.error("Error en la autenticación:", error);
      LoginUI.showModalAlert(
        "Error de conexión con el servidor de autenticación.",
      );
    } finally {
      this.submitBtn.innerText = "Ingresar";
      this.submitBtn.disabled = false;
    }
  }
}

// Inicialización segura del flujo OOP al cargar el DOM
document.addEventListener("DOMContentLoaded", () => {
  LoginUI.initPasswordToggle();
  new LoginAuthManager();
});
