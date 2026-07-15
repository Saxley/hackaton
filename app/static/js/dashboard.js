// Variables globales para la configuración del dashboard
let navContainer;
let imgBasePath;
let servicesJsonUrl;
let serviciosData = null; // Guardará el JSON una vez descargado

const combinacionesNav = {
  feed: [
    { id: "perfil", label: "Perfil", archivo: "perfil.png" },
    { id: "servicios", label: "Servicios", archivo: "servicios.png" },
  ],
  perfil: [
    { id: "feed", label: "Feed", archivo: "feed.png" },
    { id: "servicios", label: "Servicios", archivo: "servicios.png" },
  ],
  servicios: [
    { id: "perfil", label: "Perfil", archivo: "perfil.png" },
    { id: "feed", label: "Feed", archivo: "feed.png" },
  ],
};

document.addEventListener("DOMContentLoaded", () => {
  navContainer = document.getElementById("dynamic-nav");
  imgBasePath = navContainer.getAttribute("data-img-path");
  servicesJsonUrl = navContainer.getAttribute("data-services-url"); // Obtenemos la URL del JSON

  // Inicializar mostrando la primera pantalla (Feed)
  renderNavegacionBifurcada("feed");
});

function renderNavegacionBifurcada(currentScreen) {
  if (!navContainer) return;
  navContainer.innerHTML = "";

  const opciones = combinacionesNav[currentScreen];

  opciones.forEach((opc) => {
    const btn = document.createElement("button");
    btn.className = "nav-item";

    const img = document.createElement("img");
    img.src = `${imgBasePath}${opc.archivo}`;
    img.alt = opc.label;
    img.style.width = "24px";
    img.style.height = "24px";
    img.style.marginBottom = "4px";
    img.style.objectFit = "contain";

    const span = document.createElement("span");
    span.innerText = opc.label;

    btn.appendChild(img);
    btn.appendChild(span);

    btn.addEventListener("click", () => {
      navegarA(opc.id);
    });

    navContainer.appendChild(btn);
  });
}

function navegarA(targetScreenId) {
  // INTERCEPCIÓN DE SEGURIDAD: Impedir el acceso a perfil si no hay sesión activa
  if (targetScreenId === "perfil") {
    const perfilScreen = document.getElementById("screen-perfil");
    if (perfilScreen) {
      const isLoggedIn = perfilScreen.getAttribute("data-logged-in") === "true";

      if (!isLoggedIn) {
        // CORREGIDO: Mandamos al invitado directo al Login para romper el bucle de la IP
        window.location.href = "/logout";
        return; // Frena por completo la navegación visual
      }
    }
  }

  document.querySelectorAll(".app-screen").forEach((screen) => {
    screen.classList.remove("active");
  });

  const targetScreen = document.getElementById(`screen-${targetScreenId}`);
  if (targetScreen) {
    targetScreen.classList.add("active");
  }

  if (targetScreenId === "servicios") {
    initServicios();
  }

  renderNavegacionBifurcada(targetScreenId);
}

// Inicializador de catálogos que ahora consume el JSON externo
function initServicios() {
  const container = document.getElementById("categorias-container");
  if (!container) return;
  container.innerHTML = `<p style="text-align:center; color:var(--primary-yellow);">Cargando catálogo...</p>`;

  // Si ya descargamos los datos antes, los usamos directamente para no repetir la petición
  if (serviciosData) {
    buildCarruselesDOM(serviciosData, container);
    return;
  }

  // Si es la primera vez, hacemos la petición asíncrona al archivo separado
  fetch(servicesJsonUrl)
    .then((response) => {
      if (!response.ok)
        throw new Error("No se pudo cargar el archivo de servicios");
      return response.json();
    })
    .then((data) => {
      serviciosData = data; // Almacenar en caché local
      buildCarruselesDOM(serviciosData, container);
    })
    .catch((error) => {
      console.error("Error:", error);
      container.innerHTML = `<p style="text-align:center; color:red;">Error al cargar los servicios.</p>`;
    });
}

// Función auxiliar encargada exclusivamente de dibujar los elementos
function buildCarruselesDOM(data, container) {
  container.innerHTML = ""; // Limpiar el texto de carga

  data.forEach((cat) => {
    const block = document.createElement("div");
    block.className = "category-block";

    const title = document.createElement("h3");
    title.className = "category-title";
    title.innerText = cat.categoria;
    block.appendChild(title);

    if (cat.tipo === "carrusel-3d") {
      const carrusel = document.createElement("div");
      carrusel.className = "carrusel-container-3d";

      let currentIndex = 0;

      function update3DPositions() {
        const cards = carrusel.querySelectorAll(".card-3d");
        cards.forEach((card, idx) => {
          card.classList.remove("prev", "focus", "next", "hidden-card");

          if (idx === currentIndex) {
            card.classList.add("focus");
          } else if (idx === (currentIndex - 1 + cards.length) % cards.length) {
            card.classList.add("prev");
          } else if (idx === (currentIndex + 1) % cards.length) {
            card.classList.add("next");
          } else {
            card.classList.add("hidden-card");
          }
        });
      }

      cat.items.forEach((item, idx) => {
        const card = document.createElement("div");
        card.className = "card-3d";
        card.innerHTML = `
                    <h4 style="font-size:18px;">${item.titulo}</h4>
                    <p style="color:var(--primary-yellow); font-size:20px; font-weight:bold; margin:15px 0;">${item.costo}</p>
                    <span style="font-size:12px; color:var(--text-muted);">Ver beneficios</span>
                `;

        card.addEventListener("click", () => {
          if (idx === currentIndex) {
            abrirModalServicio(item);
          } else {
            currentIndex = idx;
            update3DPositions();
          }
        });

        carrusel.appendChild(card);
      });

      block.appendChild(carrusel);
      container.appendChild(block);
      setTimeout(update3DPositions, 50);
    } else {
      const carrusel = document.createElement("div");
      carrusel.className = "carrusel-standard-container";

      cat.items.forEach((item) => {
        const card = document.createElement("div");
        card.className = "card-standard";
        card.innerHTML = `
                    <h4>${item.titulo}</h4>
                    <p style="color:var(--primary-yellow); font-weight:bold; margin-top:5px;">${item.costo}</p>
                `;
        card.addEventListener("click", () => abrirModalServicio(item));
        carrusel.appendChild(card);
      });
      block.appendChild(carrusel);
      container.appendChild(block);
    }
  });
}

function abrirModalServicio(item) {
  const modal = document.getElementById("service-modal");
  if (!modal) return;

  // Asignar textos básicos
  document.getElementById("modal-titulo").innerText = item.titulo;
  document.getElementById("modal-costo").innerText =
    `Costo del servicio: ${item.costo}`;
  document.getElementById("modal-descripcion").innerText = item.desc;

  // Obtener referencias a los botones
  const btnGoTo = document.getElementById("btn-go-to-service");
  const btnAddCart = document.getElementById("btn-add-cart");
  const btnBuyNow = document.getElementById("btn-buy-now");

  // Lógica de condicional de costos
  if (item.costo.toLowerCase().includes("incluido")) {
    // Es un servicio gratuito/incluido: Muestra el botón de ir al servicio y oculta compra
    btnGoTo.innerText = `Ir a ${item.titulo}`;
    btnGoTo.classList.remove("hidden");

    btnAddCart.classList.add("hidden");
    btnBuyNow.classList.add("hidden");

    // Acción del botón de acceso directo
    btnGoTo.onclick = () => {
      alert(`Redirigiendo al entorno modular de: ${item.titulo}`);
      modal.close();
      // Aquí puedes redirigir usando: window.location.href = `/servicios/${item.id}`;
    };
  } else {
    // Es un servicio de pago: Muestra flujo transaccional y oculta acceso directo
    btnGoTo.classList.add("hidden");

    btnAddCart.classList.remove("hidden");
    btnBuyNow.classList.remove("hidden");

    btnAddCart.onclick = () => {
      alert(`Añadido al carrito: ${item.titulo}`);
      modal.close();
    };

    btnBuyNow.onclick = () => {
      alert(`Procesando compra directa de: ${item.titulo}`);
      modal.close();
    };
  }

  // Botón universal para cerrar
  document.getElementById("btn-close-modal").onclick = () => {
    modal.close();
  };

  modal.showModal();
}
