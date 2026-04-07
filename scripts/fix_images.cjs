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

            // Fix the broken `<img... / width="500" height="500">`
            // Remove the previous broken tags first if they exist
            // Actually, we can just replace `/ width=` with ` width=` and move `/` to the end.
            if (content.includes('/ width="500" height="500">') || content.includes('/ height="500" width="500">')) {
                content = content.replace(/\/\s*width="500"\s*height="500">/g, 'width="500" height="500" />');
                content = content.replace(/\/\s*height="500"\s*width="500">/g, 'height="500" width="500" />');
                updated = true;
            }

            if (updated) {
                fs.writeFileSync(fullPath, content);
                console.log('Fixed syntax in ' + fullPath);
            }
        }
    }
}

processDir('components');
processDir('pages');
