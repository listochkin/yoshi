const globby = require('globby');
const fs = require('fs-extra');

(async () => {
    const filesPaths = globby.sync(
        ['test/{e2e,server}/**/*.spec.[j|t]s', '!node_modules'],
        {
            dot: true,
            gitignore: true,
        },
    );

    await Promise.all(
        filesPaths.map(file => fs.move(file, file.replace('.spec.', '.e2e.'))),
    );

    // ------------------ JS ------------------------
    if (await fs.pathExists('test/setup.e2e.js')) {
        await fs.move('test/setup.e2e.js', 'test/e2e-setup.js');
    }

    if (await fs.pathExists('test/setup.component.js')) {
        await fs.move('test/setup.component.js', 'test/spec-setup.js');
    }

    // ------------------ TS ------------------------
    if (await fs.pathExists('test/setup.e2e.ts')) {
        await fs.move('test/setup.e2e.ts', 'test/e2e-setup.ts');
    }

    if (await fs.pathExists('test/setup.component.ts')) {
        await fs.move('test/setup.component.ts', 'test/spec-setup.ts');
    }

    //---------------------------------------------------  

    if (await fs.pathExists('test/setup.server.js') || await fs.pathExists('test/setup.server.ts')) {
        console.log('------------------------------------');
        console.log(
            'You have a "test/setup.server.js" in your project. Please remove it and move its content to "__tests/e2e-setup.[j|t]s"',
        );
        console.log('------------------------------------');
    }

    await fs.move('test', '__tests__');
})();
