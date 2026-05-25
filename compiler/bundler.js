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
        src = await resolveRequires(src, path.dirname(jsPath), projectRoot);
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

async function resolveRequires(src, fileDir, projectRoot) {
  // Resolver requires de forma recursiva
  const requireRegex = /(?:const|let|var)\s+(?:\{[^}]+\}|\w+)\s*=\s*require\(['"]([^'"]+)['"]\)/g;
  const simpleRequireRegex = /require\(['"]([^'"]+)['"]\)/g;

  let result = src;
  const processed = new Set();

  async function inlineRequire(code, currentDir) {
    let output = code;
    const matches = [...code.matchAll(/require\(['"]([^'"]+)['"]\)/g)];

    for (const match of matches) {
      const requirePath = match[1];

      // Ignorar paquetes externos
      const EXTERNAL_MODULES = [
        'fs', 'fs-extra', 'path', 'os', 'crypto', 'http', 'https',
        'stream', 'buffer', 'util', 'events', 'child_process',
        'rxjs', 'jsrsasign',
        ];

        if (
        requirePath.startsWith('@') ||
        EXTERNAL_MODULES.includes(requirePath) ||
        (!requirePath.startsWith('.') && !requirePath.startsWith('/'))
        ) {
        output = output.replace(
            match[0],
            `/* external:${requirePath} */ ({})`
        );
        continue;
        }

      // Resolver ruta
      let resolvedPath = requirePath.startsWith('/')
        ? path.join(projectRoot, requirePath)
        : path.resolve(currentDir, requirePath);

      // Agregar .js si no tiene extensión
      if (!resolvedPath.endsWith('.js')) resolvedPath += '.js';

      if (processed.has(resolvedPath)) {
        output = output.replace(match[0], `__module_${Buffer.from(resolvedPath).toString('base64').substring(0, 8)}`);
        continue;
      }

      if (await fs.pathExists(resolvedPath)) {
        console.log(`   📎 Resolviendo require: ${resolvedPath}`);
        processed.add(resolvedPath);
        let moduleCode = await fs.readFile(resolvedPath, 'utf8');
        const moduleDir = path.dirname(resolvedPath);

        // Resolver requires anidados
        moduleCode = await inlineRequire(moduleCode, moduleDir);

        // Convertir module.exports a variable
        const varName = `__module_${Buffer.from(resolvedPath).toString('base64').substring(0, 8)}`;
        const wrapped = `
var ${varName} = (function() {
  var module = { exports: {} };
  var exports = module.exports;
  ${moduleCode}
  return module.exports;
})();
`;
        output = wrapped + output.replace(match[0], varName);
      } else {
        output = output.replace(match[0], `/* not found:${requirePath} */ ({})`);
      }
    }

    return output;
  }

  return await inlineRequire(src, fileDir);
}

function escapeForTemplate(str) {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${');
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
    /* Estilos base para componentes Claro */
    [data-component="modal"] {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.5);
      display: flex; align-items: flex-end;
      justify-content: center; z-index: 100;
    }
    [data-component="modal"] > div {
      background: white; border-radius: 20px 20px 0 0;
      padding: 24px; width: 100%; max-width: 480px;
    }
    [data-component="loader"] {
      display: flex; align-items: center;
      justify-content: center; min-height: 200px;
    }
    [data-component="claro-button"] {
      display: block; width: 100%; padding: 14px;
      border: none; border-radius: 25px;
      font-size: 15px; font-weight: 600;
      cursor: pointer; margin-bottom: 8px;
    }
    [data-component="claro-button"][type="primary"] {
      background: #DA291C; color: white;
    }
    [data-component="claro-button"][type="secondary"] {
      background: transparent; color: #DA291C;
      border: 1.5px solid #DA291C;
    }
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

    /* Polyfill temporal de my para evitar errores antes del SDK */
    window.my = window.my || {
      setCanPullDown: function() {},
      hideBackHome: function() {},
      exitMiniProgram: function() { history.back(); },
      openSetting: function() {},
      getSetting: function(o) { if(o.success) o.success({ authSetting: { "scope.userLocation": false } }); },
      getLocation: function(o) { if(o.fail) o.fail({ error: 10001, errorMessage: "SDK cargando..." }); },
      getSystemInfo: function() { return Promise.resolve({ platform: /android/i.test(navigator.userAgent) ? "android" : "ios", locationEnabled: false, locationAuthorized: false }); },
      setStorageSync: function() {},
      getStorageSync: function() { return null; },
      setStorage: function(o) { if(o.success) o.success(); },
      alert: function(o) { alert(o.content || o.title); if(o.success) o.success(); },
      confirm: function(o) { var r = confirm(o.content); if(o.success) o.success({ confirm: r }); },
      showToast: function(o) { console.log("[Toast]", o.content); if(o.success) o.success(); },
      call: function(name, params) {
        if (name === "MQGetIsUserInGuestMode") return Promise.resolve({ result: { isGuestMode: false } });
        if (name === "AFLogEvent" || name === "FIRLogEvent") return Promise.resolve({ success: true });
        console.warn("[my.call]", name, params);
        if (window.SuperApp && window.SuperApp.call) return window.SuperApp.call(name, params || {});
        return Promise.resolve({});
      },
      env: { platform: /android/i.test(navigator.userAgent) ? "android" : "ios" },
      onError: function() {},
      offError: function() {},
    };

    /* App JS — corre inmediatamente con polyfill */
    ${escapeForTemplate(appJs)}

    /* Pages JS */
    ${escapeForTemplate(pagesJs)}

    /* Cuando el SDK real esté listo, reemplazar el polyfill */
    document.addEventListener('DOMContentLoaded', function() {
      var attempts = 0;
      var interval = setInterval(function() {
        attempts++;
        if (window.SuperApp && window.SuperApp.getOpenUserInfo) {
          clearInterval(interval);
          // El window.my ya fue reemplazado por el SDK real
          SuperAppRuntime.render(document.getElementById('app'));
        } else if (attempts > 50) {
          clearInterval(interval);
          SuperAppRuntime.render(document.getElementById('app'));
        }
      }, 100);
    });
  </script>
</body>
</html>`;
}

module.exports = { build };