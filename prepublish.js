const tempy = require('tempy');
const cp = require('child_process');
const path = require('path');
const fs = require('fs');


// Global variables.
const ORG = 'extra-npm';
const STDIO = [0, 1, 2];


// Get requires from code.
function pkgRequires(txt) {
  var pkgs = [], re = /require\(\'(.*?)\'\)/g;
  for(var m=null; (m=re.exec(txt))!=null;)
    pkgs.push(m[1]);
  return pkgs;
};

// Update package information.
function pkgUpdate(pkg, o) {
  var p = pkg;
  p.name = `@${o.org}/${o.name}`;
  p.description = o.readme.replace(/\r?\n[\s\S]*/, '');
  p.main = o.main||'index.js';
  var bin = Object.keys(p.bin)[0]; p.bin = {};
  p.bin[`${bin}-${o.name}`] = p.main;
  p.scripts = {test: 'exit'};
  p.keywords.push(o.name);
  for(var d of Object.keys(p.dependencies))
    if(!o.requires.includes(d)) p.dependencies[d] = undefined;
  p.devDependencies = undefined;
  return p;
};

// Scatter a file to package.
function pkgScatter(pth, o) {
  var name = path.basename(pth);
  name = name.substring(0, name.length-path.extname(name).length);
  var pre = pth.substring(0, pth.length-path.extname(pth).length);
  var license = fs.readFileSync('LICENSE', 'utf8');
  var readme = fs.readFileSync(pre+'.md', 'utf8');
  var index = fs.readFileSync(pth, 'utf8');
  index = index.replace(`'less ${name}.md'`, `'less README.md'`);
  var main = 'index'+path.extname(pth);
  var requires = pkgRequires(index);
  var pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  pkgUpdate(pkg, Object.assign({name, license, readme, index, main, requires}, o));
  var dir = tempy.directory();
  for(var r of requires) {
    if(!/^[\.\/]/.test(r)) continue;
    var src = path.join(path.dirname(pth), r);
    var dst = path.join(dir, r);
    fs.copyFileSync(src, dst);
  }
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(pkg, null, 2));
  fs.writeFileSync(path.join(dir, 'LICENSE'), license);
  fs.writeFileSync(path.join(dir, 'README.md'), readme);
  fs.writeFileSync(path.join(dir, 'index.js'), index);
  cp.execSync('npm publish', {cwd: dir, stdio: STDIO});
  cp.execSync(`rm -rf ${dir}`, {stdio: STDIO});
};

// Run on shell.
function shell(a) {
  var o = {org: ORG};
  pkgScatter('scripts/rev-parse.js', o);
  pkgScatter('scripts/validate.js', o);
  pkgScatter('scripts/which.js', o);
};
if(require.main===module) shell(process.argv);
