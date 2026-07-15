/**
 * =====================================================================
 * AUTOMATION & FORM ENGINE - SMART FIT CORE V2 (OOP EDITION)
 * =====================================================================
 */

class FormUIUtils {
  /**
   * Reemplaza el uso de alert() del navegador por diálogos modales fluidos
   */
  static showModalAlert(message) {
    const alertDialog = document.getElementById("alert-dialog");
    const alertMessage = document.getElementById("alert-message");
    const closeAlertBtn = document.getElementById("close-alert-btn");

    if (alertDialog && alertMessage) {
      alertMessage.innerText = message;
      alertDialog.showModal();
      closeAlertBtn.onclick = () => alertDialog.close();
    } else {
      alert(message); // Fallback de seguridad
    }
  }
}

class FormValidator {
  /**
   * Valida de forma nativa si una contraseña cumple con los requisitos de seguridad:
   * Más de 8 caracteres, letras, números y al menos un símbolo.
   */
  static esContrasenaSegura(password) {
    if (password.length < 8) return false;

    const tieneLetra = /[A-Za-z]/.test(password);
    const tieneNumero = /[0-9]/.test(password);
    const tieneSimbolo = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return tieneLetra && tieneNumero && tieneSimbolo;
  }

  /**
   * Valida el grupo de inputs visibles en la página actual de forma síncrona y asíncrona
   */
  static async validatePage(currentCards) {
    for (let card of currentCards) {
      const input = card.querySelector("input, select");
      if (!input || input.value.trim() === "") {
        FormUIUtils.showModalAlert(
          "Por favor, responde todas las preguntas visibles antes de continuar.",
        );
        return false;
      }

      // 1. VALIDACIÓN FILTRADA PARA NOMBRE Y APELLIDO
      if (input.id === "reg_nombre") {
        // Regex que permite letras (con acentos, diéresis y eñes) y espacios intermedios
        const nombreRegex = /^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]+$/;

        if (!nombreRegex.test(input.value)) {
          FormUIUtils.showModalAlert(
            "El campo Nombre y Apellido solo puede contener letras y espacios. Sin números ni caracteres especiales como '@'.",
          );
          input.focus();
          return false;
        }

        // Transformación automática a mayúsculas respetando caracteres especiales en el input
        input.value = input.value.toUpperCase();
      }

      // 2. VALIDACIÓN ASÍNCRONA DE CORREO DUPLICADO
      if (input.id === "reg_email") {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(input.value)) {
          FormUIUtils.showModalAlert(
            "Por favor, ingresa un correo electrónico válido.",
          );
          return false;
        }

        const csrfToken = document
          .querySelector('meta[name="csrf-token"]')
          .getAttribute("content");
        try {
          const response = await fetch("/api/check-email", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-CSRFToken": csrfToken,
            },
            body: JSON.stringify({ email: input.value }),
          });
          const resData = await response.json();

          if (resData.status === "taken") {
            FormUIUtils.showModalAlert(resData.message);
            input.focus();
            return false;
          }
        } catch (err) {
          console.error("Error al validar email con el servidor:", err);
        }
      }

      // 3. VALIDACIÓN INMEDIATA DE CONTRASEÑA SEGURA
      if (input.id === "reg_password") {
        if (!FormValidator.esContrasenaSegura(input.value)) {
          FormUIUtils.showModalAlert(
            "La contraseña no es lo suficientemente segura. Debe tener al menos 8 caracteres, e incluir letras, números y un símbolo especial (Ej: !, @, #, $, %).",
          );
          input.focus();
          return false;
        }
      }
    }

    // 4. VALIDACIÓN DE COINCIDENCIA DE CONTRASEÑAS
    const pass = document.getElementById("reg_password");
    const passConf = document.getElementById("reg_password_confirm");
    const tienePassword = currentCards.some(
      (card) =>
        card.id === "card-reg_password" ||
        card.id === "card-reg_password_confirm",
    );

    if (pass && passConf && tienePassword) {
      if (pass.value !== passConf.value) {
        FormUIUtils.showModalAlert(
          "Las contraseñas no coinciden. Por favor, verifícalas.",
        );
        if (passConf) passConf.focus();
        return false;
      }
    }
    return true;
  }
}

class FormDOMBuilder {
  /**
   * Se encarga exclusivamente de construir nodos HTML respetando el diseño atómico
   */
  static createCard(q, onChoiceChange) {
    const card = document.createElement("div");
    card.className = "card";
    card.id = `card-${q.id}`;
    card.dataset.applicable = "true";
    card.style.display = "none";

    const label = document.createElement("label");
    label.className = "question-label";
    label.innerText = q.question;
    card.appendChild(label);

    if (q.type === "single_choice" || q.type === "boolean") {
      FormDOMBuilder._buildSelect(card, q, onChoiceChange);
    } else if (q.type === "text") {
      FormDOMBuilder._buildTextInput(card, q);
    }

    return card;
  }

  static _buildSelect(card, q, onChoiceChange) {
    const select = document.createElement("select");
    select.id = q.id;
    select.name = q.id;

    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.innerText = "Selecciona una opción...";
    defaultOption.disabled = true;
    defaultOption.selected = true;
    select.appendChild(defaultOption);

    if (q.options) {
      q.options.forEach((opt) => {
        const option = document.createElement("option");
        option.value = opt;
        option.innerText = opt;
        select.appendChild(option);
      });
    }
    select.addEventListener("change", onChoiceChange);
    card.appendChild(select);
  }

  static _buildTextInput(card, q) {
    // Enfoque estético limpio para envolver contraseñas y acoplarlas a la UI global
    if (q.id === "reg_password" || q.id === "reg_password_confirm") {
      const passWrapper = document.createElement("div");
      passWrapper.className = "password-wrapper";

      const input = document.createElement("input");
      input.type = "password";
      input.id = q.id;
      input.name = q.id;
      input.placeholder = q.placeholder || "";

      const toggleIcon = document.createElement("span");
      toggleIcon.className = "toggle-password";
      toggleIcon.innerText = "👁️";
      toggleIcon.addEventListener("click", () => {
        const isPass = input.type === "password";
        input.type = isPass ? "text" : "password";
        toggleIcon.innerText = isPass ? "🔒" : "👁️";
      });

      passWrapper.appendChild(input);
      passWrapper.appendChild(toggleIcon);
      card.appendChild(passWrapper);
    } else {
      const input = document.createElement("input");
      input.type = "text";
      input.id = q.id;
      input.name = q.id;
      input.placeholder = q.placeholder || "";
      card.appendChild(input);
    }
  }
}

class FormEngine {
  constructor() {
    this.container = document.getElementById("form-container");
    if (!this.container) return;

    this.itemsPerPage =
      parseInt(this.container.getAttribute("data-items-per-page")) || 2;
    this.jsonUrl = this.container.getAttribute("data-json-url");

    this.wrapper = document.getElementById("form-wrapper");
    this.progressBar = document.getElementById("progress-bar");
    this.btnPrev = document.getElementById("btn-prev");
    this.btnNext = document.getElementById("btn-next");
    this.submitBtn = document.getElementById("submit-btn");
    this.loadingText = document.getElementById("loading-text");

    this.formData = {};
    this.currentPage = 0;

    this.init();
  }

  init() {
    fetch(this.jsonUrl)
      .then((response) => response.json())
      .then((data) => {
        this.formData = data.form ? data.form : data;
        if (this.loadingText) this.loadingText.remove();

        this.extractQuestions();
        this.buildForm();
        this.bindEvents();
        this.changePage(0, "next");
      })
      .catch((error) =>
        console.error("Error al inicializar el formulario:", error),
      );
  }

  extractQuestions() {
    let questions = [];
    if (this.formData.sections && Array.isArray(this.formData.sections)) {
      this.formData.sections.forEach((sec) => {
        if (sec.questions) questions.push(...sec.questions);
      });
    } else if (
      this.formData.questions &&
      Array.isArray(this.formData.questions)
    ) {
      questions = this.formData.questions;
    }
    this.formData.flatQuestions = questions;
  }

  buildForm() {
    this.formData.flatQuestions.forEach((q) => {
      const card = FormDOMBuilder.createCard(q, () => {
        this.evaluateDependencies();
        this.renderPageItems();
      });
      this.container.appendChild(card);
    });
  }

  bindEvents() {
    this.btnNext.addEventListener("click", () =>
      this.changePage(this.currentPage + 1, "next"),
    );
    this.btnPrev.addEventListener("click", () =>
      this.changePage(this.currentPage - 1, "prev"),
    );
    this.submitBtn.addEventListener("click", () => this.submitForm());
  }

  evaluateDependencies() {
    if (!this.formData.flatQuestions) return;

    this.formData.flatQuestions.forEach((q) => {
      const card = document.getElementById(`card-${q.id}`);
      if (!card) return;

      if (q.dependsOn) {
        const targetInput = document.getElementById(q.dependsOn.questionId);
        const targetValue = targetInput ? targetInput.value : "";
        if (targetValue === q.dependsOn.value) {
          card.dataset.applicable = "true";
        } else {
          card.dataset.applicable = "false";
          const input = card.querySelector("select, input");
          if (input) input.value = "";
        }
      } else {
        card.dataset.applicable = "true";
      }
    });
  }

  getCurrentVisibleCards() {
    const allCards = Array.from(document.querySelectorAll(".card"));
    const applicableCards = allCards.filter(
      (c) => c.dataset.applicable === "true",
    );
    const startIndex = this.currentPage * this.itemsPerPage;
    return applicableCards.slice(startIndex, startIndex + this.itemsPerPage);
  }

  renderPageItems() {
    this.evaluateDependencies();
    const allCards = Array.from(document.querySelectorAll(".card"));
    const applicableCards = allCards.filter(
      (c) => c.dataset.applicable === "true",
    );

    const totalPages = Math.ceil(applicableCards.length / this.itemsPerPage);
    if (this.currentPage >= totalPages && totalPages > 0)
      this.currentPage = totalPages - 1;

    const startIndex = this.currentPage * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;

    allCards.forEach((c) => (c.style.display = "none"));
    applicableCards
      .slice(startIndex, endIndex)
      .forEach((c) => (c.style.display = "block"));

    if (this.progressBar) {
      const progress =
        totalPages === 0 ? 0 : ((this.currentPage + 1) / totalPages) * 100;
      this.progressBar.style.width = `${progress}%`;
    }

    this.btnPrev.style.display = this.currentPage === 0 ? "none" : "block";

    if (this.currentPage >= totalPages - 1) {
      this.btnNext.style.display = "none";
      this.submitBtn.style.display = "block";
    } else {
      this.btnNext.style.display = "block";
      this.submitBtn.style.display = "none";
    }
  }

  async changePage(newPageIndex, direction) {
    if (direction === "next" && this.currentPage !== newPageIndex) {
      const currentCards = this.getCurrentVisibleCards();
      // Esperamos a que la validación asíncrona termine
      const esValido = await FormValidator.validatePage(currentCards);
      if (!esValido) return;
    }

    const exitClass = direction === "next" ? "fade-out-left" : "fade-out-right";
    if (this.wrapper) this.wrapper.classList.add(exitClass);

    setTimeout(() => {
      this.currentPage = newPageIndex;
      this.renderPageItems();
      if (this.wrapper) {
        this.wrapper.classList.remove("fade-out-left", "fade-out-right");
        this.wrapper.classList.add(
          direction === "next" ? "fade-out-right" : "fade-out-left",
        );
        void this.wrapper.offsetWidth;
        this.wrapper.classList.remove("fade-out-left", "fade-out-right");
      }
    }, 300);
  }

  submitForm() {
    const currentCards = this.getCurrentVisibleCards();
    if (!FormValidator.validatePage(currentCards)) return;

    // Detectar qué tipo de formulario estamos procesando
    const formType =
      this.container.getAttribute("data-form-type") || "registration";

    this.submitBtn.innerText = "Guardando de forma segura...";
    this.submitBtn.disabled = true;

    const results = {};
    const allCards = Array.from(document.querySelectorAll(".card"));

    allCards.forEach((card) => {
      if (card.dataset.applicable === "true") {
        const input = card.querySelector("select, input");
        if (input && input.value !== "") {
          const qId = card.id.replace("card-", "");
          results[qId] = input.value;
        }
      }
    });

    const csrfToken = document
      .querySelector('meta[name="csrf-token"]')
      .getAttribute("content");

    fetch("/api/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrfToken,
      },
      body: JSON.stringify(results),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.status === "validation_error") {
          FormUIUtils.showModalAlert(data.message);
          this.submitBtn.innerText = "Terminar";
          this.submitBtn.disabled = false;
          return;
        }

        if (data.status === "success") {
          const dialog = document.getElementById("success-dialog");
          const closeBtn = document.getElementById("close-dialog-btn");

          if (dialog) {
            if (formType === "motivation" && data.user_name) {
              const nameDisplay = document.getElementById("user-name-display");
              if (nameDisplay) nameDisplay.innerText = data.user_name;
            }

            dialog.showModal();

            closeBtn.onclick = () => {
              dialog.close();
              // CORREGIDO: Usamos la ruta dinámica que el servidor nos indica
              if (data.redirect) {
                window.location.href = data.redirect;
              } else {
                window.location.href =
                  formType === "motivation"
                    ? "/dashboard"
                    : "/motivacion-formulario";
              }
            };
          }
        }
      })
      .catch(() =>
        FormUIUtils.showModalAlert(
          "Error al procesar y guardar la información remota.",
        ),
      )
      .finally(() => {
        if (this.submitBtn.innerText !== "Terminar") {
          this.submitBtn.innerText = "Terminar";
          this.submitBtn.disabled = false;
        }
      });
  }
}

// Inicialización asíncrona segura del modulo OO tras la carga completa del árbol DOM
document.addEventListener("DOMContentLoaded", () => {
  new FormEngine();
});
