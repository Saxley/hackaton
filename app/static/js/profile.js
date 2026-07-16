/**
 * =====================================================================
 * PROFILE & COMMUNITY MANAGER MODULE (CONNECTED ENGINE)
 * =====================================================================
 */

class ProfileDashboardEngine {
  constructor() {
    // Elementos Métricas
    this.rachaDisplay = document.querySelector(
      ".metric-card:nth-child(1) .metric-value",
    );
    this.entrenamientosDisplay = document.querySelector(
      ".metric-card:nth-child(2) .metric-value",
    );
    this.inputActividad = document.getElementById("input-actividad");
    this.btnAddActividad = document.getElementById("btn-registrar-actividad");

    // Contenedores Pestañas
    this.trackingContainer = document.getElementById("private-posts-container");
    this.feedContainer = document.querySelector("#screen-feed .card");

    // Elementos Modal Publicar
    this.fab = document.getElementById("fab-publish");
    this.modal = document.getElementById("publish-modal");
    this.closeBtn = document.getElementById("btn-close-publish");
    this.submitBtn = document.getElementById("btn-submit-publish");
    this.textArea = document.getElementById("publish-text");
    this.privacySelect = document.getElementById("publish-privacy");

    this.csrfToken = document
      .querySelector('meta[name="csrf-token"]')
      .getAttribute("content");

    if (document.getElementById("screen-perfil")) {
      this.init();
    }
  }

  init() {
    // Carga inicial asíncrona de datos desde el servidor
    this.cargarDatosServidor();

    // Escuchar registro de actividades
    if (this.btnAddActividad) {
      this.btnAddActividad.addEventListener("click", () =>
        this.registrarActividad(),
      );
    }

    // Escuchar cambios en la selección de foto para feedback en el modal
    const fileInput = document.getElementById("publish-file");
    const fileText = document.getElementById("file-chosen-text");
    if (fileInput && fileText) {
      fileInput.addEventListener("change", () => {
        fileText.innerText =
          fileInput.files.length > 0
            ? fileInput.files[0].name
            : "Ninguna foto seleccionada";
      });
    }

    // Eventos del Modal FAB
    if (this.fab) {
      this.fab.addEventListener("click", () => {
        this.textArea.value = "";
        if (fileInput) fileInput.value = "";
        if (fileText) fileText.innerText = "Ninguna foto seleccionada";
        this.modal.showModal();
      });
      this.closeBtn.addEventListener("click", () => this.modal.close());
      this.submitBtn.addEventListener("click", () => this.enviarPublicacion());
    }
  }

  cargarDatosServidor() {
    fetch("/api/profile-data")
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "success") {
          this.renderMetricsAndLists(data);
        }
      })
      .catch((err) => console.error("Error al sincronizar perfil:", err));
  }

  renderMetricsAndLists(data) {
    // Actualizar contadores visuales
    if (this.rachaDisplay) this.rachaDisplay.innerText = `${data.racha} Días`;
    if (this.entrenamientosDisplay)
      this.entrenamientosDisplay.innerText = data.entrenamientos;

    // Renderizar pestaña Seguimiento Privado
    if (this.trackingContainer) {
      if (data.seguimiento.length === 0) {
        this.trackingContainer.innerHTML = `<p style="text-align: center; color: var(--text-muted); font-size: 13px;">Aquí verás tus actividades y bitácoras marcadas como privadas.</p>`;
      } else {
        this.trackingContainer.innerHTML = data.seguimiento
          .map(
            (item) => `
                    <div class="card" style="background: #151515; margin-bottom: 8px; border-left: 3px solid var(--primary-yellow);">
                        <div style="display:flex; justify-content:space-between; font-size:11px; color:var(--text-muted); margin-bottom:4px;">
                            <span>${item.tipo === "actividad" ? "💪 Actividad Guardada" : "🔒 Historial"}</span>
                            <span>${item.fecha}</span>
                        </div>
                        <p style="color:var(--text-main); font-size:13px; margin-bottom: ${item.imagen ? "8px" : "0px"};">${item.detalle}</p>
                        ${item.imagen ? `<img src="${item.imagen}" style="width:100%; max-height:200px; object-fit:cover; border-radius:6px; border: 1px solid var(--border-color);" alt="Avance">` : ""}
                    </div>
                `,
          )
          .join("");
      }
    }

    // Renderizar Feed de Comunidad Público (sin romper la estructura base)
    if (this.feedContainer) {
      const listHtml = data.feed
        .map(
          (post) => `
                <div class="post-item" style="border-bottom: 1px solid var(--border-color); padding: 12px 0;">
                    <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom: 6px;">
                        <strong style="color: var(--primary-yellow);">${post.autor}</strong>
                        <span style="color:var(--text-muted); font-size:11px;">${post.fecha}</span>
                    </div>
                    <p style="color:var(--text-main); font-size:13px; margin-bottom: ${post.imagen ? "8px" : "0px"};">${post.texto}</p>
                    ${post.imagen ? `<img src="${post.imagen}" style="width:100%; max-height:220px; object-fit:cover; border-radius:6px; border: 1px solid var(--border-color);" alt="Foto Avance">` : ""}
                </div>
            `,
        )
        .join("");

      this.feedContainer.innerHTML =
        listHtml ||
        `<p style="color: var(--text-muted)">Aquí se mostrarán los videos verticales, retos e interacciones de tu Círculo.</p>`;
    }
  }

  registrarActividad() {
    const detalle = this.inputActividad.value.trim();
    if (!detalle) return;

    fetch("/api/profile-action", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": this.csrfToken,
      },
      body: JSON.stringify({ type: "activity", detail: detalle }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "success") {
          this.inputActividad.value = "";
          this.renderMetricsAndLists(data);
        }
      });
  }

  enviarPublicacion() {
    const texto = this.textArea.value.trim();
    const privacidad = this.privacySelect.value;
    const fileInput = document.getElementById("publish-file");

    if (!texto && (!fileInput || fileInput.files.length === 0)) return;

    // Se implementa FormData para empaquetar de forma binaria el archivo adjunto
    const formData = new FormData();
    formData.append("type", "post");
    formData.append("text", texto);
    formData.append("privacy", privacidad);

    if (fileInput && fileInput.files.length > 0) {
      formData.append("foto", fileInput.files[0]);
    }

    fetch("/api/profile-action", {
      method: "POST",
      headers: {
        "X-CSRFToken": this.csrfToken,
        // IMPORTANTE: Al usar FormData no se declara Content-Type manualmente
      },
      body: formData,
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "success") {
          this.modal.close();
          this.renderMetricsAndLists(data);
        }
      })
      .catch((err) => console.error("Error al enviar post:", err));
  }
}

// Control modular de cambio visual de pestañas estéticas
class ProfileTabsManager {
  constructor() {
    this.tabs = document.querySelectorAll(".tab-btn");
    this.panels = document.querySelectorAll(".tab-panel");
    if (this.tabs.length > 0) this.init();
  }
  init() {
    this.tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        this.tabs.forEach((t) => t.classList.remove("active"));
        this.panels.forEach((p) => p.classList.remove("active"));
        tab.classList.add("active");
        const panel = document.getElementById(`tab-panel-${tab.dataset.tab}`);
        if (panel) panel.classList.add("active");
      });
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new ProfileTabsManager();
  new ProfileDashboardEngine();
});
