const fs = require('fs');
const path = require('path');

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.jsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let updated = false;

            // Simple regex to add width and height to img tags if missing
            content = content.replace(/<img(.*?)>/g, (match, attrs) => {
                let newAttrs = attrs;
                if (!/width=/.test(attrs)) {
                    newAttrs += ' width="500"';
                    updated = true;
                }
                if (!/height=/.test(attrs)) {
                    newAttrs += ' height="500"';
                    updated = true;
                }
                return `<img${newAttrs}>`;
            });

            if (updated) {
                fs.writeFileSync(fullPath, content);
                console.log('Updated images in ' + fullPath);
            }
        }
    }
}

processDir('components');
processDir('pages');
