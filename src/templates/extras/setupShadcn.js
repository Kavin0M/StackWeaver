const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const inquirer = require('inquirer');


const logStep = (step) => {
    console.log('\n====================');
    console.log(step);
    console.log('====================\n');
};

async function setupShadcn(packageManager, frontendPath, isTypeScript) {
    console.log('Setting up Shadcn UI');

    console.log('Installing dependencies');
    execSync(`${packageManager} install -D tailwindcss postcss autoprefixer${isTypeScript ? ' @types/node' : ''}`, { cwd: frontendPath, stdio: 'inherit' });
    execSync(`${packageManager === 'npm' ? 'npx ' : ''}tailwindcss init -p`, { cwd: frontendPath, stdio: 'inherit' });

    const createOrUpdateConfig = async (filePath, isTypeScript) => {
        const defaultConfig = {
            compilerOptions: {
                baseUrl: ".",
                paths: { "@/*": ["./src/*"] }
            }
        };

        if (await fs.pathExists(filePath)) {
            try {
                console.log('Updating Config:', filePath);
                const config = await fs.readJson(filePath);
                config.compilerOptions = config.compilerOptions || {};
                config.compilerOptions.baseUrl = ".";
                config.compilerOptions.paths = { "@/*": ["./src/*"] };
                await fs.writeJson(filePath, config, { spaces: 2 });
            } catch (error) {
                console.error('Error updating config file:', filePath, error);
                await fs.writeJson(filePath, defaultConfig, { spaces: 2 });
            }
        } else {
            console.log('Config file not found, creating:', filePath);
            await fs.writeJson(filePath, defaultConfig, { spaces: 2 });
        }
    };

    const configFiles = isTypeScript 
        ? ['tsconfig.json', 'tsconfig.app.json']
        : ['jsconfig.json', 'jsconfig.app.json'];

    await Promise.all(configFiles.map(file => createOrUpdateConfig(path.join(frontendPath, file), isTypeScript)));

    console.log(`Updating vite.config.${isTypeScript ? 'ts' : 'js'}`);
    const viteConfig = `
import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
`;
    await fs.writeFile(path.join(frontendPath, `vite.config.${isTypeScript ? 'ts' : 'js'}`), viteConfig);

    console.log('Running Shadcn UI init');

    try {
        const shadcnInitCommand = `npx shadcn-ui@latest init`;
        console.log('Executing Shadcn UI init command:', shadcnInitCommand);
        execSync(shadcnInitCommand, { cwd: frontendPath, stdio: 'inherit' });

        console.log('Shadcn UI init complete. Adding default components...');

        const componentAnswers = await inquirer.prompt([
            {
                type: 'checkbox',
                name: 'components',
                message: 'Which components would you like to add?',
                choices: [
                    'accordion', 'alert', 'alert-dialog', 'aspect-ratio', 'avatar',
                    'badge', 'button', 'calendar', 'card', 'checkbox'
                    // Add more components as needed
                ]
            }
        ]);

        const addComponentsCommand = `npx shadcn-ui@latest add ${componentAnswers.components.join(' ')} -y`;
        console.log('Executing Shadcn UI add command:', addComponentsCommand);
        execSync(addComponentsCommand, { cwd: frontendPath, stdio: 'inherit' });

        console.log('Shadcn UI setup complete!');
    } catch (error) {
        console.error('Error setting up Shadcn UI:', error);
    }
}

module.exports = { setupShadcn };