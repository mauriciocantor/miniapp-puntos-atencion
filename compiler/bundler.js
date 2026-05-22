/**
 * Bundler principal
 * Orquesta todo el proceso de compilación
 */

const fs = require('fs-extra');
const path = require('path');
const { transformAxml, acssToCSs } = require('./axml-to-html');
const { transformJs } = require('./js-transform');

async function build(projectRoot, outputDir) {
  console.log('🔨 SuperApp Compiler iniciando...');
  console.log(`   Fuente: ${projectRoot}`);
  console.log(`   Salida: ${outputDir}`);

  await fs.ensureDir(outputDir);

  // 1. Leer app.json para obtener páginas
  const appJson = await fs.readJson(path.join(projectRoot, 'app.json'));
  const pages = appJson.pages || [];
  const appTitle = appJson.window?.defaultTitle || 'Mini App';
  const titleBarColor = appJson.window?.titleBarColor || '#DA291C';

  console.log(`\n📄 Páginas encontradas: ${pages.join(', ')}`);

  // 2. Compilar app.acss → app.css
  let globalCss = '';
  const appAcssPath = path.join(projectRoot, 'app.acss');
  if (await fs.pathExists(appAcssPath)) {
    const acss = await fs.readFile(appAcssPath, 'utf8');
    globalCss = acssToCSs(acss);
    console.log('✅ app.acss compilado');
  }

  // 3. Compilar app.js
  let appJs = '';
  const appJsPath = path.join(projectRoot, 'app.js');
  if (await fs.pathExists(appJsPath)) {
    const src = await fs.readFile(appJsPath, 'utf8');
    appJs = transformJs(src, 'app');
    console.log('✅ app.js compilado');
  }

  // 4. Compilar cada página
  let pagesHtml = '';
  let pagesJs = '';
  let pagesCss = '';

  for (const pagePath of pages) {
    const pageDir = path.join(projectRoot, pagePath);
    const pageName = path.basename(pagePath);

    console.log(`\n🔄 Compilando página: ${pagePath}`);

    // AXML → HTML template
    const axmlPath = `${pageDir}.axml`;
    if (await fs.pathExists(axmlPath)) {
      const axml = await fs.readFile(axmlPath, 'utf8');
      const html = transformAxml(axml);
      pagesHtml += `\n<!-- Página: ${pagePath} -->\n${html}`;
      console.log(`   ✅ ${pageName}.axml compilado`);
    }

    // ACSS → CSS
    const acssPath = `${pageDir}.acss`;
    if (await fs.pathExists(acssPath)) {
      const acss = await fs.readFile(acssPath, 'utf8');
      pagesCss += `\n/* Página: ${pagePath} */\n${acssToCSs(acss)}`;
      console.log(`   ✅ ${pageName}.acss compilado`);
    }

    // JS → JS transpilado
    const jsPath = `${pageDir}.js`;
    if (await fs.pathExists(jsPath)) {
      let src = await fs.readFile(jsPath, 'utf8');
      // Resolver requires relativos
      src = resolveRequires(src, pageDir, projectRoot);
      pagesJs += `\n// === Página: ${pagePath} ===\n${transformJs(src, pageName)}`;
      console.log(`   ✅ ${pageName}.js compilado`);
    }
  }

  // 5. Copiar assets
  const assetsDir = path.join(projectRoot, 'main/ui/assets');
  if (await fs.pathExists(assetsDir)) {
    await fs.copy(assetsDir, path.join(outputDir, 'assets'));
    console.log('\n✅ Assets copiados');
  }

  // 6. Leer el runtime
  const runtimeSrc = await fs.readFile(
    path.join(__dirname, 'runtime.js'), 'utf8'
  );

  // 7. Generar index.html final
  const indexHtml = generateHtml({
    title: appTitle,
    titleBarColor,
    globalCss,
    pagesCss,
    pagesHtml,
    runtimeSrc,
    appJs,
    pagesJs,
  });

  await fs.writeFile(path.join(outputDir, 'index.html'), indexHtml, 'utf8');
  console.log('\n✅ index.html generado');

  // 8. Generar bundle.js separado
  const bundleJs = [
    '// SuperApp Mini-App Bundle',
    '// Generado automáticamente — no editar',
    runtimeSrc,
    appJs,
    pagesJs,
    '\n// Iniciar la app\n',
    'document.addEventListener("DOMContentLoaded", function() {',
    '  SuperAppRuntime.render(document.getElementById("app"));',
    '});',
  ].join('\n\n');

  await fs.writeFile(path.join(outputDir, 'bundle.js'), bundleJs, 'utf8');
  console.log('✅ bundle.js generado');

  console.log('\n🎉 Compilación completada exitosamente!');
  console.log(`   Output: ${outputDir}/index.html`);
}

function resolveRequires(src, fileDir, projectRoot) {
  return src.replace(
    /require\(['"]([^'"]+)['"]\)/g,
    function(match, requirePath) {
      if (requirePath.startsWith('/')) {
        // Ruta absoluta del mini-program → relativa al proyecto
        return `require('${requirePath}')`;
      }
      if (requirePath.startsWith('@')) {
        // Paquete externo → mock
        return `/* external: ${requirePath} */ {}`;
      }
      return match;
    }
  );
}

function generateHtml({ title, titleBarColor, globalCss, pagesCss, pagesHtml, runtimeSrc, appJs, pagesJs }) {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Roboto, sans-serif; background: #FDFDFF; }
    #app { min-height: 100vh; }

    /* Global CSS compilado desde app.acss */
    ${globalCss}

    /* CSS de páginas compilado desde .acss */
    ${pagesCss}
  </style>
</head>
<body>
  <div id="app"></div>

  <!-- Templates de páginas compilados desde .axml -->
  <script type="text/template" id="__page_template__">
    ${pagesHtml}
  </script>

  <script>
    /* SuperApp Runtime */
    ${runtimeSrc}

    /* App JS */
    ${appJs}

    /* Pages JS */
    ${pagesJs}

    /* Iniciar */
    document.addEventListener('DOMContentLoaded', function() {
      SuperAppRuntime.render(document.getElementById('app'));
    });
  </script>
</body>
</html>`;
}

module.exports = { build };