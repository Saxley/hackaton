document.addEventListener("DOMContentLoaded", () => {
  let formData = {};
  let currentPage = 0;
  const itemsPerPage = 3;

  const wrapper = document.getElementById("form-wrapper");
  const container = document.getElementById("form-container");
  const progressBar = document.getElementById("progress-bar");

  const btnPrev = document.getElementById("btn-prev");
  const btnNext = document.getElementById("btn-next");
  const submitBtn = document.getElementById("submit-btn");
  const loadingText = document.getElementById("loading-text");

  const jsonUrl = container.getAttribute("data-json-url");

  // 1. Carga inicial
  fetch(jsonUrl)
    .then((response) => response.json())
    .then((data) => {
      formData = data.form ? data.form : data;
      loadingText.remove();
      buildFormDom();
      changePage(0, "next"); // Iniciar en página 0
    })
    .catch((error) => console.error("Error:", error));

  // 2. Construir los elementos HTML en memoria (ocultos por defecto)
  function buildFormDom() {
    formData.questions.forEach((q) => {
      const card = document.createElement("div");
      card.className = "card";
      card.id = `card-${q.id}`;
      card.dataset.applicable = "true";
      card.style.display = "none";

      const label = document.createElement("label");
      label.className = "question-label";
      label.innerText = q.question;
      card.appendChild(label);

      // ---> BLOQUE 1: Preguntas de opción múltiple (Este ya lo tienes)
      if (q.type === "single_choice" || q.type === "boolean") {
        const select = document.createElement("select");
        select.id = q.id;
        select.name = q.id;

        const defaultOption = document.createElement("option");
        defaultOption.value = "";
        defaultOption.innerText = "Selecciona una opción...";
        defaultOption.disabled = true;
        defaultOption.selected = true;
        select.appendChild(defaultOption);

        q.options.forEach((opt) => {
          const option = document.createElement("option");
          option.value = opt;
          option.innerText = opt;
          select.appendChild(option);
        });

        select.addEventListener("change", () => {
          evaluateDependencies();
          renderPageItems();
        });
        card.appendChild(select);
      }

      // ---> BLOQUE 2: ¡NUEVO! Preguntas de texto abierto (AÑADE ESTO)
      if (q.type === "text") {
        const input = document.createElement("input");
        input.type = "text";
        input.id = q.id;
        input.name = q.id;
        input.placeholder = "Si no es el caso omite la respuesta...";

        // Si el usuario escribe, el formulario lo registra
        input.addEventListener("input", () => {
          evaluateDependencies();
        });

        card.appendChild(input);
      }

      container.appendChild(card);
    });
  }

  // 3. Evaluar lógica condicional (preguntas descartables)
  function evaluateDependencies() {
    formData.questions.forEach((q) => {
      const card = document.getElementById(`card-${q.id}`);
      if (q.dependsOn) {
        const targetInput = document.getElementById(q.dependsOn.questionId);
        const targetValue = targetInput ? targetInput.value : "";

        if (targetValue === q.dependsOn.value) {
          card.dataset.applicable = "true";
        } else {
          card.dataset.applicable = "false";
          const input = card.querySelector("select, input");
          if (input) input.value = ""; // Limpiamos basura
        }
      } else {
        card.dataset.applicable = "true";
      }
    });
  }

  // 4. Calcular y mostrar solo 3 preguntas, actualizar botones y barra
  function renderPageItems() {
    evaluateDependencies();

    // Filtramos solo las tarjetas que NO han sido descartadas
    const allCards = Array.from(document.querySelectorAll(".card"));
    const applicableCards = allCards.filter(
      (c) => c.dataset.applicable === "true",
    );

    const totalPages = Math.ceil(applicableCards.length / itemsPerPage);
    if (currentPage >= totalPages && totalPages > 0)
      currentPage = totalPages - 1;

    const startIndex = currentPage * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;

    // Ocultar todas
    allCards.forEach((c) => (c.style.display = "none"));
    // Mostrar solo la rebanada (slice) de esta página
    applicableCards
      .slice(startIndex, endIndex)
      .forEach((c) => (c.style.display = "block"));

    // Llenar barra de progreso
    const progress =
      totalPages === 0 ? 0 : ((currentPage + 1) / totalPages) * 100;
    progressBar.style.width = `${progress}%`;

    // Lógica de botones
    btnPrev.style.display = currentPage === 0 ? "none" : "block";

    if (currentPage >= totalPages - 1) {
      btnNext.style.display = "none";
      submitBtn.style.display = "block";
    } else {
      btnNext.style.display = "block";
      submitBtn.style.display = "none";
    }
  }

  // 5. Animación de transición entre páginas
  function changePage(newPageIndex, direction) {
    // Clase para animar salida (Fade hacia la izquierda o derecha)
    const exitClass = direction === "next" ? "fade-out-left" : "fade-out-right";
    wrapper.classList.add(exitClass);

    setTimeout(() => {
      currentPage = newPageIndex;
      renderPageItems();

      // Preparamos para entrar desde el lado opuesto
      wrapper.classList.remove("fade-out-left", "fade-out-right");
      wrapper.classList.add(
        direction === "next" ? "fade-out-right" : "fade-out-left",
      );

      // Forzar reflow del navegador (necesario para reiniciar animación CSS)
      void wrapper.offsetWidth;

      // Quitamos la clase para que vuelva a su lugar original (suavizado)
      wrapper.classList.remove("fade-out-left", "fade-out-right");
    }, 300); // 300ms coincide con la transición CSS
  }

  // 6. Eventos de botones
  btnNext.addEventListener("click", () => {
    // (Opcional) Aquí podrías agregar validación para evitar que avancen sin responder
    changePage(currentPage + 1, "next");
  });

  btnPrev.addEventListener("click", () => {
    changePage(currentPage - 1, "prev");
  });

  submitBtn.addEventListener("click", () => {
    submitBtn.innerText = "Guardando...";
    submitBtn.disabled = true;

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

    // 1. Extraemos el token CSRF desde la etiqueta meta del HTML
    const csrfToken = document
      .querySelector('meta[name="csrf-token"]')
      .getAttribute("content");

    // 2. Lo inyectamos en los headers de la petición POST
    fetch("/api/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrfToken, // <- Aquí va el token de seguridad
      },
      body: JSON.stringify(results),
    })
      .then((response) => {
        // Manejar si Flask rechaza la petición por falta de token (Error 400)
        if (!response.ok) throw new Error("Error de seguridad o servidor");
        return response.json();
      })
      .then((data) => {
        if (data.status === "success") {
          // 1. Localizamos el Dialog y el botón de cerrar
          const dialog = document.getElementById("success-dialog");
          const closeBtn = document.getElementById("close-dialog-btn");

          // OPCIONAL: Si en tu JSON tienes una pregunta para el nombre (ej. ID "q_nombre")
          // puedes inyectarlo dinámicamente así:
          // const nombreIngresado = results['q_nombre'] || "a la comunidad";
          // document.getElementById('user-name-display').innerText = nombreIngresado;

          // 2. Mostramos el modal nativo
          dialog.showModal();

          // 3. Qué hacer cuando el usuario da click en "Comenzar"
          closeBtn.addEventListener("click", () => {
            dialog.close();
            // Aquí puedes redirigir al usuario al dashboard real:
            window.location.href = "/dashboard";

            // Para el prototipo, solo recargaremos la página:
            //window.location.reload();
          });
        }
      })
      .catch((error) => {
        console.error("Error:", error);
        alert("No se pudo guardar. Intenta recargar la página.");
      })
      .finally(() => {
        submitBtn.innerText = "Terminar";
        submitBtn.disabled = false;
      });
  });
});
