class ProfileDashboardEngine {
  constructor() {
    this.rachaDisplay = document.querySelector(
      ".metric-card:nth-child(1) .metric-value",
    );
    this.entrenamientosDisplay = document.querySelector(
      ".metric-card:nth-child(2) .metric-value",
    );
    this.inputActividad = document.getElementById("input-actividad");
    this.btnAddActividad = document.getElementById("btn-registrar-actividad");
    this.trackingContainer = document.getElementById("private-posts-container");
    this.feedContainer = document.getElementById("feed-posts-wrapper");

    // Modales QR y Éxito de Sincronización
    this.btnTriggerQr = document.getElementById("btn-trigger-qr-modal");
    this.qrModal = document.getElementById("qr-viewer-modal");
    this.btnCloseQr = document.getElementById("btn-close-qr-modal");

    this.syncSuccessModal = document.getElementById("sync-success-modal");
    this.syncMessageText = document.getElementById("sync-success-message");
    this.btnCloseSyncSuccess = document.getElementById(
      "btn-close-sync-success",
    );

    // Modales Publicación y Comentarios
    this.fab = document.getElementById("fab-publish");
    this.modal = document.getElementById("publish-modal");
    this.closeBtn = document.getElementById("btn-close-publish");
    this.submitBtn = document.getElementById("btn-submit-publish");
    this.textArea = document.getElementById("publish-text");
    this.privacySelect = document.getElementById("publish-privacy");

    this.commentModal = document.getElementById("comment-modal");
    this.btnSubmitComment = document.getElementById("btn-submit-comment");
    this.btnCloseComment = document.getElementById("btn-close-comment");
    this.inputNewComment = document.getElementById("input-new-comment");
    this.modalCommentsList = document.getElementById("modal-comments-list");
    this.activePostIdForComment = null;

    this.csrfToken = document
      .querySelector('meta[name="csrf-token"]')
      .getAttribute("content");
    this.redSincronizada = [];
    this.longPollingInterval = null;

    if (document.getElementById("screen-perfil")) {
      this.init();
    }
  }

  init() {
    this.cargarDatosServidor(true); // Carga inicial limpia

    // Eventos del Visor QR Modificado
    if (this.btnTriggerQr) {
      this.btnTriggerQr.addEventListener("click", () => {
        this.generarCodigoQR();
        this.qrModal.showModal();
        this.activarEscuchaTiempoReal(); // Comienza a oír si alguien lo escanea
      });
    }
    if (this.btnCloseQr) {
      this.btnCloseQr.addEventListener("click", () => {
        this.qrModal.close();
        clearInterval(this.longPollingInterval); // Detiene consumo si cierra el modal
      });
    }
    if (this.btnCloseSyncSuccess) {
      this.btnCloseSyncSuccess.addEventListener("click", () =>
        this.syncSuccessModal.close(),
      );
    }

    // Configuración input file
    const fileInput = document.getElementById("publish-file");
    const fileText = document.getElementById("file-chosen-text");
    if (fileInput && fileText) {
      fileInput.addEventListener("change", () => {
        fileText.innerText =
          fileInput.files.length > 0 ? fileInput.files[0].name : "Ninguna foto";
      });
    }

    if (this.fab) {
      this.fab.addEventListener("click", () => {
        this.textArea.value = "";
        if (fileInput) fileInput.value = "";
        this.modal.showModal();
      });
      this.closeBtn.addEventListener("click", () => this.modal.close());
      this.submitBtn.addEventListener("click", () => this.enviarPublicacion());
    }

    if (this.btnCloseComment)
      this.btnCloseComment.addEventListener("click", () =>
        this.commentModal.close(),
      );
    if (this.btnSubmitComment)
      this.btnSubmitComment.addEventListener("click", () =>
        this.ejecutarComentario(),
      );
  }

  generarCodigoQR() {
    const qrContainer = document.getElementById("qrcode-canvas");
    const usernameElement = document.getElementById("profile-username-title");
    if (!qrContainer || !usernameElement) return;

    const username = usernameElement.dataset.username;
    if (!username) return;

    qrContainer.innerHTML = "";
    const syncUrl = `${window.location.origin}/api/sincronizar/${encodeURIComponent(username)}`;

    new QRCode(qrContainer, {
      text: syncUrl,
      width: 180,
      height: 180,
      colorDark: "#000000",
      colorLight: "#ffffff",
    });
  }

  activarEscuchaTiempoReal() {
    // Escucha en segundo plano cada 3 segundos si la red aumentó de tamaño
    clearInterval(this.longPollingInterval);
    this.longPollingInterval = setInterval(() => {
      fetch("/api/profile-data")
        .then((res) => res.json())
        .then((data) => {
          if (data.status === "success") {
            const nuevaRed = data.red_sincronizada || [];
            // Si el tamaño de la lista creció significa que alguien escaneó el QR exitosamente
            if (nuevaRed.length > this.redSincronizada.length) {
              clearInterval(this.longPollingInterval);
              this.qrModal.close();

              const nuevoAmigo =
                nuevaRed.filter((x) => !this.redSincronizada.includes(x))[0] ||
                "Un atleta";
              this.syncMessageText.innerText = `Conexión realizada con éxito. Ahora compartes red de comentarios mutua con ${nuevoAmigo}.`;

              this.syncSuccessModal.showModal();
              this.redSincronizada = nuevaRed;
              this.renderMetricsAndLists(data);
            }
          }
        });
    }, 3000);
  }

  cargarDatosServidor(esInicial = false) {
    fetch("/api/profile-data")
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "success") {
          this.redSincronizada = data.red_sincronizada || [];
          this.renderMetricsAndLists(data);
        }
      });
  }

  renderMetricsAndLists(data) {
    if (this.rachaDisplay) this.rachaDisplay.innerText = `${data.racha} Días`;
    if (this.entrenamientosDisplay)
      this.entrenamientosDisplay.innerText = data.entrenamientos;

    if (this.trackingContainer) {
      if (data.seguimiento.length === 0) {
        this.trackingContainer.innerHTML = `<p style="text-align: center; color: var(--text-muted); font-size: 13px;">Sin bitácoras privadas.</p>`;
      } else {
        this.trackingContainer.innerHTML = data.seguimiento
          .map(
            (item) => `
          <div class="card" style="background: #151515; margin-bottom: 8px; border-left: 3px solid var(--primary-yellow);">
              <p style="font-size:13px;">${item.detalle}</p>
              ${item.imagen ? `<img src="${item.imagen}" style="width:100%; margin-top:5px; border-radius:6px;">` : ""}
          </div>
        `,
          )
          .join("");
      }
    }

    if (this.feedContainer) {
      if (data.feed.length === 0) {
        this.feedContainer.innerHTML = `<p style="color: var(--text-muted)">No hay publicaciones públicas.</p>`;
        return;
      }

      this.feedContainer.innerHTML = data.feed
        .map((post, idx) => {
          const estaSincronizado = this.redSincronizada.includes(post.autor);
          const postLikes = post.likes || 0;

          return `
          <div class="post-item" style="border-bottom: 1px solid var(--border-color); padding: 15px 0; text-align:left;">
              <strong style="color: var(--primary-yellow);">${post.autor}</strong>
              <p style="margin: 5px 0; font-size:13px;">${post.texto}</p>
              ${post.imagen ? `<img src="${post.imagen}" style="width:100%; max-height:220px; object-fit:cover; border-radius:6px; margin-bottom:8px;">` : ""}
              
              <div style="display: flex; justify-content: center; gap: 40px; margin-top: 10px; background: #111; padding: 6px; border-radius: 20px;">
                  <button onclick="window.profileEngine.ejecutarLike(${idx})" style="background:none; border:none; color:#fff; cursor:pointer; font-size:14px; display:flex; align-items:center; gap:5px;">
                      💪 <span id="like-count-${idx}">${postLikes}</span>
                  </button>

                  ${
                    estaSincronizado
                      ? `
                    <button onclick="window.profileEngine.abrirModalComentarios(${idx}, ${JSON.stringify(post.comentarios || [])})" style="background:none; border:none; color:var(--primary-yellow); cursor:pointer; font-size:14px;">
                        💬 Comentar
                    </button>
                  `
                      : `
                    <span style="color:var(--text-muted); font-size:11px; display:flex; align-items:center;">🔒 Red Privada</span>
                  `
                  }
              </div>
          </div>
        `;
        })
        .join("");
    }
  }

  ejecutarLike(postId) {
    fetch("/api/like-post", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": this.csrfToken,
      },
      body: JSON.stringify({ post_id: postId }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "success") {
          document.getElementById(`like-count-${postId}`).innerText =
            data.likes;
        }
      });
  }

  abrirModalComentarios(postId, comentarios) {
    this.activePostIdForComment = postId;
    this.inputNewComment.value = "";

    if (comentarios.length === 0) {
      this.modalCommentsList.innerHTML = `<p style="color:var(--text-muted); font-size:12px; text-align:center;">Sin comentarios aún.</p>`;
    } else {
      this.modalCommentsList.innerHTML = comentarios
        .map(
          (c) => `
        <div style="background:#222; padding:6px; margin-bottom:5px; border-radius:4px; font-size:12px;">
          <strong style="color:var(--primary-yellow);">${c.autor}:</strong> ${c.texto}
        </div>
      `,
        )
        .join("");
    }
    this.commentModal.showModal();
  }

  ejecutarComentario() {
    const comentario = this.inputNewComment.value.trim();
    if (!comentario || this.activePostIdForComment === null) return;

    fetch("/api/comment-post", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": this.csrfToken,
      },
      body: JSON.stringify({
        post_id: this.activePostIdForComment,
        comment: comentario,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "success") {
          this.commentModal.close();
          this.cargarDatosServidor();
        }
      });
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
    }).then(() => {
      this.inputActividad.value = "";
      this.cargarDatosServidor();
    });
  }

  enviarPublicacion() {
    const texto = this.textArea.value.trim();
    const privacidad = this.privacySelect.value;
    const fileInput = document.getElementById("publish-file");
    if (!texto && (!fileInput || fileInput.files.length === 0)) return;

    const formData = new FormData();
    formData.append("type", "post");
    formData.append("text", texto);
    formData.append("privacy", privacidad);
    if (fileInput && fileInput.files.length > 0)
      formData.append("foto", fileInput.files[0]);

    fetch("/api/profile-action", {
      method: "POST",
      headers: { "X-CSRFToken": this.csrfToken },
      body: formData,
    }).then(() => {
      this.modal.close();
      this.cargarDatosServidor();
    });
  }
}

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
  window.profileEngine = new ProfileDashboardEngine();
});
