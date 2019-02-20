const fs = require('fs');
const path = require('path');
const { initTest, waitForPort, waitForPortToFree } = require('../../../utils');

jest.setTimeout(20 * 1000);

const clientFilePath = path.join(
  global.scripts.testDirectory,
  'src/components/features/css-inclusion.tsx',
);

const serverFilePath = path.join(
  global.scripts.testDirectory,
  'src/server.tsx',
);

describe('hmr', () => {
  describe('client side', () => {
    it('reloads the browser on javascript changes', async () => {
      await initTest('css-inclusion');

      expect(await page.$eval('#css-inclusion', elm => elm.textContent)).toBe(
        'CSS Modules are working!',
      );

      const originalContent = fs.readFileSync(clientFilePath, 'utf-8');

      const editedContent = originalContent.replace(
        'CSS Modules are working!',
        'Overridden content!',
      );

      fs.writeFileSync(clientFilePath, editedContent);

      await page.waitForNavigation();

      expect(await page.$eval('#css-inclusion', elm => elm.textContent)).toBe(
        'Overridden content!',
      );

      fs.writeFileSync(clientFilePath, originalContent);

      await page.waitForNavigation();

      expect(await page.$eval('#css-inclusion', elm => elm.textContent)).toBe(
        'CSS Modules are working!',
      );
    });
  });

  describe('server side', () => {
    it('reloads server on changes and reloads the browser', async () => {
      await initTest('css-inclusion');

      expect(await page.title()).toBe('Some title');

      const originalContent = fs.readFileSync(serverFilePath, 'utf-8');

      const editedContent = originalContent.replace(
        'Some title',
        'Overridden title!',
      );

      fs.writeFileSync(serverFilePath, editedContent);

      await page.waitForNavigation();

      expect(await page.title()).toBe('Overridden title!');

      fs.writeFileSync(serverFilePath, originalContent);

      await page.waitForNavigation();

      expect(await page.title()).toBe('Some title');
    });

    it('shows error overlay on the browser', async () => {
      await initTest('css-inclusion');

      expect(await page.title()).toBe('Some title');

      const originalContent = fs.readFileSync(serverFilePath, 'utf-8');

      const editedContent = '<<< error';

      fs.writeFileSync(serverFilePath, editedContent);

      await page.waitForSelector('#webpack-dev-server-client-overlay');

      fs.writeFileSync(serverFilePath, originalContent);

      await page.waitForNavigation();

      expect(await page.title()).toBe('Some title');
    });

    it('restarts server if it dies', async () => {
      await initTest('css-inclusion');

      expect(await page.title()).toBe('Some title');

      const originalContent = fs.readFileSync(serverFilePath, 'utf-8');

      const editedContent = 'process.exit(1);';

      fs.writeFileSync(serverFilePath, editedContent);

      await waitForPortToFree(3000);

      fs.writeFileSync(serverFilePath, originalContent);

      await waitForPort(3000);

      await page.reload();

      expect(await page.title()).toBe('Some title');
    });
  });
});
