/**
 * =====================================================================
 * PROFILE & COMMUNITY MANAGER MODULE (CONNECTED ENGINE)
 * =====================================================================
 */

class ProfileDashboardEngine {
  constructor() {
    this.csrfToken = document
      .querySelector('meta[name="csrf-token"]')
      .getAttribute("content");
    this.redSincronizada = [];
    this.longPollingInterval = null;
    this.postsTemporales = [];
    this.activePostIdForComment = null;

    if (document.getElementById("screen-perfil")) {
      this.init();
    }
  }

  init() {
    this.cargarDatosServidor(true); // Carga inicial limpia

    // Delegación de eventos e inicialización dinámica sobre el DOM
    document.addEventListener("click", (e) => {
      // Interceptor dinámico para el botón Add de actividades
      if (e.target && e.target.id === "btn-registrar-actividad") {
        this.registrarActividad();
      }

      // Interceptor para abrir visor QR
      if (e.target && e.target.id === "btn-trigger-qr-modal") {
        this.generarCodigoQR();
        const qrModal = document.getElementById("qr-viewer-modal");
        if (qrModal) qrModal.showModal();
        this.activarEscuchaTiempoReal();
      }

      // Interceptor para cerrar visor QR
      if (e.target && e.target.id === "btn-close-qr-modal") {
        const qrModal = document.getElementById("qr-viewer-modal");
        if (qrModal) qrModal.close();
        clearInterval(this.longPollingInterval);
      }

      // Interceptor para cerrar modal de éxito
      if (e.target && e.target.id === "btn-close-sync-success") {
        const successModal = document.getElementById("sync-success-modal");
        if (successModal) successModal.close();
      }

      // Interceptor para el botón flotante FAB de publicar
      if (e.target && e.target.id === "fab-publish") {
        const textArea = document.getElementById("publish-text");
        const fileInput = document.getElementById("publish-file");
        const fileText = document.getElementById("file-chosen-text");
        if (textArea) textArea.value = "";
        if (fileInput) fileInput.value = "";
        if (fileText) fileText.innerText = "Ninguna foto";
        const publishModal = document.getElementById("publish-modal");
        if (publishModal) publishModal.showModal();
      }

      // Cerrar modal de publicación
      if (e.target && e.target.id === "btn-close-publish") {
        const publishModal = document.getElementById("publish-modal");
        if (publishModal) publishModal.close();
      }

      // Enviar publicación
      if (e.target && e.target.id === "btn-submit-publish") {
        this.enviarPublicacion();
      }

      // Cerrar modal de comentarios
      if (e.target && e.target.id === "btn-close-comment") {
        const commentModal = document.getElementById("comment-modal");
        if (commentModal) commentModal.close();
      }

      // Enviar comentario
      if (e.target && e.target.id === "btn-submit-comment") {
        this.ejecutarComentario();
      }

      // --- INTERCEPTORES DE PANEL ADMINISTRATIVO DE ROLES ---
      // Abrir modal para dar de alta entrenadores
      if (e.target && e.target.id === "btn-open-coach-modal") {
        const modalCoach = document.getElementById("admin-coach-modal");
        if (modalCoach) modalCoach.showModal();
      }

      // Cerrar modal de registro de entrenadores
      if (e.target && e.target.id === "btn-close-coach-modal") {
        const modalCoach = document.getElementById("admin-coach-modal");
        if (modalCoach) modalCoach.close();
      }

      // Interceptor para cerrar el nuevo modal de alertas administrativas custom
      if (e.target && e.target.id === "btn-close-admin-alert") {
        const alertModal = document.getElementById("admin-alert-modal");
        if (alertModal) alertModal.close();
      }

      // Enviar formulario de registro de Coach
      if (e.target && e.target.id === "btn-submit-coach") {
        const inputName = document.getElementById("admin-coach-name");
        const inputEmail = document.getElementById("admin-coach-email");
        const inputPassword = document.getElementById("admin-coach-password");

        const name = inputName ? inputName.value.trim() : "";
        const email = inputEmail ? inputEmail.value.trim() : "";
        const password = inputPassword ? inputPassword.value : "";

        if (!name || !email || !password) return;

        fetch("/api/admin/registrar-coach", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": this.csrfToken,
          },
          body: JSON.stringify({
            nombre: name,
            email: email,
            password: password,
          }),
        })
          .then((res) => res.json())
          .then((data) => {
            // Se inyecta la información dinámicamente en el modal HTML
            const alertModal = document.getElementById("admin-alert-modal");
            const alertMessage = document.getElementById("admin-alert-message");
            const alertIcon = document.getElementById("admin-alert-icon");

            if (alertModal && alertMessage) {
              alertMessage.innerText = data.message;
              alertIcon.innerText = data.status === "success" ? "✅" : "❌";

              // Cierra el formulario inicial y abre el modal de aviso estético
              const modalCoach = document.getElementById("admin-coach-modal");
              if (modalCoach) modalCoach.close();

              alertModal.showModal();
            }

            if (data.status === "success") {
              if (inputName) inputName.value = "";
              if (inputEmail) inputEmail.value = "";
              if (inputPassword) inputPassword.value = "";
            }
          })
          .catch((err) => console.error("Error al registrar coach:", err));
      }
    });

    // Configuración dinámica del input file al cambiar
    document.addEventListener("change", (e) => {
      if (e.target && e.target.id === "publish-file") {
        const fileText = document.getElementById("file-chosen-text");
        if (fileText) {
          fileText.innerText =
            e.target.files.length > 0 ? e.target.files[0].name : "Ninguna foto";
        }
      }
    });
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
    clearInterval(this.longPollingInterval);
    this.longPollingInterval = setInterval(() => {
      fetch("/api/profile-data")
        .then((res) => res.json())
        .then((data) => {
          if (data.status === "success") {
            const nuevaRed = data.red_sincronizada || [];
            if (nuevaRed.length > this.redSincronizada.length) {
              clearInterval(this.longPollingInterval);
              const qrModal = document.getElementById("qr-viewer-modal");
              if (qrModal) qrModal.close();

              const nuevoAmigo =
                nuevaRed.filter((x) => !this.redSincronizada.includes(x))[0] ||
                "Un atleta";
              const syncMessageText = document.getElementById(
                "sync-success-message",
              );
              if (syncMessageText) {
                syncMessageText.innerText = `Conexión realizada con éxito. Ahora compartes red de comentarios mutua con ${nuevoAmigo}.`;
              }

              const successModal =
                document.getElementById("sync-success-modal");
              if (successModal) successModal.showModal();

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

          // CONTROL DE ROL ADMIN: Muestra la pestaña de gestión si es admin
          const tabAdmin = document.getElementById("tab-btn-admin");
          if (tabAdmin) {
            if (data.rol === "admin") {
              tabAdmin.style.display = "block";
            } else {
              tabAdmin.style.display = "none";
            }
          }

          this.renderMetricsAndLists(data);
        }
      });
  }

  renderMetricsAndLists(data) {
    const rachaDisplay = document.querySelector(
      ".metric-card:nth-child(1) .metric-value",
    );
    const entrenamientosDisplay = document.querySelector(
      ".metric-card:nth-child(2) .metric-value",
    );
    const trackingContainer = document.getElementById(
      "private-posts-container",
    );
    const feedContainer = document.getElementById("feed-posts-wrapper");

    if (rachaDisplay) rachaDisplay.innerText = `${data.racha} Días`;
    if (entrenamientosDisplay)
      entrenamientosDisplay.innerText = data.entrenamientos;

    // Render Seguimiento Privado
    if (trackingContainer) {
      if (!data.seguimiento || data.seguimiento.length === 0) {
        trackingContainer.innerHTML = `<p style="text-align: center; color: var(--text-muted); font-size: 13px;">Sin bitácoras privadas.</p>`;
      } else {
        trackingContainer.innerHTML = data.seguimiento
          .map(
            (item) => `
          <div class="card" style="background: #151515; margin-bottom: 8px; border-left: 3px solid var(--primary-yellow); text-align: left;">
              <div style="display:flex; justify-content:space-between; font-size:11px; color:var(--text-muted); margin-bottom:4px;">
                  <span>${item.tipo === "actividad" ? "💪 Actividad Guardada" : "🔒 Historial"}</span>
                  <span>${item.fecha}</span>
              </div>
              <p style="font-size:13px; color: var(--text-main); margin: 0;">${item.detalle || item.detail}</p>
              ${item.imagen ? `<img src="${item.imagen}" style="width:100%; margin-top:8px; border-radius:6px; border: 1px solid var(--border-color);">` : ""}
          </div>
        `,
          )
          .join("");
      }
    }

    // Render Feed Público Comunitario Completo
    if (feedContainer) {
      if (!data.feed || data.feed.length === 0) {
        feedContainer.innerHTML = `<p style="color: var(--text-muted)">No hay publicaciones públicas.</p>`;
        return;
      }

      this.postsTemporales = data.feed;

      feedContainer.innerHTML = data.feed
        .map((post, idx) => {
          const estaSincronizado = this.redSincronizada.includes(post.autor);
          const postLikes = Array.isArray(post.likes)
            ? post.likes.length
            : post.likes || 0;
          const comentarios = post.comentarios || [];

          // ETIQUETA DINÁMICA DE ROL EN LA PUBLICACIÓN
          let etiquetaRol = "";
          if (post.rol_autor === "coach") {
            etiquetaRol = `<span style="background: var(--primary-yellow); color: #000; font-size: 10px; padding: 2px 6px; border-radius: 4px; margin-left: 6px; font-weight: bold; vertical-align: middle;">COACH</span>`;
          } else if (post.rol_autor === "admin") {
            etiquetaRol = `<span style="background: #ff5555; color: #fff; font-size: 10px; padding: 2px 6px; border-radius: 4px; margin-left: 6px; font-weight: bold; vertical-align: middle;">ADMIN</span>`;
          }

          const comentariosHtml = comentarios
            .map(
              (c) => `
          <div style="color: #8a8a8a; font-size: 12px; margin-top: 6px; padding-left: 8px; border-left: 1px solid #333; text-align: left;">
            <strong style="color: #aaaaaa;">${c.autor}:</strong> ${c.texto}
          </div>
        `,
            )
            .join("");

          return `
          <div class="post-item" style="border-bottom: 1px solid var(--border-color); padding: 15px 0; text-align:left;">
              <div style="display: flex; align-items: center; margin-bottom: 4px;">
                  <strong style="color: var(--primary-yellow);">${post.autor}</strong>
                  ${etiquetaRol}
              </div>
              <p style="margin: 5px 0; font-size:13px;">${post.texto}</p>
              ${post.imagen ? `<img src="${post.imagen}" style="width:100%; max-height:220px; object-fit:cover; border-radius:6px; margin-bottom:8px;">` : ""}
              
              ${
                comentarios.length > 0
                  ? `
                <div class="inline-comments-section" style="margin-top: 10px; margin-bottom: 5px; padding: 0 5px;">
                  ${comentariosHtml}
                </div>
              `
                  : ""
              }

              <div style="display: flex; justify-content: center; gap: 40px; margin-top: 10px; background: #111; padding: 6px; border-radius: 20px;">
                  <button onclick="window.profileEngine.ejecutarLike(${idx})" style="background:none; border:none; color:#fff; cursor:pointer; font-size:14px; display:flex; align-items:center; gap:5px;">
                      💪 <span id="like-count-${idx}">${postLikes}</span>
                  </button>

                  ${
                    estaSincronizado ||
                    post.autor ===
                      document.getElementById("profile-username-title").dataset
                        .username
                      ? `
                    <button onclick="window.profileEngine.abrirModalComentariosPorIndice(${idx})" style="background:none; border:none; color:var(--primary-yellow); cursor:pointer; font-size:14px;">
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
            data.likes_count;
        }
      })
      .catch((err) => console.error("Error al procesar like:", err));
  }

  abrirModalComentariosPorIndice(idx) {
    const post = this.postsTemporales && this.postsTemporales[idx];
    const comentarios = post ? post.comentarios || [] : [];
    this.abrirModalComentarios(idx, comentarios);
  }

  abrirModalComentarios(postId, comentarios) {
    this.activePostIdForComment = postId;
    const inputNewComment = document.getElementById("input-new-comment");
    const modalCommentsList = document.getElementById("modal-comments-list");

    if (inputNewComment) inputNewComment.value = "";

    if (modalCommentsList) {
      if (comentarios.length === 0) {
        modalCommentsList.innerHTML = `<p style="color:var(--text-muted); font-size:12px; text-align:center;">Sin comentarios aún.</p>`;
      } else {
        modalCommentsList.innerHTML = comentarios
          .map(
            (c) => `
          <div style="background:#222; padding:6px; margin-bottom:5px; border-radius:4px; font-size:12px;">
            <strong style="color:var(--primary-yellow);">${c.autor}:</strong> ${c.texto}
          </div>
        `,
          )
          .join("");
      }
    }
    const commentModal = document.getElementById("comment-modal");
    if (commentModal) commentModal.showModal();
  }

  ejecutarComentario() {
    const inputNewComment = document.getElementById("input-new-comment");
    const comentario = inputNewComment ? inputNewComment.value.trim() : "";
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
          const commentModal = document.getElementById("comment-modal");
          if (commentModal) commentModal.close();
          this.cargarDatosServidor();
        }
      });
  }

  registrarActividad() {
    const inputActividad = document.getElementById("input-actividad");
    const detalle = inputActividad ? inputActividad.value.trim() : "";
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
          if (inputActividad) inputActividad.value = "";
          this.renderMetricsAndLists(data);
        }
      })
      .catch((err) => console.error("Error al registrar actividad:", err));
  }

  enviarPublicacion() {
    const textArea = document.getElementById("publish-text");
    const privacySelect = document.getElementById("publish-privacy");
    const texto = textArea ? textArea.value.trim() : "";
    const privacidad = privacySelect ? privacySelect.value : "private";
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
      const publishModal = document.getElementById("publish-modal");
      if (publishModal) publishModal.close();
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
