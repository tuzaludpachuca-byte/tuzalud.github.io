// ============================================================================
// CONFIGURACIÓN TUZALUD
// ============================================================================

const CONFIG = {
    nombreNegocio: "TUZALUD",
    logoRuta: "https://i.ibb.co/Gy4k01w/LOGO.png",
    telefono: "771 231 1859",
    direccionBarra: "Bienvenidos a TUZALUD en donde tu salud es primero",
    urlBase: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTUsK_6cOjD214oJnxWMeZDKxUYRsKAiLml9cpR8jXuziWpx8G0qXyHq1pigGWWOTtYtaazNIm9ov7a/pub?",
    gidProductos: "0",
    gidBanners: "691969109",
    tiempoCache: 5,
    sucursales: [
        {
            nombre: "Sucursal ISSSTE",
            tel: "771 692 9925",
            wa: "7713622888",
            dir: "Río Lerma 213, ISSSTE, 42083, Pachuca de Soto, HGO",
            mapa: "https://maps.app.goo.gl/Z45QVNRcFvWzbgYG9"
        },
        {
            nombre: "Sucursal IMSS",
            tel: "771 273 8900",
            wa: "7716779966",
            dir: "C. Reforma 94-A, Céspedes, 42090, Pachuca de Soto, HGO",
            mapa: "https://maps.app.goo.gl/Wr6wxr2XjMdTB3Bz7"
        },
        {
            nombre: "Sucursal MATRIZ",
            tel: "771 815 4673",
            wa: "7712311859",
            dir: "Dr. Eliseo Ramírez Ulloa 700, Doctores, 42090, Pachuca de Soto, HGO",
            mapa: "https://maps.app.goo.gl/zM3Vx4PjMjKAGnt67"
        }
    ]
};

// ============================================================================
// VARIABLES GLOBALES
// ============================================================================

let PRODUCTOS_DATA = [];
let PRODUCTOS_DESTACADOS = [];

// ============================================================================
// FUNCIONES UTILIDAD
// ============================================================================

function parseCSV(csv) {
    const rows = [];
    let currentRow = [];
    let currentValue = "";
    let insideQuotes = false;

    for (let i = 0; i < csv.length; i++) {
        const char = csv[i];
        const nextChar = csv[i + 1];

        if (char === '"') {
            if (insideQuotes && nextChar === '"') {
                currentValue += '"';
                i++;
            } else {
                insideQuotes = !insideQuotes;
            }
        } else if (char === ',' && !insideQuotes) {
            currentRow.push(currentValue.trim());
            currentValue = "";
        } else if ((char === '\n' || char === '\r') && !insideQuotes) {
            if (currentValue || currentRow.length > 0) {
                currentRow.push(currentValue.trim());
                if (currentRow.some(v => v !== "")) {
                    rows.push(currentRow);
                }
                currentRow = [];
                currentValue = "";
            }
        } else {
            currentValue += char;
        }
    }

    if (currentValue || currentRow.length > 0) {
        currentRow.push(currentValue.trim());
        if (currentRow.some(v => v !== "")) {
            rows.push(currentRow);
        }
    }

    return rows;
}

function calcularHashSimple(texto) {
    let hash = 0;
    for (let i = 0; i < texto.length; i++) {
        const char = texto.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString();
}

// ============================================================================
// FUNCIONES CACHÉ
// ============================================================================

function esCacheValido(clave) {
    const cached = localStorage.getItem(clave);
    if (!cached) return false;

    try {
        const data = JSON.parse(cached);
        const tiempoTranscurrido = (Date.now() - data.timestamp) / 60000;
        return tiempoTranscurrido < CONFIG.tiempoCache;
    } catch {
        return false;
    }
}

function guardarCache(clave, datos, hash) {
    try {
        localStorage.setItem(clave, JSON.stringify({
            timestamp: Date.now(),
            data: datos,
            hash: hash
        }));
    } catch (e) {
        console.warn("Error guardando caché:", e);
    }
}

function obtenerCache(clave) {
    try {
        const cached = localStorage.getItem(clave);
        if (cached) {
            const data = JSON.parse(cached);
            return data.data;
        }
    } catch (e) {
        console.warn("Error leyendo caché:", e);
    }
    return null;
}

function obtenerHashCache(clave) {
    try {
        const cached = localStorage.getItem(clave);
        if (cached) {
            const data = JSON.parse(cached);
            return data.hash;
        }
    } catch (e) {
        console.warn("Error leyendo hash caché:", e);
    }
    return null;
}

// ============================================================================
// OBTENER BANNERS
// ============================================================================

async function obtenerBanners() {
    const claveBanners = "tuzalud_banners";

    try {
        const response = await fetch(`${CONFIG.urlBase}gid=${CONFIG.gidBanners}&output=csv`);
        
        if (!response.ok) {
            throw new Error("Error descargando banners");
        }

        const csv = await response.text();
        const hash = calcularHashSimple(csv);
        const hashCached = obtenerHashCache(claveBanners);

        if (hashCached && hashCached !== hash) {
            console.log("Banners actualizados detectados");
        } else if (esCacheValido(claveBanners) && hashCached === hash) {
            console.log("Usando banners desde caché");
            return obtenerCache(claveBanners);
        }

        const rows = parseCSV(csv);
        const banners = rows
            .slice(1)
            .map(row => row[1]?.trim())
            .filter(banner => banner && banner.length > 0);

        const bannersFinales = banners.length > 0 ? banners : ["banners/banner1.png"];

        guardarCache(claveBanners, bannersFinales, hash);
        console.log("Banners cargados:", bannersFinales.length);

        return bannersFinales;
    } catch (error) {
        console.warn("Error obtieniendo banners:", error);
        return ["banners/banner1.png"];
    }
}

// ============================================================================
// OBTENER PRODUCTOS (CON LECTURA DE ZONA ORTOPEDIA - COLUMNA I)
// ============================================================================

async function obtenerProductos() {
    const claveProductos = "tuzalud_productos";

    if (PRODUCTOS_DATA.length > 0) {
        console.log("Productos desde memoria");
        return PRODUCTOS_DATA;
    }

    try {
        const response = await fetch(`${CONFIG.urlBase}gid=${CONFIG.gidProductos}&output=csv`);

        if (!response.ok) {
            throw new Error("Error descargando productos");
        }

        const csv = await response.text();
        const hash = calcularHashSimple(csv);
        const hashCached = obtenerHashCache(claveProductos);

        if (hashCached && hashCached !== hash) {
            console.log("Productos actualizados detectados");
        } else if (esCacheValido(claveProductos) && hashCached === hash) {
            const cached = obtenerCache(claveProductos);
            PRODUCTOS_DATA = cached.productos;
            PRODUCTOS_DESTACADOS = cached.destacados;
            console.log(`Productos desde caché: ${PRODUCTOS_DATA.length}`);
            return PRODUCTOS_DATA;
        }

        const rows = parseCSV(csv);
        console.log("Procesando productos...");

        PRODUCTOS_DATA = rows
            .slice(1)
            .filter(row => {
                const disponibilidad = row[5]?.trim().toLowerCase();
                return row.length >= 6 && disponibilidad === "si";
            })
            .map(row => {
                const fichaUrl = row[7]?.trim() || "";
                const zonaOrtopedia = row[8]?.trim() || "";

                const producto = {
                    categoria: row[0]?.trim() || "",
                    nombre: row[1]?.trim() || "",
                    desc: row[2]?.trim() || "",
                    img: row[3]?.trim() || "https://via.placeholder.com/300x200?text=Sin+Imagen",
                    marca: row[4]?.trim() || "Sin marca",
                    disponible: true,
                    destacado: row[6]?.trim().toLowerCase() === "si",
                    fichaUrl: fichaUrl,
                    zonaOrtopedia: zonaOrtopedia
                };

                if (fichaUrl) {
                    console.log(`✓ Producto con ficha: "${producto.nombre}"`);
                }

                return producto;
            });

        PRODUCTOS_DESTACADOS = PRODUCTOS_DATA.filter(p => p.destacado);

        const conFicha = PRODUCTOS_DATA.filter(p => p.fichaUrl).length;
        const conZonaOrtopedia = PRODUCTOS_DATA.filter(p => p.zonaOrtopedia).length;

        guardarCache(claveProductos, {
            productos: PRODUCTOS_DATA,
            destacados: PRODUCTOS_DESTACADOS
        }, hash);

        console.log(`Total productos: ${PRODUCTOS_DATA.length}`);
        console.log(`Productos destacados: ${PRODUCTOS_DESTACADOS.length}`);
        console.log(`Con ficha técnica: ${conFicha}`);
        console.log(`Con zona ortopedia: ${conZonaOrtopedia}`);

        return PRODUCTOS_DATA;
    } catch (error) {
        console.error("Error obtieniendo productos:", error);
        PRODUCTOS_DATA = [];
        PRODUCTOS_DESTACADOS = [];
        return [];
    }
}

// ============================================================================
// CARGAR TODO EN PARALELO
// ============================================================================

async function cargarTodoEnParalelo() {
    console.time("Carga total");

    try {
        const [banners, productos] = await Promise.all([
            obtenerBanners(),
            obtenerProductos()
        ]);

        console.timeEnd("Carga total");
        return {
            banners: banners,
            productos: productos
        };
    } catch (error) {
        console.error("Error cargando datos:", error);
        return {
            banners: [],
            productos: []
        };
    }
}

// ============================================================================
// BÚSQUEDA Y FILTRADO
// ============================================================================

function buscarProducto(termino, callback) {
    const term = termino.toLowerCase().trim();

    if (!term || term.length < 2) {
        callback([]);
        return;
    }

    const resultados = PRODUCTOS_DATA.filter(producto => {
        return (
            producto.nombre.toLowerCase().includes(term) ||
            producto.marca.toLowerCase().includes(term) ||
            producto.categoria.toLowerCase().includes(term) ||
            producto.desc.toLowerCase().includes(term)
        );
    });

    callback(resultados);
}

function obtenerProductosPorCategoria(categoria) {
    return PRODUCTOS_DATA.filter(producto => {
        return producto.categoria.toLowerCase().includes(categoria.toLowerCase());
    });
}

function obtenerProductosDestacados() {
    return PRODUCTOS_DESTACADOS;
}

// ============================================================================
// LIMPIAR CACHÉ
// ============================================================================

function limpiarCache() {
    localStorage.removeItem("tuzalud_productos");
    localStorage.removeItem("tuzalud_banners");
    console.log("Caché limpiado");
    location.reload();
}

// ============================================================================
// MODO DEBUG
// ============================================================================

window.TUZALUD_DEBUG = {
    limpiarCache: limpiarCache,
    productos: () => PRODUCTOS_DATA,
    destacados: () => PRODUCTOS_DESTACADOS,
    conFichas: () => PRODUCTOS_DATA.filter(p => p.fichaUrl),
    conZonaOrtopedia: () => PRODUCTOS_DATA.filter(p => p.zonaOrtopedia),
    forceActualizarCache: async () => {
        PRODUCTOS_DATA = [];
        PRODUCTOS_DESTACADOS = [];
        await obtenerProductos();
        console.log("Caché forzado a actualizar");
    },
    limpiarCacheYRecargar: () => {
        limpiarCache();
    }
};
