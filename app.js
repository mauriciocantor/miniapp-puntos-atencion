let appJs = '';
const appJsPath = path.join(projectRoot, 'app.js');
if (await fs.pathExists(appJsPath)) {
  let src = await fs.readFile(appJsPath, 'utf8');
  src = await resolveRequires(src, path.dirname(appJsPath), projectRoot);
  appJs = transformJs(src, 'app');
  console.log('✅ app.js compilado');
}