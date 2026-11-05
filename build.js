#!/usr/bin/env node
/*
 * Genera una version de "Arma tu ramo" en un solo archivo HTML autocontenido.
 *
 * Uso:
 *   node build.js
 *   node build.js --out dist/ramo.html
 *   node build.js --url "http://localhost:8000/?d=XXXX"
 *   node build.js --design "BASE64_DEL_DISENO" --out dist/ramo-para-ana.html
 *
 * Sin --design/--url el archivo abre el editor normal.
 * Con --design/--url abre la vista "recibiste un ramo" con ese diseno cargado
 * y el boton "Crear mi propio ramo".
 */
const fs = require("fs");
const path = require("path");

const root = __dirname;

function arg(name) {
  const i = process.argv.indexOf("--" + name);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : null;
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function safeJson(value) {
  return JSON.stringify(value).replace(/<\/script/gi, "<\\/script");
}

let design = arg("design");
const urlArg = arg("url");
if (!design && urlArg) {
  try {
    design = new URL(urlArg).searchParams.get("d");
  } catch (e) {
    console.error("No se pudo leer el parametro d de --url:", e.message);
    process.exit(1);
  }
}

let html = read("index.html");

let mainCss = read("css/estilos.css");
mainCss = mainCss.replace(/url\("\.\.\/assets\/([^"]+)"\)/g, function (m, file) {
  const imgPath = path.join(root, "assets", file);
  if (!fs.existsSync(imgPath)) {
    console.error("No se encontro assets/" + file);
    process.exit(1);
  }
  return 'url("data:image/webp;base64,' + fs.readFileSync(imgPath).toString("base64") + '")';
});
const mainLink = '<link rel="stylesheet" href="css/estilos.css">';
if (!html.includes(mainLink)) {
  console.error("No se encontro el <link> de estilos en index.html");
  process.exit(1);
}
html = html.replace(mainLink, "<style>\n" + mainCss + "\n</style>");

const cssText = {
  ded: read("css/dedicatoria.css"),
  gua: read("css/guardar.css"),
  rec: read("css/recibido.css")
};

let injected = "<script>window.__CSS_TEXT=" + safeJson(cssText) + ";</script>";
if (design) injected += "\n<script>window.__DISENO_INICIAL=" + safeJson(design) + ";</script>";
injected += "\n";

if (!html.includes("<body>")) {
  console.error("No se encontro <body> en index.html");
  process.exit(1);
}
html = html.replace("<body>", "<body>\n" + injected);

const out = arg("out") || (design ? "dist/ramo-para-compartir.html" : "dist/arma-tu-ramo.html");
const outPath = path.isAbsolute(out) ? out : path.join(root, out);
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, html, "utf8");

const kb = (Buffer.byteLength(html, "utf8") / 1024).toFixed(0);
console.log("Listo: " + outPath);
console.log("Tamano: " + kb + " KB" + (design ? " (incluye un ramo cargado)" : " (editor normal)"));
console.log("Envialo como un unico archivo; no necesita la carpeta css/.");
