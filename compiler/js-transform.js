/**
 * Transpilador JS de Alipay MiniProgram → JS estándar
 * Convierte Page({}), Component({}), App({}) a clases JS
 */

function transformJs(source, pageName) {
  let js = source;

  // 1. Convertir require() de rutas absolutas a relativas
  js = js.replace(
    /require\(['"]\/([^'"]+)['"]\)/g,
    "require('./$1')"
  );

  // 2. Convertir require() de @claro/components
  js = js.replace(
    /require\(['"]@claro\/components-superapp\/[^'"]+['"]\)/g,
    "/* @claro component removed */{}"
  );

  // 3. Transformar Page({}) → clase estándar
  js = transformPage(js, pageName);

  // 4. Transformar Component({}) → clase estándar
  js = transformComponent(js, pageName);

  // 5. Transformar App({}) → inicializador
  js = transformApp(js);

  // 6. Agregar polyfills de my.* no disponibles
  js = addPolyfills(js);

  return js;
}

function transformPage(js, pageName) {
  // Detectar si tiene Page({})
  if (!js.includes('Page(')) return js;

  const className = toPascalCase(pageName) + 'Page';

  // Envolver en una clase que extiende SuperAppPage
  const header = `
// Compilado por SuperApp Compiler
// Página: ${pageName}
`;

  // Reemplazar Page({...}) por clase
  js = js.replace(/Page\(\{/, `
${header}
class ${className} extends SuperAppRuntime.Page {
  constructor() {
    super();
    Object.assign(this, {`);

  // Cerrar la clase correctamente
  // Esta es una transformación básica — el runtime maneja el resto
  js = js.replace(/\}\)(\s*)$/, `    });
  }
}

// Registrar la página
SuperAppRuntime.registerPage('${pageName}', ${className});
`);

  return js;
}

function transformComponent(js, componentName) {
  if (!js.includes('Component(')) return js;

  const className = toPascalCase(componentName) + 'Component';

  js = js.replace(/Component\(\{/, `
class ${className} extends SuperAppRuntime.Component {
  constructor() {
    super();
    Object.assign(this, {`);

  js = js.replace(/\}\)(\s*)$/, `    });
  }
}

SuperAppRuntime.registerComponent('${componentName}', ${className});
`);

  return js;
}

function transformApp(js) {
  if (!js.includes('App(')) return js;

  js = js.replace(/App\(\{/, 'SuperAppRuntime.initApp({');
  js = js.replace(/\}\)(\s*)$/, '});');

  return js;
}

function addPolyfills(js) {
  const polyfills = `
// Polyfills para APIs de Alipay no disponibles en SuperApp
if (typeof my !== 'undefined') {
  if (!my.hideBackHome) my.hideBackHome = function() {};
  if (!my.setCanPullDown) my.setCanPullDown = function() {};
  if (!my.exitMiniProgram) my.exitMiniProgram = function() {
    window.SuperApp && window.SuperApp.navigateBack({});
  };
  if (!my.openSetting) my.openSetting = function() {};
  if (!my.env) my.env = { platform: /android/i.test(navigator.userAgent) ? 'Android' : 'iOS' };
  if (!my.call) my.call = function(name, params) {
    console.warn('[SuperApp] my.call not implemented:', name, params);
    return Promise.resolve({});
  };
}
`;
  return polyfills + js;
}

function toPascalCase(str) {
  return str
    .replace(/[-_/](.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, (_, c) => c.toUpperCase());
}

module.exports = { transformJs };