/**
 * Compilador AXML → HTML
 * Convierte templates de Alipay MiniProgram a HTML estándar
 */

// Mapa de tags AXML → HTML
const TAG_MAP = {
  'view': 'div',
  'text': 'span',
  'image': 'img',
  'scroll-view': 'div',
  'swiper': 'div',
  'swiper-item': 'div',
  'block': 'div',
  'icon': 'span',
  'progress': 'progress',
  'rich-text': 'div',
  'web-view': 'iframe',
  'page': 'div',
  'button': 'button',
  'input': 'input',
  'textarea': 'textarea',
  'form': 'form',
  'checkbox': 'input',
  'radio': 'input',
  'switch': 'input',
  'slider': 'input',
  'picker': 'select',
  'modal': 'div',
  'loader': 'div',
};

// Atributos AXML → HTML
const ATTR_MAP = {
  'onTap': 'data-ontap',
  'onChange': 'data-onchange',
  'onInput': 'data-oninput',
  'onSubmit': 'data-onsubmit',
  'onLoad': 'data-onload',
  'onError': 'data-onerror',
  'onScroll': 'data-onscroll',
  'bindtap': 'data-ontap',
  'src': 'src',
  'class': 'class',
  'style': 'style',
  'id': 'id',
  'disabled': 'data-disabled',
  'placeholder': 'placeholder',
  'value': 'data-value',
  'type': 'type',
  'slot': 'slot',
};

function transformAxml(axml) {
  let html = axml;

  // 1. Convertir directivas a:if
  html = html.replace(
    /a:if=["']?\{\{([^}]+)\}\}["']?/g,
    'data-if="{{$1}}"'
  );

  // 2. Convertir directivas a:else
  html = html.replace(/a:else/g, 'data-else');

  // 3. Convertir directivas a:for
  html = html.replace(
    /a:for=["']?\{\{([^}]+)\}\}["']?\s*(?:a:for-index=["']?(\w+)["']?)?\s*(?:a:for-item=["']?(\w+)["']?)?/g,
    (match, list, index, item) => {
      const idx = index || 'index';
      const itm = item || 'item';
      return `data-for="${list}" data-for-index="${idx}" data-for-item="${itm}"`;
    }
  );

  // 4. Convertir a:key
  html = html.replace(/a:key=["']?([^"'\s>]+)["']?/g, 'data-key="$1"');

  // 5. Convertir interpolaciones {{ }} — dejarlas para el runtime
  // Las dejamos como data attributes para que el runtime las resuelva

  // 6. Convertir tags AXML → HTML
  Object.entries(TAG_MAP).forEach(([axmlTag, htmlTag]) => {
    // Tag de apertura
    const openRegex = new RegExp(`<${axmlTag}(\\s|>|/)`, 'g');
    html = html.replace(openRegex, `<${htmlTag} data-component="${axmlTag}"$1`);
    // Tag de cierre
    const closeRegex = new RegExp(`</${axmlTag}>`, 'g');
    html = html.replace(closeRegex, `</${htmlTag}>`);
  });

  // 7. Convertir atributos de evento onTap → data-ontap
  html = html.replace(/\bonTap=\{\{([^}]+)\}\}/g, 'data-ontap="$1"');
  html = html.replace(/\bonTap="([^"]+)"/g, 'data-ontap="$1"');
  html = html.replace(/\bonTap='([^']+)'/g, 'data-ontap="$1"');

  // 8. Convertir web-view src con interpolaciones
  html = html.replace(
    /<iframe([^>]*)src="([^"]*\{\{[^}]*\}\}[^"]*)"([^>]*)>/g,
    '<iframe$1data-src="$2"$3>'
  );

  // 9. Convertir componentes custom (claro-button, modal, loader, etc.)
  // Los dejamos como custom elements para que el runtime los maneje
  html = html.replace(
    /<(claro-[a-z-]+|modal|loader)(\s)/g,
    '<div data-component="$1"$2'
  );
  html = html.replace(
    /<\/(claro-[a-z-]+|modal|loader)>/g,
    '</div>'
  );

  return html;
}

function acssToCSs(acss) {
  let css = acss;
  // page {} → body {}
  css = css.replace(/\bpage\b\s*\{/g, 'body {');
  // @import con .acss → .css
  css = css.replace(/\.acss/g, '.css');
  return css;
}

module.exports = { transformAxml, acssToCSs };