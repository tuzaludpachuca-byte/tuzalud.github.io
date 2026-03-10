/* ============================================
   CONFIG.JS - TUZALUD
   Sistema simplificado - ficha_url en PRODUCTOS
   ============================================ */

const CONFIG = {
    nombreNegocio: "TUZALUD",
    logoRuta: "https://i.ibb.co/Gy4k01w/LOGO.png",
    telefono: "771 231 1859",
    direccionBarra: "Bienvenidos a TUZALUD en donde tu salud es primero",
    
    urlBase: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTUsK_6cOjD214oJnxWMeZDKxUYRsKAiLml9cpR8jXuziWpx8G0qXyHq1pigGWWOTtYtaazNIm9ov7a/pub?",
    gidProductos: "0",
    gidBanners: "691969109",
    
    tiempoCache: 30,
    
    sucursales: [
        { nombre: "Sucursal ISSSTE", tel: "771 692 9925", wa: "7713622888", dir: "Río Lerma 213, ISSSTE, 42083, Pachuca de Soto, HGO", mapa: "https://maps.app.goo.gl/Z45QVNRcFvWzbgYG9" },
        { nombre: "Sucursal IMSS", tel: "771 273 8900", wa: "7716779966", dir: "C. Reforma 94-A, Céspedes, 42090, Pachuca de Soto, HGO", mapa: "https://maps.app.goo.gl/Wr6wxr2XjMdTB3Bz7" },
        { nombre: "Sucursal MATRIZ", tel: "771 815 4673", wa: "7712311859", dir: "Dr. Eliseo Ramírez Ulloa 700, Doctores, 42090, Pachuca de Soto, HGO", mapa: "https://maps.app.goo.gl/zM3Vx4PjMjKAGnt67" }
    ]
};

let PRODUCTOS_DATA = [];
let PRODUCTOS_DESTACADOS = [];

function parseCSV(text) {
    const lines = [];
    let currentLine = [];
    let currentField = '';
    let insideQuotes = false;
    
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];
        
        if (char === '"') {
            if (insideQuotes && nextChar === '"') {
                currentField += '"';
                i++;
            } else {
                insideQuotes = !insideQuotes;
            }
        } else if (char === ',' && !insideQuotes) {
            currentLine.push(currentField.trim());
            currentField = '';
        } else if ((char === '\n' || char === '\r') && !insideQuotes) {
            if (currentField || currentLine.length > 0) {
                currentLine.push(currentField.trim());
                if (currentLine.some(f => f !== '')) lines.push(currentLine);
                currentLine = [];
                currentField = '';
            }
        } else {
            currentField += char;
        }
    }
    
    if (currentField || currentLine.length > 0) {
        currentLine.push(currentField.trim());
        if (currentLine.some(f => f !== '')) lines.push(currentLine);
    }
    
    return lines;
}

function esCacheValido(clave) {
    const cache = localStorage.getItem(clave);
    if (!cache) return false;
    
    try {
        const data = JSON.parse(cache);
        const minutos = (Date.now() - data.timestamp) / (1000 * 60);
        return minutos < CONFIG.tiempoCache;
    } catch {
        return false;
    }
}

function guardarCache(clave, datos) {
    try {
        localStorage.setItem(clave, JSON.stringify({
            timestamp: Date.now(),
            data: datos
        }));
    } catch (e) {
        console.warn('Error guardando caché:', e);
    }
}

function obtenerCache(clave) {
    try {
        const cache = localStorage.getItem(clave);
        if (cache) return JSON.parse(cache).data;
    } catch {}
    return null;
}

async function obtenerBanners() {
    const CACHE_KEY = 'tuzalud_banners';
    
    if (esCacheValido(CACHE_KEY)) {
        console.log('⚡ Banners desde caché');
        return obtenerCache(CACHE_KEY);
    }
    
    try {
        const res = await fetch(`${CONFIG.urlBase}gid=${CONFIG.gidBanners}&output=csv`);
        if (!res.ok) throw new Error('Error banners');
        
        const data = await res.text();
        const filas = parseCSV(data);
        const banners = filas.slice(1).map(f => f[1]?.trim()).filter(url => url && url.length > 0);
        
        const resultado = banners.length > 0 ? banners : ["banners/banner1.png"];
        guardarCache(CACHE_KEY, resultado);
        console.log('✅ Banners cargados:', resultado.length);
        return resultado;
    } catch (e) {
        console.warn('⚠️ Error banners');
        return ["banners/banner1.png"];
    }
}

async function obtenerProductos() {
    const CACHE_KEY = 'tuzalud_productos';
    
    if (PRODUCTOS_DATA.length > 0) {
        console.log('⚡ Productos desde memoria');
        return PRODUCTOS_DATA;
    }
    
    if (esCacheValido(CACHE_KEY)) {
        const cache = obtenerCache(CACHE_KEY);
        PRODUCTOS_DATA = cache.productos;
        PRODUCTOS_DESTACADOS = cache.destacados;
        console.log(`⚡ Productos desde caché: ${PRODUCTOS_DATA.length}`);
        return PRODUCTOS_DATA;
    }
    
    try {
        const res = await fetch(`${CONFIG.urlBase}gid=${CONFIG.gidProductos}&output=csv`);
        if (!res.ok) throw new Error('Error productos');
        
        const data = await res.text();
        const filas = parseCSV(data);
        
        console.log('📊 Procesando productos...');
        
        PRODUCTOS_DATA = filas.slice(1)
            .filter(l => l.length >= 6 && l[5]?.trim().toLowerCase() === "si")
            .map(l => {
                const fichaUrl = l[7]?.trim() || '';
                
                const producto = {
                    categoria: l[0]?.trim() || '',
                    nombre: l[1]?.trim() || '',
                    desc: l[2]?.trim() || '',
                    img: l[3]?.trim() || 'https://via.placeholder.com/300x200?text=Sin+Imagen',
                    marca: l[4]?.trim() || 'Sin marca',
                    disponible: true,
                    destacado: l[6]?.trim().toLowerCase() === "si",
                    fichaUrl: fichaUrl
                };
                
                if (fichaUrl) {
                    console.log(`📄 Producto con ficha: "${producto.nombre}" → ${fichaUrl.substring(0, 50)}...`);
                }
                
                return producto;
            });
        
        PRODUCTOS_DESTACADOS = PRODUCTOS_DATA.filter(p => p.destacado);
        
        const conFichas = PRODUCTOS_DATA.filter(p => p.fichaUrl).length;
        
        guardarCache(CACHE_KEY, {
            productos: PRODUCTOS_DATA,
            destacados: PRODUCTOS_DESTACADOS
        });
        
        console.log(`✅ Productos cargados: ${PRODUCTOS_DATA.length}`);
        console.log(`✅ Destacados: ${PRODUCTOS_DESTACADOS.length}`);
        console.log(`✅ Con ficha técnica: ${conFichas}`);
        
        return PRODUCTOS_DATA;
    } catch (e) {
        console.error('❌ Error productos:', e);
        PRODUCTOS_DATA = [];
        PRODUCTOS_DESTACADOS = [];
        return [];
    }
}

async function cargarTodoEnParalelo() {
    console.time('⚡ Carga total');
    
    try {
        const [banners, productos] = await Promise.all([
            obtenerBanners(),
            obtenerProductos()
        ]);
        
        console.timeEnd('⚡ Carga total');
        return { banners, productos };
    } catch (e) {
        console.error('Error carga paralela:', e);
        return { banners: ["banners/banner1.png"], productos: [] };
    }
}

function buscarProducto(termino, callback) {
    const term = termino.toLowerCase().trim();
    if (!term || term.length < 2) {
        callback([]);
        return;
    }
    
    const resultados = PRODUCTOS_DATA.filter(p => 
        p.nombre.toLowerCase().includes(term) ||
        p.marca.toLowerCase().includes(term) ||
        p.categoria.toLowerCase().includes(term) ||
        p.desc.toLowerCase().includes(term)
    );
    
    callback(resultados);
}

function obtenerProductosPorCategoria(categoria) {
    return PRODUCTOS_DATA.filter(p => 
        p.categoria.toLowerCase().includes(categoria.toLowerCase())
    );
}

function obtenerProductosDestacados() {
    return PRODUCTOS_DESTACADOS;
}

function limpiarCache() {
    localStorage.removeItem('tuzalud_productos');
    localStorage.removeItem('tuzalud_banners');
    console.log('🗑️ Caché limpiado');
    location.reload();
}

window.TUZALUD_DEBUG = {
    limpiarCache,
    verCache: () => ({
        productos: obtenerCache('tuzalud_productos'),
        banners: obtenerCache('tuzalud_banners')
    }),
    productos: () => PRODUCTOS_DATA,
    destacados: () => PRODUCTOS_DESTACADOS,
    conFichas: () => PRODUCTOS_DATA.filter(p => p.fichaUrl)
};

console.log('💡 Usa TUZALUD_DEBUG.limpiarCache() para limpiar caché');
console.log('💡 Usa TUZALUD_DEBUG.conFichas() para ver productos con ficha');
